# Candidate Experience — TA Transportes Brasil

Dashboard client-side para análise de KPIs de experiência do candidato e do hiring manager. Processa PDFs exportados do Qualtrics e gera automaticamente KPIs, dimensões, detratores e insights (Highs / Lows / Actions) sem nenhum backend próprio.

---

## Stack

| Categoria | Tecnologia |
|-----------|-----------|
| Framework | React 18.3 + TypeScript 5.6 |
| Build | Vite 6 |
| Testes | Vitest 2 |
| PDF parsing | pdfjs-dist 3.11 |
| Persistência de links | Supabase (PostgreSQL via `@supabase/supabase-js` 2.49) |
| Deploy | Vercel |

---

## Estrutura de pastas

```
src/
├── App.tsx                  # raiz: orquestra state + layout
├── main.tsx                 # entry point React
├── main.css                 # estilos globais
│
├── types/
│   └── index.ts             # todas as interfaces e tipos TypeScript
│
├── lib/
│   ├── constants.ts         # TAB_IDS, TAB_META
│   ├── merger.ts            # buildMergedView() — agrega N PDFs em um MergedView
│   ├── insights.ts          # buildHighs/Lows/Actions + temas e mapeamentos
│   ├── parser-qualtrics.ts  # parseQualtricsReport() — parser de PDF Qualtrics
│   ├── parser-hm.ts         # parseHmReport() — parser de PDF Hiring Manager
│   ├── pdf-extractor.ts     # extractPdfText() via pdfjs-dist
│   ├── share.ts             # cliente Supabase, save/load de links
│   └── utils.ts             # helpers (escapeHtml, etc.)
│
├── hooks/
│   ├── useTabs.ts           # useReducer para estado das tabs
│   ├── useUpload.ts         # input de arquivo + pipeline de parse
│   ├── useShare.ts          # geração e restauração de links
│   └── useToast.ts          # fila de notificações
│
└── components/
    ├── BrandHeader/         # header com logo e título
    ├── TabBar/              # botões de navegação entre tabs
    ├── TabPanel/            # container de cada tab (DataPanel ou SkeletonPanel)
    ├── DataPanel/           # painel com dados: KPIs, dimensões, insights
    ├── SkeletonPanel/       # estado vazio com instruções de upload
    ├── PdfPill/             # badge do PDF carregado com botão de remoção
    ├── StatusBar/           # mensagens loading / success / error
    └── Toast/               # notificações temporárias

tests/
├── parser-hm.test.ts
└── parser-qualtrics.test.ts
```

---

## Tabs

O app tem 6 tabs definidas em `src/lib/constants.ts`:

| ID | Label | Seção | Cor |
|----|-------|-------|-----|
| `external` | External Candidate | External Candidate Experience | black |
| `internal` | Internal Candidate | Internal Candidate Experience | gray |
| `hm` | Hiring Manager | Hiring Manager Experience | gray |
| `tonh` | TO NH | Turn Over New Hire | gray |
| `pcd` | PCD | PCD | gray |
| `hpc` | HP Completion | Hiring Plan Completion | gray |

### Comportamento por tab

- **`external`** — tab padrão (ativa ao abrir). Aceita PDFs do Qualtrics. Mostra detratores. `periodLabel` derivado do filtro `Fecha inicio encuesta` do PDF; fallback = ano corrente.
- **`internal`** — mesmo comportamento do `external`, destinado a candidatos internos. Não mostra instruções no estado vazio.
- **`hm`** — aceita PDFs do relatório de Hiring Manager (espanhol). **Oculta a seção de detratores.** `periodLabel` vem do `periodLabel` já parseado no PDF (não usa `deriveTabPeriod`). Usa temas de Highs/Lows/Actions específicos para HM (em espanhol).
- **`tonh`, `pcd`, `hpc`** — tabs de outros KPIs (Turn Over, PCD, Hiring Plan). No estado vazio, ocultam instruções e grid de KPIs.

---

## Tipos principais (`src/types/index.ts`)

