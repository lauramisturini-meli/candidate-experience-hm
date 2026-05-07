import { escapeHtml } from './utils';
import type { Comment, Dimension, HpPayload, HpLayerRow, HpSummary } from '../types';

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

// ── Internal Candidate themes ─────────────────────────────────────────────────

export const INTERNAL_HIGH_THEMES: Theme[] = [
  {
    key: 'escopo',
    // "A clareza do escopo, função e Work Sample"
    pattern: /(clareza|claro).{0,60}(escopo|fun[çc][ãa]o|cargo|work\s*sample|desafio)|(escopo|work\s*sample|desafio).{0,60}(claro|clareza|perfeito|bem.definid)/i,
    bullet: 'Clareza do escopo e do cargo',
    desc:   'candidatos compreendem bem o papel, os desafios e o Work Sample da vaga',
  },
  {
    key: 'feedback-gestor',
    // "o feedback final com a gestora da vaga" / "O feedback do gestor e a maneira com que a entrevista foi conduzida"
    pattern: /(feedback|devolutiva).{0,60}(gestor|gestora|high\s*manager|lideran[çc]a?|da\s*vaga|da\s*[áa]rea)|(gestor|gestora).{0,60}(feedback|devolutiva|construtivo|rico|evolu[çc][ãa]o)/i,
    bullet: 'Feedback do gestor reconhecido',
    desc:   'devolutiva da gestora/gestor valorizada como insumo de desenvolvimento',
  },
  {
    key: 'conducao',
    // "Clareza e transparência ao longo do processo" / "condução dinâmica" / "bem conduzido"
    pattern: /(condu[çz][ãa]o|conduziu|conduzid[oa]|transparência|transparente|atencio[sz]a?).{0,60}(processo|entrevista|etapa)|(processo|entrevista).{0,60}(transparente|transparência|bem\s*conduzid|atencio[sz]a?)/i,
    bullet: 'Processo conduzido com transparência',
    desc:   'candidatos reconhecem clareza e profissionalismo na condução das etapas',
  },
  {
    key: 'rapidez',
    // "Rápido e claro" / "Processo rápido"
    pattern: /\b(r[áa]pid[oa]\s+e\s+claro|processo\s+r[áa]pid[oa]|r[áa]pid[oa]\s+processo)|(r[áa]pid[oa]|[áa]gil).{0,40}(processo|etapa|claro|formaliz)/i,
    bullet: 'Processo ágil',
    desc:   'velocidade do processo interno reconhecida como diferencial',
  },
  {
    key: 'lideranca',
    // "me conectei muito com a liderança e o projeto" / "Entrevista com o High Manager"
    pattern: /(conectei|conect).{0,60}(lideran[çc]a?|projeto|gestor|equipe)|(high\s*manager|entrevista.{0,20}(lider|gestor|high)).{0,60}|(desafio).{0,30}(perfeito|ideal)/i,
    bullet: 'Conexão com a liderança e o projeto',
    desc:   'alinhamento com a gestão e entusiasmo com o desafio destacados',
  },
  {
    key: 'disponibilidade-ta',
    // "A maneira como o time do RH entrava em contato para perguntar a disponibilidade"
    pattern: /(maneira|forma).{0,30}(RH|TA|T&A|recrutad).{0,40}(contato|reuni[oã]o|disponibil)|(RH|TA|T&A|recrutad).{0,40}(entrava.{0,20}contato|pergunt.{0,20}disponibil|disponibilidade)/i,
    bullet: 'Disponibilidade e contato ativo do time de TA',
    desc:   'candidatos valorizam a proatividade do TA em marcar reuniões e confirmar disponibilidade',
  },
];

