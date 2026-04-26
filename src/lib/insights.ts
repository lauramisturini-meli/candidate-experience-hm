import { escapeHtml } from './utils';
import type { Comment } from '../types';

interface Theme {
  key: string;
  pattern: RegExp;
  bullet: string;
  desc: string;
}

interface ActionEntry {
  key: string;
  action: string;
}

const HIGH_THEMES: Theme[] = [
  {
    key: 'feedback',
    pattern: /feedback[\s\S]{0,80}(personalizado|detalhado|construtivo|excelente|sincero|transparente|genuin|honesto|útil|util|claro|incr[íi]vel)/i,
    bullet: 'Feedback personalizado',
    desc:    'diferencial raro no mercado, valorizado mesmo em reprovações',
  },
  {
    key: 'empatia',
    pattern: /(empatia|humana|humano|humanidade|acolhedor|acolhimento|cuidado|respeito|atenciosa|atencioso)/i,
    bullet: 'Humanização e empatia dos TAs',
    desc:    'conduta acolhedora reconhecida como diferencial',
  },
  {
    key: 'clareza',
    pattern: /(clareza|claro|claras|transparente|transparência)[\s\S]{0,40}(etapa|processo|comunica)/i,
    bullet: 'Clareza e transparência nas etapas',
    desc:    'comunicação objetiva e respeitosa destacada pelos candidatos',
  },
  {
    key: 'estrutura',
    pattern: /(bem estruturado|estruturado|organizado|organização|bem conduzido|condução impec[áa]vel|processo bem|maestria)/i,
    bullet: 'Processo bem estruturado e conduzido',
    desc:    'fluxo claro e profissionalismo destacados',
  },
  {
    key: 'flexibilidade',
    pattern: /(flexibilidade|disponibilidade|agendamento|adaptar.{0,20}hor[áa]rio|disponib)/i,
    bullet: 'Flexibilidade no agendamento',
    desc:    'disponibilidade para ajustar horários valorizada',
  },
];

export const HM_HIGH_THEMES: Theme[] = [
  {
    key: 'alinhamento',
    pattern: /(alineaci[óo]n|alineado|alineados|perfil.{0,40}(adecuad|correct|alineado)|entendimiento.{0,20}perfil)/i,
    bullet: 'Alinhamento de perfil',
    desc:    'TA compreende e entrega perfis coerentes com a vaga',
  },
  {
    key: 'comunicacao',
    pattern: /(comunicaci[óo]n|informad|transparen|claridad|clar[ao]s?)/i,
    bullet: 'Comunicação clara e transparente',
    desc:    'TA mantém o gestor informado ao longo do processo',
  },
  {
    key: 'agilidade',
    pattern: /(r[áa]pid|[áa]gil|agilidad|tiempo.{0,20}(respuesta|entrega)|pronto)/i,
    bullet: 'Agilidade no processo',
    desc:    'tempo de resposta e entrega reconhecidos pelos gestores',
  },
  {
    key: 'parceria',
    pattern: /(proactiv|proactividad|asociaci[óo]n|socio|partner|acompañamiento|acompan[ñn]amiento|apoy[oa]|soporte)/i,
    bullet: 'Parceria e proatividade do TA',
    desc:    'atuação como parceiro estratégico do gestor',
  },
  {
    key: 'qualidade',
    pattern: /(calidad.{0,30}(candidat|perfiles|talento)|buenos candidatos|candidatos.{0,20}calificad|talento.{0,20}adecuad)/i,
    bullet: 'Qualidade dos candidatos apresentados',
    desc:    'perfis relevantes e com nível técnico adequado',
  },
  {
    key: 'processo',
    pattern: /(proceso.{0,20}(estructurad|organizad|claro|bien)|bien.{0,10}(llevad|conducid|estructurad))/i,
    bullet: 'Processo bem estruturado',
    desc:    'fluxo organizado e conduzido com profissionalismo',
  },
];

