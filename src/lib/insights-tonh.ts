import type { TonhCase, TonhLayerDashboard } from '../types';

export interface TonhInsights {
  highs: string[];
  lows: string[];
  actions: string[];
}

type ExitCategory =
  | 'Compliance'
  | 'Proposta com Maior Remuneração'
  | 'Temas Familiares/Pessoais'
  | 'Adaptação a Rotina/Liderança';

function classifyExitMotivo(motivoSalida: string, principaisMotivos: string): ExitCategory {
  const t = `${motivoSalida} ${principaisMotivos}`.toLowerCase();
  if (/\bcompliance\b|justa\s+causa|código\s+de\s+conduta|assédio|comportamento.*inadequad|brincadeira.*sexual|ameaça.*colega/i.test(t))
    return 'Compliance';
  if (/(proposta|oferta|oportunidade|remoto|remote).{0,40}(salar|remuner|cargo|emprego|trabalho|remoto|remote)|(salário|remuneração).{0,30}(maior|superior|melhor|mais\s+atrat|acima)|trainee|aumento\s+salarial|100%\s*remoto/i.test(t))
    return 'Proposta com Maior Remuneração';
  if (/motivo\s+pessoal|questão\s+pessoal|problema\s+pessoal|saúde|doença|cirurgia|família|familiar|esposa|marido|filho[sa]?\b|mãe\b|\bpai\b|\bpais\b|mudança\s+de\s+cidad|morar\s+(próximo|perto)/i.test(t))
    return 'Temas Familiares/Pessoais';
  return 'Adaptação a Rotina/Liderança';
}

function isVoluntary(motivoSalida: string): boolean {
  return /pedido\s+de\s+demiss[aã]o|solicita[çc][aã]o\s+de\s+desligamento|rescis[aã]o\s+contrato\s+p\/iniciativa|antecipa[çc][aã]o\s+t[eé]rm\s+contr\s+empregado|\bvolunt[aá]ri[ao]\b|\brenuncia\b/i.test(motivoSalida);
}

function isInvoluntary(motivoSalida: string): boolean {
  return /rescis[aã]o\s+sem\s+justa\s+causa|involunt[aá]ri[ao]|antecipa[çc][aã]o\s+t[eé]rm\s+contr\s+empresa|performance|produtividade|compliance|despido/i.test(motivoSalida);
}

function hasRealFlag(flags: string): boolean {
  const f = flags.trim().toLowerCase();
  if (f.length < 8) return false;
  if (['detallar', 'n/a', 'na', '-'].includes(f)) return false;
  if (/acuerdos?\s+y\s+next|next\s+steps?|conclusi[oó]n|template|facilitaci[oó]n/i.test(f)) return false;
  return true;
}

const n1 = (n: number, s: string, p: string) => n === 1 ? s : p;
const pct = (n: number, t: number) => Math.round((n / t) * 100);