export const INTERNAL_LOW_THEMES: Theme[] = [
  {
    key: 'Atraso-Feedback',
    // "quase 3 meses... fiquei cobrando a recrutadora" / "só porque eu fiquei cobrando"
    pattern: /(feedback|retorno|devolutiva).{0,120}(3\s*mes|quase\s*[23]\s*mes|meses?.{0,20}depois|cobrando|cobrei|s[oó]\s*depois\s*que\s*cobr)|(cobrando|cobrei).{0,80}(feedback|retorno|recrutador[ae]?|TA|T&A)/i,
    bullet: 'Atraso grave no retorno final',
    desc:   'candidatos esperaram meses por feedback, frequentemente precisando cobrar proativamente',
  },
  {
    key: 'Falta-Feedback',
    // "Não recebi um feedback construtivo" / "feedback do motivo da não continuidade"
    pattern: /(n[ãa]o\s*recebi|sem|falta[ou]?|n[ãa]o\s*tive).{0,50}(feedback|devolutiva|retorno\s*construtivo)|(feedback|devolutiva).{0,50}(n[ãa]o\s*foi\s*de\s*acordo|n[ãa]o\s*construtivo|motivo.{0,20}n[ãa]o\s*continu|claro|espec[íi]fico)/i,
    bullet: 'Falta de feedback construtivo',
    desc:   'candidatos finalizaram o processo sem devolutiva clara de critérios ou orientação de melhoria',
  },
  {
    key: 'Inconsistencia',
    // "feedback por mensagem não foi de acordo com o que falamos na entrevista"
    pattern: /(feedback|retorno|devolutiva).{0,80}(n[ãa]o\s*foi\s*de\s*acordo|n[ãa]o\s*condiz|inconsistente|diferente.{0,20}(entrevista|conversa)|divergente)/i,
    bullet: 'Feedback inconsistente com a entrevista',
    desc:   'devolutiva escrita divergiu do que foi discutido presencialmente, gerando desconfiança',
  },
  {
    key: 'Visibilidade',
    // "visibilidade sobre as etapas" / "acompanhamento claro" / "roteiro de entrevista"
    pattern: /(visibilidade|visibilidad|acompanhamento).{0,60}(etapas?|processo|andamento)|(melhorar|maior|sem|pouca).{0,30}(visibilidade|comunica[çc][ãa]o|acompanhamento)|(roteiro.{0,20}entrevista|local.{0,30}acompanhar)/i,
    bullet: 'Baixa visibilidade do andamento',
    desc:   'candidatos sem clareza sobre próximos passos, prazos ou status atual do processo',
  },
  {
    key: 'Demora',
    // "durou 2 meses até a formalização" / "poderia ser mais rápido"
    pattern: /(2\s*mes|dois\s*mes|demorou|mais\s*r[áa]pid[oa]).{0,60}(formaliz|bot|process|etapa)|(process[oa]\s*lento|velocidade.{0,20}process)/i,
    bullet: 'Processo demorado',
    desc:   'candidatos relatam processos de 2+ meses até a formalização via bot',
  },
  {
    key: 'Bot-Portal',
    // "O bot de etapas demorou a notificar" / "instabilidade do portal"
    pattern: /(bot|portal).{0,60}(demor|atraso|n[ãa]o\s*notific|instabilidade|lento)|(notifica[çc][ãa]o).{0,40}(demor|atraso|bot)|instabilidade.{0,20}(portal|bot)/i,
    bullet: 'Bot/portal com falhas de notificação',
    desc:   'atrasos e instabilidades no bot impactam a comunicação das etapas',
  },
  {
    key: 'Atencao-TA',
    // "a pessoa TA deve ser mais atenta... dar devolutivas sobre retornos das etapas"
    pattern: /(TA|T&A|recrutador[ae]?|pessoa\s*TA).{0,80}(atent|devolutiv|retorno.{0,20}etapa|feedback.{0,20}(positivo|negativo|etapa))|(mais\s*atent.{0,30}(candidat|TA|recrutad))/i,
    bullet: 'Falta de proatividade do TA com candidatos',
    desc:   'candidatos esperam mais atenção e devolutivas proativas do TA ao longo das etapas',
  },
  {
    key: 'Exclusividade',
    // "não podemos nos candidatar para outro processo enquanto estamos no processo"
    pattern: /(n[ãa]o.{0,20}(podemos|posso).{0,20}(candidat|concorrer).{0,20}(outro|outra)|(outro.{0,20}processo.{0,20}(enquanto|durante|ao\s*mesmo)))/i,
    bullet: 'Restrição de candidatura paralela',
    desc:   'colaboradores bloqueados de concorrer a outras vagas enquanto estão no processo',
  },
];