```typescript
type TabId = 'external' | 'internal' | 'hm' | 'tonh' | 'pcd' | 'hpc'

interface PdfData {
  respostas:   number | null          // total de respostas
  fav:         string                 // favorabilidade (ex: "72%")
  desfav:      string                 // desfavorabilidade (ex: "8%")
  dimensions:  Dimension[]            // dimensões com fav/desfav
  comments:    Comment[]              // comentários individuais
  filters:     Record<string, string> // metadados extraídos do PDF
  overallRange:string                 // "ALL" | "1-2" | "3" | "4-5"
  periodLabel: string                 // rótulo de período exibido
  isHm:        boolean                // é relatório HM?
  fileName:    string                 // nome do arquivo
}

interface Dimension { name: string; fav: string; desfav: string }
interface Comment   { score: number; division: string; name: string; text: string }

interface MergedView {
  periodLabel:       string
  kpis:              Kpis
  dimensions:        Dimension[]
  worstDimensionName:string | null
  detractorHtml:     string
  highs:             string[]
  lows:              string[]
  actions:           string[]
}
```

---

## Fluxo de dados

```
Upload de PDF(s)
      │
      ▼
extractPdfText()          ← pdfjs-dist extrai fullText + pageTexts + positionalText
      │
      ▼
isHmReport(fullText)?
  ├── sim → parseHmReport(positionalFullText, positionalPages)
  └── não → parseQualtricsReport(fullText, pageTexts)
      │
      ▼
PdfData  ──── dispatch ADD_PDF ───► TabsState (useReducer)
                                         │
                                         ▼
                                  buildMergedView(pdfs, tabId)   ← merger.ts
                                         │
                                         ▼
                                    MergedView
                                         │
                                         ▼
                                    DataPanel (React)
```

---

## Lógica de merge (`src/lib/merger.ts`)

Quando múltiplos PDFs são carregados na mesma tab (ex: geral + filtrado por nota), `buildMergedView` resolve:

1. **PDF primário** — prefere o que tem `overallRange === 'ALL'`; se não existir, usa o com mais respostas.
2. **KPIs de favorabilidade** — vem do primário (ALL). Se ausente, busca por range específico (`4-5` para fav, `1-2` para desfav).
3. **Neutros** — calculado como `100 - fav - desfav`; se não possível, usa proporção dos comentários nota 3.
4. **Comentários** — agrega todos os PDFs e deduplica por chave `score|nome|texto[:80]`.
5. **Dimensões** — do PDF primário; fallback para qualquer PDF com dimensões.
6. **`periodLabel`** — para tabs não-HM: função `deriveTabPeriod(filters, tabId)`:
   - Lê `filters['Fecha inicio encuesta']` e traduz ES→PT
   - Fallback: ano corrente (`String(new Date().getFullYear())`)
7. **Highs/Lows/Actions** — usa temas HM ou Qualtrics conforme `isHm`.

---

## Engine de insights (`src/lib/insights.ts`)

### Highs (External Candidate)
Analisa comentários nota ≥ 4 contra 5 temas com regex:

| Tema | Sinal detectado |
|------|----------------|
| Feedback personalizado | feedback + adjetivo qualificador |
| Humanização e empatia | empatia, acolhimento, cuidado |
| Clareza e transparência | clareza/transparência + etapa/processo |
| Processo bem estruturado | bem estruturado, organizado, maestria |
| Flexibilidade no agendamento | flexibilidade, disponibilidade, agendamento |

Também detecta **TAs citados por nome** em comentários positivos (lista de 22 nomes hardcoded em `TA_NAMES`).

### Lows (External Candidate)
Analisa comentários nota ≤ 3 contra 7 temas:

| Tema | Sinal detectado |
|------|----------------|
| Demora entre etapas | demora, retorno lento, 2+ semanas |
| Gestores despreparados | gestor + desatenção/atraso |
| Salário/turno pouco claros | salário/benefícios + omitido/só depois |
| Cancelamentos sem explicação | vaga cancelada, bloqueio interno |
| Critérios eliminatórios ocultos | requisito/critério + não informado |
| Falta de posicionamento | sem feedback, não retornou |
| Entrevista sobrecarregada | 3 gestores, pouco tempo |

### Actions
Mapeamento direto Low → Action: para cada Low detectado, há uma ação específica pré-definida.

