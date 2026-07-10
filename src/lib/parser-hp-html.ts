import type { PdfData, HpPayload, HpLayerRow, HpSlaStats, HpPipelineStep, HpQuarter, HpRawRow } from '../types';

export function isHpHtmlReport(text: string): boolean {
  return (
    /Relat[oó]rio Semanal.*Hiring Plan/i.test(text) &&
    /const A=\[/.test(text)
  );
}

function extractJsonArray(text: string, name: string): unknown[] {
  const marker = `${name}=[`;
  const start = text.indexOf(marker);
  if (start === -1) return [];
  const begin = start + marker.length - 1;
  let i = begin;
  let depth = 0;
  let inStr = false;
  while (i < text.length) {
    const ch = text[i];
    if (inStr) {
      if (ch === '\\') i++;
      else if (ch === '"') inStr = false;
    } else {
      if (ch === '"') inStr = true;
      else if (ch === '[') depth++;
      else if (ch === ']') {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(text.slice(begin, i + 1)); } catch { return []; }
        }
      }
    }
    i++;
  }
  return [];
}

type SenGroup = 'TLs' | 'Analistas & Sups' | 'Manager';

function senGroup(seniority: string): SenGroup | null {
  if (/team leader|sr team leader/i.test(seniority)) return 'TLs';
  if (/gerente/i.test(seniority)) return 'Manager';
  if (/analista|supervisor|asistente|coordinator|specialist/i.test(seniority)) return 'Analistas & Sups';
  return null;
}

const avg = (nums: number[]) =>
  nums.length ? Math.round(nums.reduce((s, n) => s + n, 0) / nums.length) : 0;

const pct = (n: number, total: number) =>
  total > 0 ? parseFloat(((n / total) * 100).toFixed(1)) : 0;

interface VagaAtiva   { seniority: string; step: string; aging: number; fora_sla: boolean; q: string; [k: string]: unknown }
interface VagaFechada { seniority: string; tto: number; fora_sla: boolean; q: string; [k: string]: unknown }
interface VagaPending { seniority: string; q: string; [k: string]: unknown }

// Quarter labels that should appear in the plan
const Q_ORDER = ['Q1', 'Q2', 'Q3', 'Q4'];

// Pipeline steps in funnel order (most advanced last)
const STEP_ORDER = [
  'Role Profiling', 'Sourcing', 'Entrevista TA', 'Entrevista HM',
  'Entrevista L+L', 'Worksample', 'Interview Panel', 'Reference Check', 'Offer extended',
];

function buildInsights(
  A: VagaAtiva[], P: VagaPending[],
  sla: HpSlaStats, porcentajeAvance: number, total: number,
): { highs: string[]; lows: string[]; actions: string[] } {
  const highs: string[] = [];
  const lows:  string[] = [];
  const actions: string[] = [];

  // HP %
  const expectedPct = (() => {
    const now = new Date();
    const monthsElapsed = now.getMonth() + 1 + now.getDate() / 31;
    return Math.min(100, parseFloat(((monthsElapsed / 12) * 100).toFixed(1)));
  })();

  if (porcentajeAvance >= expectedPct) {
    highs.push(`<strong>${porcentajeAvance.toFixed(1)}% de avanço no HP</strong> — acima do ritmo esperado para o período (${expectedPct.toFixed(0)}%)`);
  } else {
    lows.push(`<strong>${porcentajeAvance.toFixed(1)}% de avanço no HP</strong> — abaixo do ritmo esperado (${expectedPct.toFixed(0)}% esperado para o período)`);
    actions.push(`Revisar ritmo mensal de fechamentos — com ${porcentajeAvance.toFixed(1)}% em ~6 meses, calcular quantos fechamentos semanais são necessários para fechar o ano no plano`);
  }

  // Sin activar
  const sinActivarPct = pct(P.length, total);
  if (sinActivarPct > 15) {
    lows.push(`<strong>${P.length} vagas (${sinActivarPct}% do total) ainda não ativadas</strong> — principal gargalo do pipeline`);
    actions.push(`Priorizar ativação das ${P.length} vagas pendentes — vagas sem início consomem headcount planejado sem gerar fechamentos`);
  }

  // SLA ativas
  if (sla.ativasPct < 5) {
    highs.push(`Apenas <strong>${sla.ativasFora} vagas ativas (${sla.ativasPct}%) fora do SLA de 75 dias</strong> — pipeline saudável`);
  } else {
    lows.push(`<strong>${sla.ativasFora} vagas ativas (${sla.ativasPct}%) com mais de 75 dias em andamento</strong> — SLA máximo de ${Math.max(...A.map(r => r.aging))}d`);
    actions.push(`Acionar BP e liderança para revisão das ${sla.ativasFora} vagas ativas fora do SLA — priorizar desbloqueio das mais antigas`);
  }

  // SLA fechadas
  if (sla.fechadasPct > 10) {
    lows.push(`<strong>${sla.fechadasFora} vagas fechadas (${sla.fechadasPct}%) ultrapassaram 75 dias de TTO</strong> — TTO médio das ativas: ${sla.ativasAvgAging}d`);
  } else {
    highs.push(`<strong>${sla.fechadasPct}% das vagas fechadas dentro do SLA de 75 dias</strong> — TTO médio de ${sla.fechadasAvgTto}d`);
  }

  // Pipeline
  const ativaTotais = A.length;
  const roleProf = A.filter(r => r.step === 'Role Profiling').length;
  if (roleProf > 0 && ativaTotais > 0 && roleProf / ativaTotais > 0.3) {
    lows.push(`<strong>${roleProf} vagas (${pct(roleProf, ativaTotais)}%) em Role Profiling</strong> — concentração alta no início do funil`);
    actions.push(`Acelerar Role Profiling — vagas nessa etapa ainda não geraram candidatos; cada semana de atraso comprime o TTO disponível`);
  }

  if (actions.length === 0) {
    actions.push('Manter cadência atual de fechamentos e monitorar vagas ativas fora do SLA semanalmente');
  }

  return { highs: highs.slice(0, 4), lows: lows.slice(0, 5), actions: actions.slice(0, 4) };
}