export const INTERNAL_ACTION_MAP: ActionEntry[] = [
  { key: 'Atraso',        action: '<strong>SLA de retorno ativo para internos</strong> — máximo 5 dias úteis após entrevista final; TA contata proativamente sem esperar cobrança do candidato' },
  { key: 'Falta',         action: '<strong>Padronizar devolutiva pós-processo</strong> — template com pontos fortes, gaps e orientação de desenvolvimento, independente do resultado' },
  { key: 'Inconsistencia',action: '<strong>Alinhar feedback escrito com o verbal</strong> — TA registra os pontos discutidos na entrevista e os espelha na devolutiva formal, evitando divergências' },
  { key: 'Visibilidade',  action: '<strong>Comunicar status a cada etapa</strong> — update proativo com prazo estimado da próxima etapa; não depender apenas do bot para notificar' },
  { key: 'Demora',        action: '<strong>Meta de 30 dias entre abertura e oferta</strong> — alerta automático ao TA quando SLA for ultrapassado e plano de desbloqueio com o gestor' },
  { key: 'Bot',           action: '<strong>Auditoria do bot de notificações</strong> — validar regras de disparo e criar canal de backup; TA confirma recebimento em etapas críticas' },
  { key: 'Atencao',       action: '<strong>Check-in proativo do TA a cada etapa</strong> — mensagem de status enviada pelo TA ao candidato em até 48h após cada etapa, mesmo sem decisão final' },
  { key: 'Exclusividade', action: '<strong>Revisar política de candidatura exclusiva</strong> — comunicar prazo esperado e avaliar se a restrição se justifica para o candidato interno' },
];

// Position-based metadata for the 5 internal candidate survey questions (fixed Qualtrics template)
const INTERNAL_DIM_META = [
  {
    name:       'Visibilidade do andamento do processo',
    highBullet: 'Boa visibilidade do andamento',
    highDesc:   'candidatos acompanharam as etapas com clareza ao longo do processo',
    lowBullet:  'Baixa visibilidade das etapas',
    lowDesc:    'candidatos sem clareza sobre onde estavam no processo ou próximos passos',
    action:     '<strong>Comunicado de status a cada etapa</strong> — atualização proativa com prazo estimado, via canal oficial além do bot',
  },
  {
    name:       'Experiência geral no processo (NPS interno)',
    highBullet: 'Experiência geral positiva',
    highDesc:   'candidatos internos avaliaram bem a experiência do processo seletivo',
    lowBullet:  'Experiência geral abaixo do esperado',
    lowDesc:    'score geral indica insatisfação com a jornada do processo interno',
    action:     '<strong>Mapear pontos de atrito na jornada do candidato interno</strong> — revisar todos os pontos de contato e identificar onde há perda de experiência',
  },
  {
    name:       'Feedback construtivo e específico ao final',
    highBullet: 'Feedback ao final do processo bem avaliado',
    highDesc:   'devolutiva pós-processo reconhecida como útil e construtiva',
    lowBullet:  'Falta de feedback construtivo',
    lowDesc:    'candidatos finalizaram o processo sem devolutiva clara de critérios ou orientação de melhoria',
    action:     '<strong>Padronizar devolutiva pós-processo interno</strong> — template com pontos fortes, gaps e orientação de desenvolvimento, independente do resultado',
  },
  {
    name:       'Clareza sobre como seria o processo desde o início',
    highBullet: 'Processo claro desde o início',
    highDesc:   'candidatos compreenderam as etapas e o que esperar desde o convite',
    lowBullet:  'Falta de clareza sobre o processo',
    lowDesc:    'candidatos não compreenderam as etapas e critérios antes de iniciar',
    action:     '<strong>Briefing de abertura do processo</strong> — enviar guia com etapas, prazos estimados e critérios de avaliação no momento do convite',
  },
  {
    name:       'Clareza do escopo, desafios e alcance do cargo',
    highBullet: 'Clareza do escopo e do cargo',
    highDesc:   'candidatos compreendem bem o papel, os desafios e o alcance da vaga',
    lowBullet:  'Escopo do cargo pouco detalhado',
    lowDesc:    'candidatos com dúvidas sobre responsabilidades e desafios reais do papel',
    action:     '<strong>Enriquecer JD interna</strong> — incluir desafios concretos, entregáveis esperados e diferencial do papel antes de divulgar a vaga',
  },
];

