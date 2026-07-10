import { useMemo, useState, useCallback } from 'react';
import { buildTonhInsights } from '../../lib/insights-tonh';
import { StatusBar } from '../StatusBar/StatusBar';
import { PdfPill } from '../PdfPill/PdfPill';
import type { PdfData, TabMeta, StatusMessage, TonhCase, TonhLayerDashboard, TabUiState } from '../../types';
import s from './TonhPanel.module.css';

interface Props {
  meta: TabMeta;
  pdfs: PdfData[];
  ui?: TabUiState;
  status: StatusMessage | null | undefined;
  onUpload: () => void;
  onReset: () => void;
  onRemovePdf: (idx: number) => void;
  onShare: () => void;
  isShareLoading: boolean;
  onUiChange: (ui: Partial<TabUiState>) => void;
}

// ── TA name helpers ───────────────────────────────────────────────────────────

const PREPS_TONH = new Set(['da', 'de', 'do', 'dos', 'das', 'e']);
function toTitleCaseTN(s: string): string {
  return s.split(' ').map(w =>
    PREPS_TONH.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join(' ');
}
function shortNameTN(fullName: string): string {
  const parts = toTitleCaseTN(fullName).split(' ');
  if (parts.length <= 2) return parts.join(' ');
  let lastIdx = parts.length - 1;
  while (lastIdx > 0 && PREPS_TONH.has(parts[lastIdx].toLowerCase())) lastIdx--;
  return `${parts[0]} ${parts[lastIdx]}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, number> {
  return arr.reduce<Record<string, number>>((acc, item) => {
    const k = key(item) || '(não informado)';
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

function sortedEntries(map: Record<string, number>): [string, number][] {
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
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

  // Extended to catch "proposta financeira", "contra proposta", "ganhar mais" (e.g. Lucas, Luiz cases)
  if (/(proposta|oferta|oportunidade|remoto|remote).{0,40}(salar|remuner|cargo|emprego|trabalho|remoto|remote)|(salário|remuneração).{0,30}(maior|superior|melhor|mais\s+atrat|acima)|trainee|aumento\s+salarial|100%\s*remoto|proposta\s+financeira|contra[- ]?proposta|ganhar\s+(?:um\s+pouco\s+)?mais/i.test(t))
    return 'Proposta com Maior Remuneração';

  // Check explicit adaptação signals before family keywords to prevent false positives
  // (e.g. "familiar" mentioned speculatively alongside adaptation as the stated reason)
  if (/n[aã]o\s+(?:se\s+)?adapt|dificuldade\s+de\s+adapt|adapta[çc][aã]o\s+a[oa]?\s+(?:rotina|modelo|lideran[çc]|turno)|terceiro\s+turno|\bt3\b/i.test(t))
    return 'Adaptação a Rotina/Liderança';

  if (/motivo\s+pessoal|questão\s+pessoal|problema\s+pessoal|saúde|doença|cirurgia|família|familiar|esposa|marido|filho[sa]?\b|mãe\b|\bpai\b|\bpais\b|mudança\s+de\s+cidad|morar\s+(próximo|perto)/i.test(t))
    return 'Temas Familiares/Pessoais';

  return 'Adaptação a Rotina/Liderança';
}

const LAYER_ORDER = [
  'Analista', 'Analista Ssr', 'Analista Sr',
  'Team Leader', 'Team Leader Sr', 'Supervisor', 'Coordenador', 'Gerente',
];

function normalizeLayer(rol: string): string {
  const r = rol.toLowerCase();
  if (/team\s*leader\s+sr\b|\btl\s+sr\b|\bsr\s+team\s*leader\b/.test(r)) return 'Team Leader Sr';
  if (/team\s*leader|\btl\b/.test(r))                  return 'Team Leader';
  if (/coordena[çc]|coordenador/i.test(r))             return 'Coordenador';
  if (/supervis/i.test(r))                             return 'Supervisor';
  if (/gerente|ger[eê]ncia|manager/i.test(r))          return 'Gerente';
  if (/\bssr\b|semi\s*s[eê]nior/.test(r))              return 'Analista Ssr';
  if (/\bsr\b/.test(r))                                return 'Analista Sr';
  if (/analista|analyst/i.test(r))                     return 'Analista';
  return rol || '(não informado)';
}

function layerEntries(map: Record<string, number>): [string, number][] {
  return Object.entries(map).sort((a, b) => {
    const ai = LAYER_ORDER.indexOf(a[0]);
    const bi = LAYER_ORDER.indexOf(b[0]);
    if (ai === -1 && bi === -1) return b[1] - a[1];
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

// ── Breakdown row (same style as OutSlaPanel) ─────────────────────────────────

function BreakdownRow({ label, value, total, colorClass }: { label: string; value: number; total: number; colorClass: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className={s.bRow}>
      <div className={s.bLabel}>{label}</div>
      <div className={s.bBarWrap}>
        <div className={`${s.bBar} ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      <div className={s.bCount}>{value}</div>
      <div className={s.bPct}>{pct}%</div>
    </div>
  );
}