export function parseHpHtmlReport(html: string, fileName: string): PdfData {
  const A  = extractJsonArray(html, 'A')  as VagaAtiva[];
  const CL = extractJsonArray(html, 'CL') as VagaFechada[];
  const P  = extractJsonArray(html, 'P')  as VagaPending[];
  const SB = extractJsonArray(html, 'SB') as VagaPending[];

  console.log('[HP HTML] A:', A.length, 'CL:', CL.length, 'P:', P.length, 'SB:', SB.length);

  const yearM = html.match(/atualiza[çc][aã]o[:\s]+\d{2}\/\d{2}\/(\d{4})/i);
  const year  = yearM ? yearM[1] : String(new Date().getFullYear());

  const total            = A.length + CL.length + P.length + SB.length;
  const cerradas         = CL.length;
  const onGoing          = A.length;
  const sinActivar       = P.length;
  const porcentajeAvance = pct(cerradas, total);

  // ── Layer rows ─────────────────────────────────────────────────────────────
  const GROUPS: SenGroup[] = ['TLs', 'Analistas & Sups', 'Manager'];
  const rows: HpLayerRow[] = GROUPS.map(grp => ({
    equipo:                'TTE BRASIL',
    agrupLayer:            grp,
    cerradas:              CL.filter(r => senGroup(r.seniority) === grp).length,
    sinActivar:            P.filter(r  => senGroup(r.seniority) === grp).length,
    onGoing:               A.filter(r  => senGroup(r.seniority) === grp).length,
    reemplazosProyectados: 0,
    rotacionesProyectadas: 0,
  }));

  // ── SLA ────────────────────────────────────────────────────────────────────
  const ativasFora  = A.filter(r => r.fora_sla).length;
  const fechadasFora = CL.filter(r => r.fora_sla).length;
  const sla: HpSlaStats = {
    ativasFora,
    ativasTotal:     A.length,
    ativasPct:       pct(ativasFora, A.length),
    ativasAvgAging:  avg(A.map(r => r.aging).filter(n => n > 0)),
    fechadasFora,
    fechadasTotal:   CL.length,
    fechadasPct:     pct(fechadasFora, CL.length),
    fechadasAvgTto:  avg(CL.map(r => r.tto).filter(n => n > 0)),
  };

  // ── Pipeline por etapa ─────────────────────────────────────────────────────
  const stepMap: Record<string, number> = {};
  for (const v of A) {
    if (v.step) stepMap[v.step] = (stepMap[v.step] ?? 0) + 1;
  }
  const pipeline: HpPipelineStep[] = STEP_ORDER
    .filter(s => stepMap[s])
    .map(s => ({ step: s, count: stepMap[s] }))
    .concat(
      Object.entries(stepMap)
        .filter(([s]) => !STEP_ORDER.includes(s))
        .map(([step, count]) => ({ step, count }))
    )
    .sort((a, b) => b.count - a.count);

  // ── Quarter breakdown ──────────────────────────────────────────────────────
  const allVagas = [...A, ...CL, ...P, ...SB] as Array<{ q: string }>;
  const quarters: HpQuarter[] = Q_ORDER.map(q => ({
    q,
    previstas: allVagas.filter(v => v.q === q).length,
    fechadas:  CL.filter(v => v.q === q).length,
  })).filter(r => r.previstas > 0);

  // ── Insights ───────────────────────────────────────────────────────────────
  const { highs, lows, actions } = buildInsights(A, P, sla, porcentajeAvance, total);

  // Store raw rows so DataPanel can filter by TA and recompute KPIs
  const hpRawRows: HpRawRow[] = [
    ...A.map(r => ({
      ta: (r.ta as string) || '',
      seniority: r.seniority,
      q: r.q,
      fora_sla: r.fora_sla,
      status: 'on going' as const,
      step: r.step as string | undefined,
      aging: r.aging,
    })),
    ...CL.map(r => ({
      ta: (r.ta as string) || '',
      seniority: r.seniority,
      q: r.q,
      fora_sla: r.fora_sla,
      status: 'done' as const,
      tto: r.tto,
    })),
    ...(P as Array<{ ta?: string; seniority: string; q: string }>).map(r => ({
      ta: r.ta || '',
      seniority: r.seniority,
      q: r.q,
      fora_sla: false,
      status: 'pending' as const,
    })),
    ...(SB as Array<{ ta?: string; seniority: string; q: string }>).map(r => ({
      ta: r.ta || '',
      seniority: r.seniority,
      q: r.q,
      fora_sla: false,
      status: 'stand by' as const,
    })),
  ];

  const hpPayload: HpPayload = {
    title: `Plan Shipping Individuales - ${year}`,
    year,
    posicionesTotal:       total,
    cerradas,
    onGoing,
    sinActivar,
    reemplazosProyectados: 0,
    operadoresProyectados: 0,
    totalRotations:        0,
    porcentajeAvance,
    rows,
    sla,
    pipeline,
    quarters,
    highs,
    lows,
    actions,
    hpRawRows,
  };

  return {
    respostas:   null,
    fav:         '—',
    desfav:      '—',
    dimensions:  [],
    comments:    [],
    filters:     {},
    overallRange: '',
    periodLabel: year,
    isHm:        false,
    fileName,
    isHp:        true,
    hpPayload,
  };
}