export function buildInternalInsights(
  dimensions: Dimension[],
  allComments: Comment[],
): { highs: string[]; lows: string[]; actions: string[] } {
  const highs: string[] = [];
  const lows: string[] = [];
  const actions: string[] = [];

  // ── 1. Dimension-based analysis (always runs) ────────────────────────────
  dimensions.forEach((dim, i) => {
    const meta   = INTERNAL_DIM_META[i];
    if (!meta) return;
    const fav    = parseInt((dim.fav    || '').replace('%', ''), 10);
    const desfav = parseInt((dim.desfav || '').replace('%', ''), 10);
    if (isNaN(fav)) return;

    if (fav >= 82) {
      const suffix = dim.desfav !== '—' ? `${dim.fav} fav · ${dim.desfav} desfav` : `${dim.fav} favorabilidade`;
      highs.push(`<strong>${meta.highBullet}</strong> — ${meta.highDesc} <em style="color:#888;">(${suffix})</em>`);
    }
    // Bug fix: trigger low on fav threshold alone; desfav is optional signal
    if (fav < 68 || (!isNaN(desfav) && desfav >= 22)) {
      const suffix = dim.desfav !== '—' ? `${dim.fav} fav · ${dim.desfav} desfav` : `${dim.fav} favorabilidade`;
      lows.push(`<strong>${meta.lowBullet}</strong> — ${meta.lowDesc} <em style="color:#888;">(${suffix})</em>`);
      actions.push(meta.action);
    }
  });

  // ── 2. Comment-based analysis ────────────────────────────────────────────
  // Internal survey open-ended answers come from ALL respondents regardless of NPS score.
  // Scan the full comment pool for both positive and negative patterns.
  const allWithText = allComments.filter(c => c.text && c.text.length > 8);

  for (const theme of INTERNAL_HIGH_THEMES) {
    const matches = allWithText.filter(c => theme.pattern.test(c.text));
    if (matches.length >= 1 && !highs.some(h => h.includes(theme.bullet))) {
      highs.push(
        `<strong>${theme.bullet}</strong> — ${theme.desc} <em style="color:#888;">(${matches.length} menção${matches.length > 1 ? 'ões' : ''})</em>`
      );
    }
  }

  for (const theme of INTERNAL_LOW_THEMES) {
    const matches = allWithText.filter(c => theme.pattern.test(c.text));
    if (matches.length >= 1 && !lows.some(l => l.includes(theme.bullet))) {
      const names = matches.slice(0, 3).map(m => (m.name || '').split(' ')[0]).filter(Boolean).join(', ');
      const suffix = names ? ` · ex.: ${escapeHtml(names)}` : '';
      lows.push(
        `<strong>${theme.bullet}</strong> — ${theme.desc} <em style="color:#888;">(${matches.length}×${suffix})</em>`
      );
    }
  }

  // Map lows to actions (deduplicated)
  for (const { key, action } of INTERNAL_ACTION_MAP) {
    if (lows.some(l => l.includes(key)) && !actions.includes(action)) {
      actions.push(action);
    }
  }

  if (highs.length === 0) {
    highs.push('<strong>Carregue um PDF com dados válidos</strong> — as análises serão geradas automaticamente a partir das dimensões e comentários.');
  }
  if (lows.length === 0) {
    lows.push('<strong>Nenhum ponto crítico detectado</strong> — todas as dimensões estão com favorabilidade acima do limiar de atenção.');
  }
  if (actions.length === 0) {
    actions.push('<strong>Manter acompanhamento mensal</strong> — revisar dimensões e comentários a cada ciclo de pesquisa.');
  }

  return { highs: highs.slice(0, 6), lows: lows.slice(0, 6), actions: actions.slice(0, 6) };
}