export const HM_LOW_THEMES: Theme[] = [
  {
    key: 'Volume',
    pattern: /(pocos.{0,20}(candidatos|perfiles)|cantidad.{0,20}(baja|insuficiente)|poca.{0,20}cantidad|volumen.{0,20}(bajo|limitado)|m[áa]s.{0,10}candidatos|mayor.{0,10}(cantidad|volumen))/i,
    bullet: 'Volume baixo de candidatos',
    desc:    'gestores pedem maior número de perfis para avaliar',
  },
  {
    key: 'Perfil',
    pattern: /(perfil.{0,30}(no.{0,10}(alineado|adecuado|coincide)|desalineado|no cumple)|no.{0,10}coinciden.{0,10}perfil|candidatos.{0,30}no.{0,10}(alineados|adecuados))/i,
    bullet: 'Desalinhamento de perfil',
    desc:    'candidatos apresentados não atendem plenamente à vaga',
  },
  {
    key: 'Demora',
    pattern: /(lent|demora|tard|tiempo.{0,30}(largo|prolongad|excesiv)|much[oa].{0,10}tiempo|proceso.{0,20}largo)/i,
    bullet: 'Demora no processo',
    desc:    'tempo entre etapas percebido como longo',
  },
  {
    key: 'Comunicação',
    pattern: /(falta.{0,15}(comunicaci[óo]n|informaci[óo]n|visibilidad|feedback)|poca.{0,15}(visibilidad|comunicaci[óo]n|informaci[óo]n)|sin.{0,15}(respuesta|feedback)|no.{0,20}(informad|actualiza))/i,
    bullet: 'Visibilidade insuficiente do andamento',
    desc:    'gestor sem atualizações regulares sobre o status do processo',
  },
  {
    key: 'Mercado',
    pattern: /(mercado.{0,30}(limitad|escaso|restrict|dif[íi]cil)|escas[ae]z|talento.{0,20}escaso|dif[íi]cil.{0,20}encontrar)/i,
    bullet: 'Escassez de talentos no mercado',
    desc:    'limitação externa reconhecida pelos gestores',
  },
  {
    key: 'Feedback',
    pattern: /(m[áa]s.{0,10}feedback|feedback.{0,20}(detallad|construct|específic|continuo)|retorno.{0,20}(detalhad|frequente))/i,
    bullet: 'Feedback de candidatos mais detalhado',
    desc:    'gestores desejam devolutivas mais ricas sobre os avaliados',
  },
];

export const HM_ACTION_MAP: ActionEntry[] = [
  { key: 'Volume',      action: '<strong>Ampliar funil de captação</strong> — revisar canais de sourcing com o gestor e alinhar critérios flexíveis para aumentar volume qualificado' },
  { key: 'Perfil',      action: '<strong>Reforçar briefing de perfil</strong> — reunião de alinhamento mais profunda no kick-off (must-have x nice-to-have) antes de iniciar a busca' },
  { key: 'Demora',      action: '<strong>Acordar SLA por etapa</strong> com o gestor e comunicar desvios proativamente' },
  { key: 'Comunicação', action: '<strong>Check-ins semanais com o gestor</strong> — status report curto (novos candidatos, etapa, próximos passos)' },
  { key: 'Mercado',     action: '<strong>Mapear cenário de mercado</strong> — compartilhar com o gestor benchmark salarial e disponibilidade de perfis antes de abrir a vaga' },
  { key: 'Feedback',    action: '<strong>Padronizar devolutiva pós-entrevista</strong> — template com pontos fortes, gaps e recomendação objetiva' },
];

const TA_NAMES = [
  'Beatriz', 'Bia', 'Maria Beatriz', 'Carolina', 'Carol', 'Carolina Zanotti',
  'Cardoso', 'Laura', 'Laura Luize', 'Thais', 'Thaís', 'Thais Andrade', 'Thais Carvalho',
  'Aline', 'Marianne', 'Katia', 'Kátia', 'Kitty', 'Bruna', 'Bruna Santos',
  'Letícia Navarro', 'Leticia Navarro', 'Juliana',
];