### Highs/Lows/Actions HM
Conjunto separado de temas em espanhol (7 temas de highs, 6 de lows), voltado para feedback de gestores sobre o processo de recrutamento.

---

## Estado de tabs (`src/hooks/useTabs.ts`)

```typescript
type TabsState = Record<TabId, { pdfs: PdfData[] }>

// Actions:
ADD_PDF    → adiciona um PdfData à tab
REMOVE_PDF → remove por índice
RESET_TAB  → limpa todos os PDFs da tab
HYDRATE    → substitui o estado completo (usado ao abrir link compartilhado)
```

Tab ativa padrão: `'external'`.

---

## Compartilhamento de links (`src/lib/share.ts` + `src/hooks/useShare.ts`)

1. **Salvar**: `buildSharePayload` serializa o `TabsState` (apenas tabs com PDFs) → `saveShare` insere no Supabase tabela `shares` com um ID de 8 chars alfanuméricos → URL `?s={id}` copiada para a área de transferência.
2. **Restaurar**: ao montar o app, se `?s=` estiver na URL, `loadShare` busca o payload no Supabase e dispara `HYDRATE` para restaurar o estado completo.
3. **Sem Supabase**: se `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON` não estiverem configurados, o cliente é `null` e compartilhamento exibe toast de erro.

---

## Parsers

### Qualtrics (`src/lib/parser-qualtrics.ts`)
- Detectado quando **não** é HM.
- Extrai por regex do texto do PDF: `respostas`, `fav`, `desfav`, dimensões, comentários individuais (score, divisão, nome, texto), filtros de metadata (`Evaluación overall`, `Fecha inicio encuesta`, etc.).
- `overallRange` inferido do filtro "Evaluación overall" extraído.

### Hiring Manager (`src/lib/parser-hm.ts`)
- Detectado por `isHmReport()` — busca padrões característicos do relatório HM em espanhol.
- Usa `positionalFullText` (texto com coordenadas posicionais) para maior precisão na extração.
- `periodLabel` extraído diretamente do PDF (campo de período).
- `isHm: true` ativado.

---

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | Não | URL do projeto Supabase |
| `VITE_SUPABASE_ANON` | Não | Chave anon do Supabase |

Sem essas variáveis o app funciona normalmente, apenas sem a funcionalidade de compartilhamento.

---

## Scripts

```bash
npm run dev        # servidor de desenvolvimento (Vite)
npm run build      # build de produção (tsc + vite build)
npm run preview    # preview do build
npm run typecheck  # verifica tipos sem compilar
npm run test       # testes com Vitest
```

---

## Lógica de período (External Candidate)

O `periodLabel` exibido como "Período: **X**" é derivado assim:

| Condição | Resultado |
|----------|-----------|
| Filtro `Fecha inicio encuesta = "Este año"` | Ano corrente (ex: "2026") |
| Filtro `= "El año pasado"` | "Ano passado" |
| Filtro `= "Este mes"` | "Mês atual" |
| Filtro `= "Últimos 7 días"` | "Últimos 7 dias" |
| Filtro `= "Últimos 30 días"` | "Últimos 30 dias" |
| Filtro `= "Últimas 4 semanas"` | "Últimas 4 semanas" |
| Sem filtro / não reconhecido | Ano corrente (fallback YTD) |

Para tabs HM, o `periodLabel` já vem parseado diretamente do PDF.

---

## Regras de negócio relevantes

- **Múltiplos PDFs por tab** — usuário pode subir até N PDFs (geral + por faixa de nota). O merge garante que KPIs vêm do PDF "ALL" e comentários são agregados sem duplicatas.
- **Tab HM não mostra detratores** — seção "Detratores (notas 1–2)" é ocultada quando `tabId === 'hm'`.
- **Tabs `pcd` e `hpc`** — ocultam o grid de KPIs no estado vazio.
- **Tabs `internal`, `hm`, `tonh`, `pcd`, `hpc`** — ocultam as instruções de upload no estado vazio.
- **Deduplicação de comentários** — chave composta `score|nome|texto[:80]` evita duplicatas ao combinar PDFs.
- **Pior dimensão** — dimensão com maior % de desfavorabilidade é destacada na tabela com `⚠` e negrito.