const TA_NAMES = [
  'Beatriz', 'Bia', 'Maria Beatriz', 'Carolina', 'Carol', 'Carolina Zanotti',
  'Cardoso', 'Laura', 'Laura Luize', 'Thais', 'Thaís', 'Thais Andrade', 'Thais Carvalho',
  'Aline', 'Aline Nagel', 'Marianne', 'Katia', 'Kátia', 'Kitty', 'Bruna', 'Bruna Santos',
  'Letícia Navarro', 'Leticia Navarro', 'Letícia', 'Leticia',
  'Juliana', 'Marianne Ramos', 'Marianne Fernandes',
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
    pattern: /(gestor|gestora|supervisor|superior).{0,80}(atraso|atrasou|despreparad|desatent|sem preparo|olhando|perdid|imatur|n[aã]o prest|foi ao banheiro|chegou atrasad|perguntas?.{0,20}(n[aã]o.{0,10}(alinhad|nexo|relacionad)|gen[eé]ric))/i,
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
  {
    key: 'exame-reprovar',
    pattern: /exame.{0,60}(negativa|reprova|desclassific|reprovar|laudo)|marcar.{0,30}exame.{0,30}(reprovar|validar)/i,
    bullet: 'Exame aplicado como critério eliminatório sem transparência',
    desc:    'candidatos realizaram exames e foram reprovados sem entender o critério previamente',
  },
  {
    key: 'desalinhamento-rh-gestor',
    pattern: /(RH|recrutador[ae]?).{0,60}alinhar?.{0,30}(gestor|gestora)|(gestor|gestora).{0,60}(mesmo perfil|mesmas perguntas|semelhante|n[aã]o estava alinhad)|(direcionad.{0,30}vaga.{0,30}n[aã]o faz sentido|n[aã]o faz sentido.{0,30}vaga)/i,
    bullet: 'Desalinhamento entre RH e gestor',
    desc:    'candidatos percebem inconsistência entre o que o RH apresentou e o que o gestor avaliou',
  },
  {
    key: 'republicou',
    pattern: /(republicaram|republica[ou]+).{0,20}vaga|(contat[oa][ur].{0,40}mesma\s*vaga|mesma\s*vaga.{0,40}contat[oa][ur])|(já\s*estava.{0,30}processo.{0,30}contat[oa][ur])/i,
    bullet: 'Vaga republicada ou candidato recontactado para a mesma posição',
    desc:    'falha no CRM indica que candidatos ativos foram abordados como se fossem novos',
  },
  {
    key: 'entrevista-rasa',
    pattern: /(n[aã]o.{0,15}(pergunt|teve\s*perguntas|abordou).{0,30}(hist[oó]rico|experi[eê]ncia|trajet[oó]ria))|(perguntas?.{0,20}(gen[eé]ric|n[aã]o.{0,10}(nexo|sentido|alinhad).{0,20}(vaga|cargo|descri[çc])))/i,
    bullet: 'Entrevista rasa ou desalinhada à vaga',
    desc:    'perguntas genéricas sem conexão com a experiência do candidato ou com o escopo do cargo',
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
  { key: 'exame',         action: '<strong>Comunicar critérios de exames antes da aplicação</strong> — candidato deve saber previamente o que é avaliado e qual o impacto no processo' },
  { key: 'desalinhamento', action: '<strong>Briefing obrigatório RH → gestor antes da entrevista</strong> — alinhar perfil esperado, perguntas-chave e critérios eliminatórios para evitar avaliações contraditórias' },
  { key: 'republicou',    action: '<strong>Auditoria do CRM</strong> — garantir que candidatos ativos não sejam recontactados para a mesma vaga; revisar regras de exclusão no sistema' },
  { key: 'entrevista',    action: '<strong>Preparar gestores com roteiro específico por vaga</strong> — perguntas devem estar alinhadas ao escopo e ao histórico do candidato, evitando entrevistas genéricas' },
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
          .replace(/^Bia$/, 'Beatriz')
          .replace(/^Thaís$/, 'Thais')
          .replace(/^(Thais Andrade|Thais Carvalho)$/, 'Thais')
          .replace(/^Kátia$/, 'Katia')
          .replace(/^Carol$/, 'Carolina')
          .replace(/^Carolina Zanotti$/, 'Carolina')
          .replace(/^Laura Luize$/, 'Laura')
          .replace(/^Bruna Santos$/, 'Bruna')
          .replace(/^Aline Nagel$/, 'Aline')
          .replace(/^(Marianne Ramos|Marianne Fernandes)$/, 'Marianne')
          .replace(/^(Letícia Navarro|Leticia Navarro|Leticia)$/, 'Letícia');
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

// ── HP Completion insights ────────────────────────────────────────────────────

function hpPaceIdeal(): number {
  // Fraction of year elapsed × 100 — e.g., May (month 5) = 41.67%
  return ((new Date().getMonth() + 1) / 12) * 100;
}

function hpLayerRatio(row: HpLayerRow): number {
  const denom = row.cerradas + row.sinActivar;
  return denom === 0 ? 0 : row.cerradas / denom;
}

export function buildHpHighs(hp: HpPayload): string[] {
  const result: string[] = [];

  // 1. Absolute volume of closed positions + top layer
  if (hp.cerradas > 0) {
    const topLayer = hp.rows.length > 0
      ? [...hp.rows].sort((a, b) => b.cerradas - a.cerradas)[0] as HpLayerRow
      : null;
    const layerSuffix = topLayer
      ? ` — <strong>${escapeHtml(topLayer.agrupLayer)}</strong> lideran com ${topLayer.cerradas} fechamentos, indicando boa velocidade na camada operacional crítica`
      : '';
    result.push(`<strong>${hp.cerradas} posições cerradas</strong>${layerSuffix}.`);
  }

  // 2. On Going pipeline + projected pct if converted
  if (hp.onGoing > 0 && hp.posicionesTotal > 0) {
    const projectedPct = Math.round((hp.cerradas + hp.onGoing) / hp.posicionesTotal * 100);
    const suffix = projectedPct > 50
      ? `superando a metade do plano`
      : `aproximando o plano da metade`;
    result.push(
      `<strong>${hp.onGoing} posições On Going</strong> — pipeline ativo relevante que, se convertido, empurraria o avanço para ~${projectedPct}%, ${suffix}.`
    );
  }

  // 3. Best layer by closed/(closed+notActivated) ratio
  if (hp.rows.length > 0) {
    const bestRow = [...hp.rows].sort((a, b) => hpLayerRatio(b) - hpLayerRatio(a))[0] as HpLayerRow;
    const ratio = hpLayerRatio(bestRow);
    if (ratio >= 0.45) {
      const total = bestRow.cerradas + bestRow.sinActivar;
      const pct = Math.round(ratio * 100);
      result.push(
        `<strong>Camada ${escapeHtml(bestRow.agrupLayer)} em proporção saudável</strong>: ${bestRow.cerradas} cerradas de ${total} totais (~${pct}%), melhor taxa relativa entre os grupos.`
      );
    }
  }

  if (result.length === 0) {
    result.push('<strong>Dados carregados</strong> — analise os KPIs e a tabela de breakdown para contexto completo.');
  }
  return result;
}

export function buildHpLows(hp: HpPayload): string[] {
  const result: string[] = [];

  // 1. Not-activated share
  const inativasPct = hp.posicionesTotal > 0
    ? Math.round((hp.sinActivar / hp.posicionesTotal) * 100)
    : 0;
  if (hp.sinActivar > 0 && inativasPct >= 25) {
    result.push(
      `<strong>${hp.sinActivar} posições sem ativar</strong> — maior bloco do funil (${inativasPct}% do total). Representa risco real de atraso se as ativações não acelerarem nos próximos meses.`
    );
  }

  // 2. Progress below expected pace
  if (hp.porcentajeAvance < hpPaceIdeal()) {
    result.push(
      `<strong>Apenas ${hp.porcentajeAvance.toFixed(2).replace('.', ',')}% de avanço no HP</strong> — com ${hp.year} já em andamento, o ritmo atual exigiria forte aceleração para fechar o ano dentro do plano.`
    );
  }

  // 3. Worst layer bottleneck (most represed — lowest closed/total ratio)
  if (hp.rows.length > 0) {
    const worstRow = [...hp.rows].sort((a, b) => hpLayerRatio(a) - hpLayerRatio(b))[0] as HpLayerRow;
    if (hpLayerRatio(worstRow) < 0.50) {
      result.push(
        `<strong>${escapeHtml(worstRow.agrupLayer)} têm ${worstRow.sinActivar} posições sem ativar contra ${worstRow.cerradas} cerradas</strong> — camada mais represada, impacto direto na capacidade operacional.`
      );
    }
  }

  // 4. Planned rotations drag
  if (hp.totalRotations > 0 && hp.posicionesTotal > 0 && (hp.totalRotations / hp.posicionesTotal) > 0.10) {
    result.push(
      `<strong>${hp.totalRotations} rotações projetadas</strong> — reposições já esperadas que consumirão parte do esforço de recrutamento sem gerar crescimento líquido.`
    );
  }

  if (result.length === 0) {
    result.push('<strong>Nenhum ponto crítico detectado automaticamente</strong> — revise os dados do HP para contexto adicional.');
  }
  return result;
}

export function buildHpActions(hp: HpPayload): string[] {
  const result: string[] = [];
  const inativasPct = hp.posicionesTotal > 0
    ? Math.round((hp.sinActivar / hp.posicionesTotal) * 100) : 0;
  const progressLow = hp.porcentajeAvance < hpPaceIdeal();
  const rotationHigh = hp.totalRotations > 0 && hp.posicionesTotal > 0
    && (hp.totalRotations / hp.posicionesTotal) > 0.10;

  // Worst layer for bottleneck action
  const worstRow = hp.rows.length > 0
    ? [...hp.rows].sort((a, b) => hpLayerRatio(a) - hpLayerRatio(b))[0] as HpLayerRow
    : null;
  const hasBottleneck = worstRow && hpLayerRatio(worstRow) < 0.50;

  if (hp.sinActivar > 0 && inativasPct >= 25) {
    result.push(
      `<strong>Priorizar ativação das ${hp.sinActivar} posições paradas</strong> — mapear gargalos (aprovação de budget, requisitos pendentes, headcount freeze?) e definir SLA de ativação por layer.`
    );
  }

  if (hp.onGoing > 0) {
    result.push(
      `<strong>Converter o pipeline On Going com urgência</strong> — ${hp.onGoing} posições em andamento são oportunidade imediata; review semanal de status com TAs para destravar ofertas paradas.`
    );
  }

  if (hasBottleneck && worstRow) {
    result.push(
      `<strong>Foco em ${escapeHtml(worstRow.agrupLayer)}</strong> — criar sprint dedicado de recrutamento para essa camada, que concentra o maior volume não ativado (${worstRow.sinActivar} posições).`
    );
  }

  if (rotationHigh) {
    result.push(
      `<strong>Plano de retenção paralelo</strong> — com ${hp.totalRotations} rotações projetadas, ações de retenção podem reduzir reposições e liberar capacidade de TA para posições de crescimento.`
    );
  }

  if (progressLow) {
    const monthsElapsed = new Date().getMonth() + 1;
    result.push(
      `<strong>Revisitar meta de pace mensal</strong> — com ${hp.porcentajeAvance.toFixed(2).replace('.', ',')}% em ~${monthsElapsed} meses, calcular o ritmo necessário para fechar ${hp.year} e avaliar se o headcount de TA está dimensionado para isso.`
    );
  }

  if (result.length === 0) {
    result.push('<strong>Manter ritmo atual</strong> — acompanhar evolução mensal e ajustar foco conforme necessário.');
  }
  return result;
}

export function buildHpSummary(hp: HpPayload): HpSummary {
  const notActivatedPct = hp.posicionesTotal > 0
    ? Math.round((hp.sinActivar / hp.posicionesTotal) * 100) : 0;
  const projectedPct = hp.posicionesTotal > 0
    ? Math.round((hp.cerradas + hp.onGoing) / hp.posicionesTotal * 100) : 0;

  const worstRow = hp.rows.length > 0
    ? [...hp.rows].sort((a, b) => hpLayerRatio(a) - hpLayerRatio(b))[0] as HpLayerRow
    : null;

  const paragraph1 = `O ${escapeHtml(hp.title)} está em ${hp.porcentajeAvance.toFixed(2).replace('.', ',')}% de avanço com um funil claramente represado: quase ${notActivatedPct}% das posições ainda não foram ativadas. O maior risco não está no recrutamento em si, mas na falta de ativação — posições que nem entraram em processo. Se as ${hp.onGoing} posições On Going converterem, o plano chega perto de ${projectedPct}%, o que muda o cenário, mas ainda deixa um gap grande para fechar o ano.`;

  const paragraph2 = worstRow && hpLayerRatio(worstRow) < 0.50
    ? `O ponto mais crítico para olhar é o bloco de ${escapeHtml(worstRow.agrupLayer)}, que tem mais posições paradas do que fechadas. Qualquer aceleração no HP passa por destravar essa camada primeiro.`
    : `Para fechar o ano dentro do plano, o time precisa converter o pipeline On Going e ativar as posições paradas com urgência.`;

  return { paragraph1, paragraph2 };
}

// ── HM dimension-based insights (activated when user fills in desfav/neutros) ──

const HM_DIM_SHORT: Record<string, string> = {
  'Visibilidade sobre o avanço do processo':                 'Visibilidade do processo',
  'Perfis avaliados alinhados ao perfil definido':           'Alinhamento de perfil',
  'Recomendações de valor do time de TA durante o processo': 'Recomendações de valor do TA',
};

const HM_DIM_ACTIONS: Record<string, string> = {
  'Visibilidade sobre o avanço do processo':
    '<strong>Check-in semanal de status com o gestor</strong> — comunicar candidatos em processo, etapa atual e prazo estimado para próximas movimentações',
  'Perfis avaliados alinhados ao perfil definido':
    '<strong>Revisar briefing técnico no kick-off</strong> — separar must-haves de nice-to-haves e validar critérios com o gestor antes de iniciar o funil',
  'Recomendações de valor do time de TA durante o processo':
    '<strong>Incluir análise crítica em cada devolutiva</strong> — pontos fortes, limitações e fit cultural do candidato, não apenas o perfil técnico',
};

export function buildHmDimensionInsights(
  dims: Array<{ name: string; fav: string; desfav: string }>,
  kpiNeutros: string,
  kpiDesfav: string,
): { highs: string[]; lows: string[]; actions: string[] } {
  const highs: string[] = [];
  const lows: string[] = [];
  const actions: string[] = [];

  // Sort by desfav desc so worst dim appears first in lows
  const sorted = [...dims].sort((a, b) => {
    const da = parseInt(a.desfav) || 0;
    const db = parseInt(b.desfav) || 0;
    return db - da;
  });

  for (const d of sorted) {
    const favNum    = parseInt(d.fav,    10);
    const desfavNum = parseInt(d.desfav, 10);
    const short     = HM_DIM_SHORT[d.name] || d.name;
    const hasFav    = !isNaN(favNum);
    const hasDesfav = !isNaN(desfavNum);

    // Highs: fav ≥ 90% with low desfav
    if (hasFav && favNum >= 90 && (!hasDesfav || desfavNum <= 8)) {
      highs.push(
        `<strong>${short}</strong> — ${d.fav} de favorabilidade${hasDesfav ? `, apenas ${d.desfav} de desfavorabilidade` : ''}`
      );
    }

    // Lows: fav < 85% OR desfav ≥ 10%
    if (hasFav && favNum < 85) {
      lows.push(
        `<strong>${short} abaixo de 85%</strong> — ${d.fav} de favorabilidade${hasDesfav ? ` · ${d.desfav} desfavorável` : ''} — ponto de atenção com os gestores`
      );
      const act = HM_DIM_ACTIONS[d.name];
      if (act && !actions.includes(act)) actions.push(act);
    } else if (hasDesfav && desfavNum >= 10) {
      lows.push(
        `<strong>Desfavorabilidade relevante — ${short}</strong> — ${d.desfav} dos gestores insatisfeitos com esta dimensão`
      );
      const act = HM_DIM_ACTIONS[d.name];
      if (act && !actions.includes(act)) actions.push(act);
    }
  }

  // Overall KPI desfav signal
  const overallDesfav = parseInt(kpiDesfav);
  if (!isNaN(overallDesfav) && overallDesfav >= 10 && !lows.some(l => l.includes('geral'))) {
    lows.push(
      `<strong>Desfavorabilidade geral de ${kpiDesfav}%</strong> — indica percepção negativa relevante da experiência HM no período`
    );
  }

  const overallNeutros = parseInt(kpiNeutros);
  if (!isNaN(overallNeutros) && overallNeutros >= 15) {
    lows.push(
      `<strong>${kpiNeutros}% de neutros no geral</strong> — parcela significativa de gestores sem posição clara; investigar barreiras à recomendação`
    );
  }

  return { highs: highs.slice(0, 6), lows: lows.slice(0, 6), actions: actions.slice(0, 6) };
}