const LOW_THEMES: Theme[] = [
  {
    key: 'demora',
    pattern: /(demora|demorado|demorada|tempo.{0,25}(longo|processo)|muito.{0,15}tempo|semana.{0,20}(sem|espera)|retorno.{0,15}(lento|demorado)|2\+?\s*semanas|aguardo|aguardando)/i,
    bullet: 'Demora entre etapas',
    desc:    'devolutivas lentas / sem posicionamento citadas repetidamente',
  },
  {
    key: 'gestor',
    pattern: /(gestor|gestora|supervisor|superior).{0,60}(atraso|atrasou|despreparad|desatent|sem preparo|olhando|perdid|imatur|n[aã]o prest)/i,
    bullet: 'Gestores despreparados na entrevista',
    desc:    'desatenção, atrasos ou perguntas desalinhadas à vaga',
  },
  {
    key: 'salario',
    pattern: /(sal[áa]rio|benef[íi]cios|turno|remunera).{0,80}(vago|n[aã]o.{0,10}inform|omitid|final|descobrir|só.{0,15}depois|desde o in[íi]cio)/i,
    bullet: 'Salário, turno e benefícios pouco claros',
    desc:    'candidatos chegam à etapa final sem essas informações',
  },
  {
    key: 'cancelamento',
    pattern: /(cancelamento.{0,30}vaga|vaga.{0,30}cancelad|republicaram a vaga|bloqueio interno|desclassificado|eliminad.{0,30}sem|reprovad.{0,30}sem)/i,
    bullet: 'Cancelamentos e bloqueios internos sem explicação',
    desc:    'candidatos eliminados/bloqueados sem clareza de motivo',
  },
  {
    key: 'criterios',
    pattern: /(perfil operacional|requisito.{0,30}n[aã]o|formação.{0,30}espec[íi]fica|crit[ée]rio.{0,30}(eliminat|n[aã]o|oculto)|JD|descrição.{0,15}vaga|rejeitado por n[aã]o)/i,
    bullet: 'Critérios eliminatórios não descritos na JD',
    desc:    'reprovações por requisitos não divulgados na vaga',
  },
  {
    key: 'falta-feedback',
    pattern: /(manter.{0,15}candidato.{0,15}informado|sem.{0,15}posicionamento|falta.{0,15}feedback|sem.{0,15}feedback|n[aã]o.{0,20}retorn)/i,
    bullet: 'Falta de posicionamento entre etapas',
    desc:    'candidatos sem retorno sobre status/resultado',
  },
  {
    key: 'multiplos-gestores',
    pattern: /(3.{0,10}gestor|tr[êe]s.{0,10}gestor|gestores.{0,30}30.{0,10}min|pouco tempo.{0,30}(respost|di[áa]logo))/i,
    bullet: 'Entrevista sobrecarregada (múltiplos gestores em pouco tempo)',
    desc:    'formato limita profundidade das respostas',
  },
];

const ACTION_MAP: ActionEntry[] = [
  { key: 'Demora',         action: '<strong>Definir SLA de retorno</strong> entre etapas (máx. 5 dias úteis) com atualização proativa ao candidato' },
  { key: 'Gestores',       action: '<strong>Reforço no alinhamento de perfil</strong> — TA pontua postura esperada (foco, pontualidade, evitar desmarcações) e compartilha material de apoio para entrevista estruturada' },
  { key: 'Salário',        action: '<strong>Incluir faixa salarial e turno</strong> desde o 1º contato para alinhar expectativas' },
  { key: 'Cancelamentos',  action: '<strong>Protocolo de comunicação</strong> para cancelamentos de vaga e bloqueios internos' },
  { key: 'Critérios',      action: '<strong>Revisar JDs com TA + gestor</strong> para explicitar critérios eliminatórios antes da divulgação' },
  { key: 'Falta',          action: '<strong>Ciclo de comunicação proativa</strong> com status a cada etapa, mesmo sem decisão final' },
  { key: 'sobrecarregada', action: '<strong>Rever formato de painel</strong> — evitar 3 gestores em 30 min; priorizar tempo para diálogo' },
];