// ── Dashboard card ────────────────────────────────────────────────────────────

function MetaBadge({ value, meta }: { value: number | null; meta: number }) {
  if (value === null) return null;
  const ok = value <= meta;
  return (
    <span className={ok ? s.badgeOk : s.badgeBad}>
      {ok ? '▼' : '▲'} Meta {meta}%
    </span>
  );
}

function DashCard({ dash }: { dash: TonhLayerDashboard }) {
  const label = dash.layerGroup === 'team-leader' ? 'Team Leader + TL Sr' : 'Demais Layers';
  const acima = (v: number | null) => v !== null && v > dash.meta;

  return (
    <div className={s.dashCard}>
      <div className={s.dashCardHeader}>
        <span className={s.dashCardLabel}>{label}</span>
        <span className={s.dashCardMeta}>Meta anual: <strong>{dash.meta}%</strong></span>
      </div>

      <div className={s.dashKpiGrid}>
        <div className={s.dashKpi}>
          <div className={`${s.dashKpiVal} ${acima(dash.toOverallYtdPct) ? s.bad : s.ok}`}>
            {dash.toOverallYtdPct !== null ? `${dash.toOverallYtdPct}%` : '—'}
          </div>
          <div className={s.dashKpiLabel}>TO YTD</div>
          <MetaBadge value={dash.toOverallYtdPct} meta={dash.meta} />
        </div>

        <div className={s.dashKpi}>
          <div className={`${s.dashKpiVal} ${acima(dash.toOverall12mPct) ? s.bad : s.ok}`}>
            {dash.toOverall12mPct !== null ? `${dash.toOverall12mPct}%` : '—'}
          </div>
          <div className={s.dashKpiLabel}>TO 12 Meses</div>
          <MetaBadge value={dash.toOverall12mPct} meta={dash.meta} />
        </div>

        <div className={s.dashKpi}>
          <div className={s.dashKpiValNeutral}>
            {dash.overallYtd !== null ? dash.overallYtd : '—'}
          </div>
          <div className={s.dashKpiLabel}>Saídas YTD</div>
        </div>

        <div className={s.dashKpi}>
          <div className={s.dashKpiValNeutral}>
            {dash.hcPromedioYtd !== null ? dash.hcPromedioYtd : '—'}
          </div>
          <div className={s.dashKpiLabel}>HC Prom. YTD</div>
        </div>
      </div>

      {dash.porSeniority.length > 0 && (
        <div className={s.seniorityList}>
          <div className={s.seniorityTitle}>Por Senioridade (1M)</div>
          {[...dash.porSeniority]
            .sort((a, b) => b.pct - a.pct)
            .map(({ seniority, pct }) => (
              <div key={seniority} className={s.seniorityRow}>
                <span className={s.seniorityLabel}>{seniority}</span>
                <div className={s.seniorityBarWrap}>
                  <div
                    className={`${s.seniorityBar} ${pct > dash.meta ? s.seniorityBarBad : s.seniorityBarOk}`}
                    style={{ width: `${Math.min(pct * 4, 100)}%` }}
                  />
                </div>
                <span className={`${s.seniorityPct} ${pct > dash.meta ? s.bad : s.ok}`}>{pct}%</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ── Case aggregate analysis ───────────────────────────────────────────────────

type TimeBucket = '≤ 1 mês' | '2–3 meses' | '4–6 meses' | '> 6 meses' | 'N/A';

function timeBucket(meses: number | null): TimeBucket {
  if (meses === null) return 'N/A';
  if (meses <= 1) return '≤ 1 mês';
  if (meses <= 3) return '2–3 meses';
  if (meses <= 6) return '4–6 meses';
  return '> 6 meses';
}

function hasRealFlag(flags: string): boolean {
  const f = flags.trim().toLowerCase();
  if (f.length < 8) return false;
  if (['detallar', 'n/a', 'na', '-'].includes(f)) return false;
  if (/acuerdos?\s+y\s+next|next\s+steps?|conclusi[oó]n|template|facilitaci[oó]n/i.test(f)) return false;
  return true;
}

function cleanArea(area: string): string {
  return area
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/^[A-Z0-9]+_[A-Z0-9]+-\s*/g, '')
    .replace(/\s+(?:BR[A-Z0-9]+|[A-Z]{2,4}[0-9]+)$/g, '')
    .trim();
}

function CaseAnalysis({ cases }: { cases: TonhCase[] }) {
  const total = cases.length;
  const withFlags = cases.filter(c => hasRealFlag(c.flags)).length;
  const casesWithTime = cases.filter(c => c.tiempoEnRolMeses !== null);
  const avgMeses = casesWithTime.length
    ? Math.round(casesWithTime.reduce((s, c) => s + (c.tiempoEnRolMeses ?? 0), 0) / casesWithTime.length)
    : null;

  const byMotivo  = sortedEntries(groupBy(cases, c => classifyExitMotivo(c.motivoSalida, c.principaisMotivos)));
  const byArea    = sortedEntries(groupBy(cases, c => cleanArea(c.area)));
  const byRol     = layerEntries(groupBy(cases, c => normalizeLayer(c.rol.trim())));
  const byTempo   = sortedEntries(groupBy(cases, c => timeBucket(c.tiempoEnRolMeses)));

  // Team-level analytical learnings
  const learnings: string[] = [];

  // Exit reason concentration — using macro categories
  const motivoCatMap: Record<string, number> = {};
  for (const c of cases) {
    const cat = classifyExitMotivo(c.motivoSalida, c.principaisMotivos);
    motivoCatMap[cat] = (motivoCatMap[cat] ?? 0) + 1;
  }
  const topMotivos = Object.entries(motivoCatMap).sort((a, b) => b[1] - a[1]);
  if (topMotivos.length > 0) {
    const [topCat, topCount] = topMotivos[0];
    const pct = Math.round((topCount / total) * 100);
    if (pct >= 30) {
      learnings.push(`<strong>${pct}%</strong> das saídas classificadas como <strong>${topCat}</strong>`);
    }
  }

  // Early exits
  const casesWithTimeAll = cases.filter(c => c.tiempoEnRolMeses !== null);
  if (casesWithTimeAll.length > 0) {
    const early = casesWithTimeAll.filter(c => (c.tiempoEnRolMeses ?? 0) <= 3).length;
    const earlyPct = Math.round((early / casesWithTimeAll.length) * 100);
    if (earlyPct > 0) {
      learnings.push(`<strong>${earlyPct}%</strong> das saídas ocorreram em até 3 meses — anteriores ao fim do acompanhamento, o que aponta para desalinhamento na contratação`);
    }
  }

  // Flag concentration
  const flagCount = cases.filter(c => hasRealFlag(c.flags)).length;
  if (flagCount > 0) {
    const flagPct = Math.round((flagCount / total) * 100);
    learnings.push(`<strong>${flagPct}%</strong> dos desligados (${flagCount} de ${total}) tinham flags não bloqueantes no processo seletivo`);
  }

  // Area concentration
  const areaMap2: Record<string, number> = {};
  for (const c of cases) { const a = cleanArea(c.area); if (a) areaMap2[a] = (areaMap2[a] ?? 0) + 1; }
  const topArea = Object.entries(areaMap2).sort((a, b) => b[1] - a[1])[0];
  if (topArea && total > 1) {
    const areaPct = Math.round((topArea[1] / total) * 100);
    if (areaPct >= 40) {
      learnings.push(`<strong>${areaPct}%</strong> das saídas concentradas em <strong>${topArea[0]}</strong>`);
    }
  }

  // Layer/role pattern
  const rolMap: Record<string, number> = {};
  for (const c of cases) { const r = normalizeLayer(c.rol.trim()); if (r) rolMap[r] = (rolMap[r] ?? 0) + 1; }
  const topRol = Object.entries(rolMap).sort((a, b) => b[1] - a[1])[0];
  if (topRol && topRol[1] > 1) {
    learnings.push(`Layer <strong>${topRol[0]}</strong> com maior frequência de saída (${topRol[1]} casos)`);
  }

  return (
    <div className={s.analysisWrap}>
      {/* Summary stats */}
      <div className={s.summaryRow}>
        <div className={s.summaryChip}>
          <span className={s.summaryVal}>{total}</span>
          <span className={s.summaryLbl}>casos analisados</span>
        </div>
        {withFlags > 0 && (
          <div className={`${s.summaryChip} ${s.summaryChipDanger}`}>
            <span className={s.summaryVal}>{withFlags}</span>
            <span className={s.summaryLbl}>com flags na contratação</span>
          </div>
        )}
        {avgMeses !== null && (
          <div className={s.summaryChip}>
            <span className={s.summaryVal}>{avgMeses} {avgMeses === 1 ? 'mês' : 'meses'}</span>
            <span className={s.summaryLbl}>tempo médio no cargo</span>
          </div>
        )}
      </div>

      {/* Por Motivo de Saída — breakdown by macro category */}
      {byMotivo.length > 0 && (
        <div className={s.breakdown}>
          <div className={s.breakdownTitle}>Por Motivo de Saída</div>
          {byMotivo.map(([label, val]) => (
            <BreakdownRow key={label} label={label} value={val} total={total} colorClass={s.barMotivo} />
          ))}
        </div>
      )}

      {/* By area and rol side-by-side */}
      <div className={s.breakdownRow2}>
        {byArea.length > 0 && (
          <div className={s.breakdown}>
            <div className={s.breakdownTitle}>Por Localidade</div>
            {byArea.map(([label, val]) => (
              <BreakdownRow key={label} label={label} value={val} total={total} colorClass={s.barArea} />
            ))}
          </div>
        )}
        {byRol.length > 0 && (
          <div className={s.breakdown}>
            <div className={s.breakdownTitle}>Por Layer</div>
            {byRol.map(([label, val]) => (
              <BreakdownRow key={label} label={label} value={val} total={total} colorClass={s.barRol} />
            ))}
          </div>
        )}
      </div>

      {/* Time in role */}
      {byTempo.length > 0 && (
        <div className={s.breakdown}>
          <div className={s.breakdownTitle}>Tempo no Cargo</div>
          {byTempo.filter(([k]) => k !== 'N/A').map(([label, val]) => (
            <BreakdownRow key={label} label={label} value={val} total={casesWithTime.length || total} colorClass={s.barTempo} />
          ))}
        </div>
      )}

      {/* Key learnings */}
      {learnings.length > 0 && (
        <div className={s.breakdown}>
          <div className={s.breakdownTitle}>Principais Learnings e Next Steps</div>
          <ul className={s.learningList}>
            {learnings.map((l, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: l }} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── TO Goal Block ─────────────────────────────────────────────────────────────

function ToGoalBlock({ label, meta, value, onChange }: { label: string; meta: number; value: string; onChange: (v: string) => void }) {
  const current = value.trim() ? (parseFloat(value.replace(',', '.')) || null) : null;
  const scale   = meta * 1.5;
  const ok      = current !== null && current <= meta;
  const fill    = current !== null ? Math.min((current / scale) * 100, 100) : 0;
  const metaMark = (meta / scale) * 100;
  const gap     = current !== null ? Math.abs(meta - current).toFixed(1).replace('.', ',') : null;

  return (
    <div className={s.toGoalBlock}>
      <div className={s.toGoalTopRow}>
        <span className={s.toGoalTitle}>Meta TO NH — {label}</span>
        <span className={s.toGoalMetaTag}>Meta: {meta}%</span>
      </div>

      {current === null ? (
        <div className={s.toGoalEmpty}>
          <span className={s.toGoalEmptyLabel}>% TO atual (do dashboard)</span>
          <div className={s.toGoalEmptyRow}>
            <input
              className={s.toGoalInputBig}
              type="text"
              placeholder="ex: 8,5"
              value={value}
              onChange={e => onChange(e.target.value)}
            />
            <span className={s.toGoalEmptyUnit}>%</span>
          </div>
        </div>
      ) : (
        <div className={s.toGoalBody}>
          <div className={s.toGoalLeft}>
            <span className={`${s.toGoalBigNum} ${ok ? s.toGoalOkNum : s.toGoalBadNum}`}>
              {current.toLocaleString('pt-BR')}%
            </span>
            <span className={s.toGoalBigLabel}>TO atual</span>
            <input
              className={s.toGoalInput}
              type="text"
              value={value}
              onChange={e => onChange(e.target.value)}
            />
          </div>
          <div className={s.toGoalRight}>
            <div className={s.toGoalBarWrap}>
              <div className={s.toGoalBarTrack}>
                <div
                  className={ok ? s.toGoalFillOk : s.toGoalFillBad}
                  style={{ width: `${fill}%` }}
                />
                <div className={s.toGoalMetaMark} style={{ left: `${metaMark}%` }} />
              </div>
              <div className={s.toGoalBarLabels}>
                <span>0%</span><span>{meta}%</span><span>{scale}%</span>
              </div>
            </div>
            <div className={ok ? s.toGoalGapOk : s.toGoalGapAlert}>
              {ok
                ? `✓ ${gap}% dentro da meta`
                : `${gap}% acima da meta`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function TonhPanel({ meta, pdfs, ui, status, onUpload, onReset, onRemovePdf, onShare, isShareLoading, onUiChange }: Props) {
  const cases = useMemo(
    () => pdfs.flatMap(p => p.tonhCases ?? []),
    [pdfs],
  );

  // ── TA filter ────────────────────────────────────────────────────────────────
  const taList = useMemo(() => {
    const set = new Set<string>();
    cases.forEach(c => { if (c.ta) set.add(c.ta); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [cases]);

  const isIndividualTA = taList.length === 1;
  const [selectedTa, setSelectedTa] = useState<string | null>(null);
  const activeTa = selectedTa ?? (isIndividualTA ? taList[0] : null);
  const toggleTa = useCallback((ta: string) => setSelectedTa(prev => prev === ta ? null : ta), []);

  const filteredCases = useMemo(
    () => activeTa ? cases.filter(c => c.ta === activeTa) : cases,
    [cases, activeTa],
  );

  const tlDashboard = useMemo(
    () => pdfs.find(p => p.tonhDashboard?.layerGroup === 'team-leader')?.tonhDashboard,
    [pdfs],
  );

  const outrosDashboard = useMemo(
    () => pdfs.find(p => p.tonhDashboard?.layerGroup === 'outros')?.tonhDashboard,
    [pdfs],
  );

  const insights = useMemo(
    () => buildTonhInsights(filteredCases, tlDashboard, outrosDashboard),
    [filteredCases, tlDashboard, outrosDashboard],
  );

  const hasDashboard = tlDashboard !== undefined || outrosDashboard !== undefined;

  return (
    <>
      <StatusBar status={status} />
      <div className={s.sectionTag}>{meta.section}</div>

      <div className={s.toolbar}>
        <div className={s.pillList}>
          {pdfs.map((pdf, i) => (
            <PdfPill key={i} pdf={pdf} index={i} onRemove={onRemovePdf} />
          ))}
        </div>
        <div className={s.btnGroup}>
          <button className={`${s.uploadBtn} ${s.secondary}`} onClick={onReset}>↺ Resetar</button>
          <button className={`${s.uploadBtn} ${s.secondary}`} onClick={onShare} disabled={isShareLoading}>
            🔗 Copiar link
          </button>
          <button className={s.uploadBtn} onClick={onUpload}>⬆ Adicionar arquivo</button>
        </div>
      </div>
      {isIndividualTA && taList[0] ? (
        <div className={s.toolbarSub}>
          <span className={s.taIndividualBadge}>
            Análise Individual · {toTitleCaseTN(taList[0])}
          </span>
        </div>
      ) : taList.length > 1 ? (
        <div className={s.toolbarSub}>
          <span className={s.taFilterLabel}>Filtrar por TA</span>
          <button
            className={`${s.taChip} ${activeTa === null ? s.taChipActive : ''}`}
            onClick={() => setSelectedTa(null)}
          >
            Todos
          </button>
          {taList.map(ta => (
            <button
              key={ta}
              className={`${s.taChip} ${activeTa === ta ? s.taChipActive : ''}`}
              onClick={() => toggleTa(ta)}
              title={toTitleCaseTN(ta)}
            >
              {shortNameTN(ta)}
            </button>
          ))}
        </div>
      ) : (
        <div className={s.toolbarSub} />
      )}

      <div className={s.hintRow}>
        <span className={s.hintText}>
          Faça upload do PDF de <strong>Exit Discussion New Hires</strong> para análise dos casos de saída — motivos, flags, tempo no cargo e learnings são extraídos automaticamente.
        </span>
        {cases.length === 0 && (
          <span className={s.hintTextSub}>
            Você pode fazer o upload de múltiplos PDFs para consolidar casos do time, ou subir individualmente por TA para análise individual.
          </span>
        )}
      </div>

      {/* ── Metas de TO NH ── */}
      <div className={s.toGoalRow}>
        <ToGoalBlock label="TL's" meta={12} value={ui?.metaTl ?? ''} onChange={v => onUiChange({ metaTl: v })} />
        <ToGoalBlock label="Demais Layers" meta={5} value={ui?.metaDemais ?? ''} onChange={v => onUiChange({ metaDemais: v })} />
      </div>

      {/* ── Dashboard section ── */}
      {hasDashboard && (
        <div className={s.dashSection}>
          <div className={s.dashSectionTitle}>Dashboard · Turnover Overall</div>
          <div className={s.dashCards}>
            {tlDashboard     && <DashCard dash={tlDashboard} />}
            {outrosDashboard && <DashCard dash={outrosDashboard} />}
          </div>
        </div>
      )}

      {/* ── Main two-column area ── */}
      <div className={s.main}>
        <div className={s.colLeft}>
          {filteredCases.length > 0 ? (
            <>
              <div className={s.colTitle}>
                Análise · Exit Discussions <span className={s.colCount}>{filteredCases.length}</span>
                {activeTa && <span className={s.taActiveTag}>· {shortNameTN(activeTa)}</span>}
              </div>
              <CaseAnalysis cases={filteredCases} />
            </>
          ) : (
            <div className={s.emptyHint}>
              Nenhum PDF de exit discussion carregado ainda.
            </div>
          )}
        </div>

        <div className={s.colRight}>
          {insights.highs.length > 0 && (
            <div>
              <div className={`${s.insightTitle} ${s.highs}`}>Highs</div>
              <ul className={`${s.insightList} ${s.highsList}`}>
                {insights.highs.map((h, i) => (
                  <li key={i} dangerouslySetInnerHTML={{ __html: h }} />
                ))}
              </ul>
            </div>
          )}
          {insights.lows.length > 0 && (
            <div>
              <div className={`${s.insightTitle} ${s.lows}`}>Lows</div>
              <ul className={`${s.insightList} ${s.lowsList}`}>
                {insights.lows.map((l, i) => (
                  <li key={i} dangerouslySetInnerHTML={{ __html: l }} />
                ))}
              </ul>
            </div>
          )}
          {insights.actions.length > 0 && (
            <div>
              <div className={`${s.insightTitle} ${s.actions}`}>Actions</div>
              <ul className={`${s.insightList} ${s.actionsList}`}>
                {insights.actions.map((a, i) => (
                  <li key={i} dangerouslySetInnerHTML={{ __html: a }} />
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className={s.footer}>
        <div className={s.footerText}>{meta.section} · TA Transportes Brasil</div>
      </div>
    </>
  );
}