export function buildTonhInsights(
  cases: TonhCase[],
  tlDashboard?: TonhLayerDashboard,
  outrosDashboard?: TonhLayerDashboard,
): TonhInsights {
  const highs: string[] = [];
  const lows: string[] = [];
  const actions: string[] = [];

  // ── Dashboard (metas fixas 2026: 12% TL/TL Sr · 5% demais) ──────────────

  const METAS: Record<string, number> = { 'team-leader': 12, 'outros': 5 };

  for (const dash of [tlDashboard, outrosDashboard]) {
    if (!dash) continue;
    const label = dash.layerGroup === 'team-leader' ? 'Team Leader / TL Sr' : 'Demais layers';
    const meta  = METAS[dash.layerGroup] ?? dash.meta;
    const { toOverallYtdPct: ytd, toOverall12mPct: m12 } = dash;

    if (ytd !== null) {
      if (ytd <= meta) {
        highs.push(`TO YTD de <strong>${label}</strong> em ${ytd}% — dentro da meta de ${meta}%`);
      } else {
        lows.push(`TO YTD de <strong>${label}</strong> em ${ytd}%, acima da meta de ${meta}%`);
        actions.push(`Acionar BP e liderança para revisão imediata dos casos em aberto — TO de ${label} em ${ytd}% vs meta ${meta}%`);
      }
    }
    if (m12 !== null) {
      if (m12 <= meta) {
        highs.push(`TO 12 meses de <strong>${label}</strong> em ${m12}% — dentro da meta de ${meta}%`);
      } else {
        lows.push(`TO acumulado 12 meses de <strong>${label}</strong>: ${m12}% (meta ${meta}%)`);
      }
    }
    if (dash.porSeniority.length > 0) {
      const top = [...dash.porSeniority].sort((a, b) => b.pct - a.pct)[0];
      lows.push(`Seniority com maior TO em ${label}: <strong>${top.seniority}</strong> (${top.pct}%)`);
    }
  }

  if (cases.length === 0) return { highs, lows, actions };

  const total = cases.length;

  // ── Voluntário vs Involuntário ────────────────────────────────────────────

  const voluntary   = cases.filter(c => isVoluntary(c.motivoSalida));
  const involuntary = cases.filter(c => isInvoluntary(c.motivoSalida));

  if (voluntary.length > 0 && involuntary.length > 0) {
    const vPct = pct(voluntary.length, total);
    const iPct = pct(involuntary.length, total);
    lows.push(
      `<strong>${vPct}% pedidos de demissão</strong> (${voluntary.length} ${n1(voluntary.length, 'caso', 'casos')}) e <strong>${iPct}% desligamentos por iniciativa da empresa</strong> (${involuntary.length} ${n1(involuntary.length, 'caso', 'casos')}) — perfil misto indica gaps tanto na seleção quanto no fit pós-admissão`
    );
  } else if (voluntary.length === total) {
    lows.push(
      `<strong>${pct(voluntary.length, total)}% das saídas foram pedidos de demissão</strong> — candidatos optaram por sair, indicando gap de atração ou de alinhamento de expectativas na contratação`
    );
  } else if (involuntary.length === total) {
    lows.push(
      `<strong>${pct(involuntary.length, total)}% das saídas foram desligamentos por iniciativa da empresa</strong> — perfis não corresponderam ao esperado após admissão, apontando para gap no processo de seleção`
    );
  }

  // ── Motivo macro ──────────────────────────────────────────────────────────

  const catMap: Partial<Record<ExitCategory, number>> = {};
  for (const c of cases) {
    const cat = classifyExitMotivo(c.motivoSalida, c.principaisMotivos);
    catMap[cat] = (catMap[cat] ?? 0) + 1;
  }

  const adaptacao  = catMap['Adaptação a Rotina/Liderança'] ?? 0;
  const proposta   = catMap['Proposta com Maior Remuneração'] ?? 0;
  const pessoal    = catMap['Temas Familiares/Pessoais'] ?? 0;
  const compliance = catMap['Compliance'] ?? 0;

  if (compliance > 0) {
    lows.push(
      `<strong>${n1(compliance, '1 desligamento', `${compliance} desligamentos`)} por Compliance</strong> — desvio comportamental não bloqueado no processo de contratação`
    );
    actions.push(
      `Tornar obrigatória a checagem de referências comportamentais em processos de liderança — desvio de conduta identificado somente após admissão indica lacuna na avaliação do painel`
    );
  }

  if (adaptacao > 0) {
    const p = pct(adaptacao, total);
    const adaptVol = cases.filter(c =>
      classifyExitMotivo(c.motivoSalida, c.principaisMotivos) === 'Adaptação a Rotina/Liderança' && isVoluntary(c.motivoSalida)
    ).length;
    const adaptInv = adaptacao - adaptVol;
    const detalhe = adaptVol > 0 && adaptInv > 0
      ? ` (${adaptVol} ${n1(adaptVol, 'pedido de demissão', 'pedidos de demissão')}, ${adaptInv} ${n1(adaptInv, 'desligamento pela empresa', 'desligamentos pela empresa')})`
      : adaptVol === adaptacao
        ? ` — ${n1(adaptVol, 'pedido de demissão', 'pedidos de demissão')}`
        : ` — ${n1(adaptInv, 'desligamento pela empresa', 'desligamentos pela empresa')}`;
    lows.push(
      `<strong>${p}% das saídas por adaptação</strong> à rotina ou liderança${detalhe} — fit cultural e de ritmo não validado antes da admissão`
    );
    actions.push(
      `Explorar na entrevista presencial situações reais de pressão e ritmo vivenciadas pelo candidato — priorizar exemplos concretos de adaptação a mudanças de rotina e liderança exigente`
    );
  }

  if (proposta > 0) {
    const p = pct(proposta, total);
    lows.push(
      `<strong>${p}% das saídas por pedido de demissão</strong> motivado por proposta mais atrativa (${proposta} ${n1(proposta, 'caso', 'casos')}) — competitividade salarial ou de escopo não sustentou a retenção no período de acompanhamento`
    );
    actions.push(
      `Validar histórico salarial dos últimos empregos antes da emissão da oferta — candidatos com histórico acima da faixa da vaga são potencial para TO NH por contra-proposta`
    );
  }

  if (pessoal > 0) {
    const p = pct(pessoal, total);
    if (p >= 40) {
      highs.push(`${p}% das saídas por motivos pessoais ou familiares — fora do controle direto da organização`);
    } else {
      lows.push(
        `<strong>${pessoal} ${n1(pessoal, 'saída', 'saídas')} por temas pessoais ou familiares</strong> — contexto de vida e mobilidade geográfica não mapeados suficientemente na contratação`
      );
    }
    actions.push(
      `Incluir perguntas sobre contexto familiar, moradia e mobilidade nos primeiros contatos do processo seletivo — reduz risco de saída por fatores pessoais imprevistos`
    );
  }

  // ── Tempo médio no cargo ──────────────────────────────────────────────────

  const casesWithTime = cases.filter(c => c.tiempoEnRolMeses !== null);
  if (casesWithTime.length > 0) {
    const avg = Math.round(
      casesWithTime.reduce((s, c) => s + (c.tiempoEnRolMeses ?? 0), 0) / casesWithTime.length,
    );
    if (avg <= 3) {
      lows.push(
        `Saídas ocorrem em média com <strong>${avg} ${n1(avg, 'mês', 'meses')}</strong> no cargo — anteriores ao fim do período de acompanhamento, o que aponta para gap na seleção`
      );
      actions.push(
        `Antecipar a discussão de expectativas para a primeira semana do colaborador — não esperar o ciclo mensal de acompanhamento para identificar sinais de inadaptação`
      );
    } else if (avg <= 6) {
      lows.push(
        `Saídas concentradas em média nos primeiros <strong>${avg} meses</strong> — dentro do período de acompanhamento, desalinhamento identificado tardiamente`
      );
    }
  }

  // ── Yellow / Red Flags ────────────────────────────────────────────────────

  const withFlags = cases.filter(c => hasRealFlag(c.flags));
  if (withFlags.length > 0) {
    const flagPct = pct(withFlags.length, total);
    lows.push(
      `<strong>${withFlags.length} de ${total} contratações</strong> (${flagPct}%) tinham flags identificadas e aceitas — em todos os casos, o risco sinalizou-se como fator de saída`
    );

    const flagTurno      = withFlags.filter(c => /turno|noturno|hor[aá]rio|escala|madrugada/i.test(c.flags));
    const flagSalarial   = withFlags.filter(c => /salar|remunera|hist[oó]rico\s+salarial|expectativa/i.test(c.flags));
    const flagLideranca  = withFlags.filter(c => /lideran[çc]|gest[aã]o|equipe|sem\s+experi[eê]ncia/i.test(c.flags));
    const flagMobilidade = withFlags.filter(c => /mobilidade|dist[aâ]ncia|cidad|mudan[çc]a|deslocamento|regi[aã]o/i.test(c.flags));
    const flagComport    = withFlags.filter(c => /comporta|postura|conduta|cultural/i.test(c.flags));

    if (flagTurno.length > 0)
      lows.push(`Flag de <strong>turno/horário</strong> em ${flagTurno.length} ${n1(flagTurno.length, 'caso', 'casos')} — risco de adaptação à escala aceito e confirmado como motivo de saída`);
    if (flagSalarial.length > 0)
      lows.push(`Flag de <strong>histórico salarial</strong> em ${flagSalarial.length} ${n1(flagSalarial.length, 'caso', 'casos')} — ${n1(flagSalarial.length, 'candidato admitido', 'candidatos admitidos')} com histórico ou expectativa acima da faixa da vaga`);
    if (flagLideranca.length > 0)
      lows.push(`Flag de <strong>experiência em liderança</strong> em ${flagLideranca.length} ${n1(flagLideranca.length, 'caso', 'casos')} — perfil sem vivência compatível com a responsabilidade do cargo`);
    if (flagMobilidade.length > 0)
      lows.push(`Flag de <strong>mobilidade/localidade</strong> em ${flagMobilidade.length} ${n1(flagMobilidade.length, 'caso', 'casos')} — risco geográfico aceito na contratação e confirmado como fator de saída`);
    if (flagComport.length > 0)
      lows.push(`Flag <strong>comportamental/cultural</strong> em ${flagComport.length} ${n1(flagComport.length, 'caso', 'casos')} — sinais de desalinhamento já presentes no processo seletivo`);

    actions.push(
      `Calibrar com o painel os critérios de aceite de flags — quando o risco confirmou-se em 100% dos casos analisados, a flag deve ser tratada como critério bloqueante`
    );
  }

  // ── Highs: lições aprendidas das exit discussions ─────────────────────────

  // Zero compliance
  if (compliance === 0 && total >= 3) {
    highs.push(`Nenhum caso de Compliance no período — ausência de desvios comportamentais graves nas contratações analisadas`);
  }

  // Saídas pessoais/familiares majoritárias (já adicionado acima se ≥40%)

  // Padrão claro e acionável
  const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
  if (topCat && pct(topCat[1], total) >= 50) {
    highs.push(
      `Padrão de saída concentrado: <strong>${pct(topCat[1], total)}% dos casos classificados como ${topCat[0]}</strong> — causa identificada com clareza suficiente para ajuste pontual no processo de seleção`
    );
  }

  // Acuerdos documentados = lições registradas para a reposição
  const withAcuerdos = cases.filter(c => c.acuerdos.trim().length > 30);
  if (withAcuerdos.length === total) {
    highs.push(`<strong>100% dos casos</strong> com acuerdos e next steps documentados — aprendizados registrados e disponíveis para calibrar o painel na reposição`);
  } else if (withAcuerdos.length >= Math.ceil(total / 2)) {
    highs.push(`<strong>${withAcuerdos.length} de ${total} casos</strong> com next steps documentados — base de aprendizado disponível para a reposição`);
  }

  // Flags identificadas proativamente pelo painel
  if (withFlags.length > 0 && withFlags.length < total) {
    highs.push(
      `Painel identificou proativamente flags em ${withFlags.length} de ${total} contratações — sinalização de risco registrada, serve de referência para calibrar critérios na reposição`
    );
  }

  return { highs, lows, actions };
}