interface BuildHighsOpts {
  themes?: Theme[];
  minMatches?: number;
  skipTaMentions?: boolean;
}

export function buildHighs(positives: Comment[], allComments: Comment[], opts?: BuildHighsOpts): string[] {
  const themes = opts?.themes ?? HIGH_THEMES;
  const minMatches = opts?.minMatches ?? 2;
  const skipTaMentions = !!(opts?.skipTaMentions);
  const result: string[] = [];

  for (const theme of themes) {
    const matches = positives.filter(c => theme.pattern.test(c.text));
    if (matches.length >= minMatches) {
      result.push(`<strong>${theme.bullet}</strong> — ${theme.desc} <em style="color:#888;">(${matches.length} menções)</em>`);
    }
  }

  if (skipTaMentions) {
    if (result.length === 0) {
      result.push('<strong>Comentários positivos</strong> — sem temas recorrentes detectados automaticamente. Revise os comentários no PDF.');
    }
    return result.slice(0, 6);
  }

  const mentioned = new Set<string>();
  for (const c of allComments.filter(x => x.score >= 4)) {
    for (const ta of TA_NAMES) {
      const re = new RegExp('\\b' + ta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      if (re.test(c.text)) {
        const norm = ta
          .replace(/^(Maria )?Beatriz$/, 'Beatriz')
          .replace(/^Thaís$/, 'Thais')
          .replace(/^Kátia$/, 'Katia')
          .replace(/^Carolina Zanotti$/, 'Carolina')
          .replace(/^Laura Luize$/, 'Laura')
          .replace(/^Bruna Santos$/, 'Bruna')
          .replace(/^(Thais Andrade|Thais Carvalho)$/, 'Thais');
        mentioned.add(norm);
      }
    }
  }
  if (mentioned.size > 0) {
    const names = [...mentioned].slice(0, 8).join(', ');
    result.push(`<strong>TAs citados por nome</strong> — ${names} reconhecidos(as) nominalmente nos comentários`);
  }

  if (result.length === 0) {
    result.push('<strong>Comentários positivos</strong> — sem temas recorrentes detectados automaticamente. Revise os comentários nota 5 no PDF.');
  }
  return result.slice(0, 6);
}

interface BuildLowsOpts {
  themes?: Theme[];
  skipScoreFilter?: boolean;
}

export function buildLows(allComments: Comment[], opts?: BuildLowsOpts): string[] {
  const themes = opts?.themes ?? LOW_THEMES;
  const skipScoreFilter = !!(opts?.skipScoreFilter);
  const negatives = skipScoreFilter
    ? allComments.filter(c => c.text && c.text.length > 20)
    : allComments.filter(c => c.score <= 3 && c.text && c.text.length > 20);

  const result: string[] = [];
  for (const theme of themes) {
    const matches = negatives.filter(c => theme.pattern.test(c.text));
    if (matches.length >= 1) {
      const names = matches.slice(0, 4).map(m => (m.name || '').split(' ')[0]).filter(Boolean).join(', ');
      const exSuffix = names ? ` · ex.: ${escapeHtml(names)}` : '';
      result.push(`<strong>${theme.bullet}</strong> — ${theme.desc} <em style="color:#888;">(${matches.length}×${exSuffix})</em>`);
    }
  }
  if (result.length === 0) {
    result.push('<strong>Nenhum tema negativo recorrente detectado automaticamente</strong> — revise os comentários no PDF.');
  }
  return result.slice(0, 6);
}

interface BuildActionsOpts {
  map?: ActionEntry[];
}

export function buildActions(lows: string[], opts?: BuildActionsOpts): string[] {
  const map = opts?.map ?? ACTION_MAP;
  const result: string[] = [];
  for (const { key, action } of map) {
    if (lows.some(l => l.includes(key))) result.push(action);
  }
  if (result.length === 0) {
    result.push('<strong>Definir plano de ação</strong> com base nos pontos de atenção identificados');
  }
  return result;
}
