import type { OutSlaRow } from '../types';

export interface OutSlaInsights {
  highs: string[];
  lows: string[];
  actions: string[];
}

export function buildOutSlaInsights(rows: OutSlaRow[]): OutSlaInsights {
  if (!rows.length) return { highs: [], lows: [], actions: [] };

  const total = rows.length;
  const avg   = Math.round(rows.reduce((s, r) => s + r.timeToOffer, 0) / total);
  const max   = Math.max(...rows.map(r => r.timeToOffer));

  const countStage  = (stage: string) => rows.filter(r => r.stage === stage).length;
  const countReason = (reason: string) => rows.filter(r => r.offTimeReason.toLowerCase().includes(reason.toLowerCase())).length;
  const pct         = (n: number) => Math.round((n / total) * 100);

  const hmDelays  = countReason('Demoras Hiring Manager');
  const nicho     = countReason('Perfil de Nicho');
  const cambio    = countReason('Cambio de perfil');
  const bgcFailed = countReason('Background check rejected');
  const hmStage   = countStage('Entrevista HM');
  const taStage   = countStage('Entrevista TA');
  const noReason  = rows.filter(r => !r.offTimeReason).length;

  // ── Highs ─────────────────────────────────────────────────────────────────
  const highs: string[] = [];

  if (hmDelays === 0) {
    highs.push('Nenhum atraso atribuído ao <strong>Hiring Manager</strong> — boa parceria de gestão');
  } else if (hmDelays === 1) {
    highs.push('Apenas <strong>1</strong> caso com atraso por HM — impacto isolado');
  }

  if (bgcFailed === 0) {
    highs.push('Nenhuma reprovação em <strong>Background Check</strong> — qualidade do pipeline preservada');
  }

  if (cambio === 0) {
    highs.push('Nenhuma vaga com <strong>mudança de perfil</strong> — alinhamento inicial bem feito');
  }

  if (noReason === 0) {
    highs.push('Todos os casos possuem <strong>motivo de atraso registrado</strong> — diagnóstico completo');
  }

  if (highs.length === 0) {
    highs.push('Acompanhamento ativo das vagas em andamento — oportunidade de reversão');
  }

  // ── Lows ──────────────────────────────────────────────────────────────────
  const lows: string[] = [];

  lows.push(`Média de <strong>${avg} dias</strong> fora do SLA — pico em <strong>${max} dias</strong>`);

  if (hmDelays > 0) {
    lows.push(`<strong>${hmDelays}</strong> vaga(s) (${pct(hmDelays)}%) com atraso atribuído ao <strong>Hiring Manager</strong>`);
  }

  if (hmStage > 0) {
    lows.push(`<strong>${hmStage}</strong> vaga(s) (${pct(hmStage)}%) travada(s) na etapa <strong>Entrevista HM</strong>`);
  }

  if (taStage > 0) {
    lows.push(`<strong>${taStage}</strong> vaga(s) (${pct(taStage)}%) parada(s) em <strong>Entrevista TA</strong> sem avanço`);
  }

  if (nicho > 0) {
    lows.push(`<strong>${nicho}</strong> vaga(s) com <strong>Perfil de Nicho</strong> — pipeline de candidatos restrito`);
  }

  if (cambio > 0) {
    lows.push(`<strong>${cambio}</strong> vaga(s) com <strong>Mudança de Perfil</strong> — gera retrabalho e impacta SLA`);
  }

  if (bgcFailed > 0) {
    lows.push(`<strong>${bgcFailed}</strong> candidato(s) reprovado(s) no <strong>Background Check</strong>`);
  }

  if (noReason > 0) {
    lows.push(`<strong>${noReason}</strong> vaga(s) (${pct(noReason)}%) <strong>sem motivo de atraso registrado</strong> — impede diagnóstico e ação`);
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  const actions: string[] = [];

  if (hmDelays > 0 || hmStage > 0) {
    actions.push('Acionar <strong>follow-up semanal</strong> com HMs das vagas paradas para destravar decisões');
  }

  if (noReason > 0) {
    actions.push(`Registrar o <strong>motivo de atraso</strong> nas <strong>${noReason}</strong> vaga(s) sem informação para embasar o diagnóstico`);
  }

  if (nicho > 0) {
    actions.push('Revisar requisitos e <strong>ampliar canais de atração</strong> para perfis de nicho');
  }

  if (cambio > 0) {
    actions.push('<strong>Revisar os requisitos necessários</strong> após 30 dias de divulgação externa e realizar realinhamentos com o HM');
  }

  if (taStage > 0 && !actions.some(a => a.includes('follow-up'))) {
    actions.push(`Priorizar devolutiva das <strong>${taStage}</strong> entrevista(s) de TA em aberto`);
  }

  if (actions.length === 0) {
    actions.push('Revisar individualmente cada vaga para definir próximos passos');
  }

  return {
    highs:   highs.slice(0, 4),
    lows:    lows.slice(0, 6),
    actions: actions.slice(0, 5),
  };
}
