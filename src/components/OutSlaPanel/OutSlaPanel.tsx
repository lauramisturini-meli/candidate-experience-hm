import { useMemo, useState } from 'react';
import { buildOutSlaInsights } from '../../lib/insights-outsla';
import { StatusBar } from '../StatusBar/StatusBar';
import { PdfPill } from '../PdfPill/PdfPill';
import type { PdfData, TabMeta, StatusMessage, OutSlaRow } from '../../types';
import s from './OutSlaPanel.module.css';

interface Props {
  meta: TabMeta;
  pdfs: PdfData[];
  status: StatusMessage | null | undefined;
  onUpload: () => void;
  onReset: () => void;
  onRemovePdf: (idx: number) => void;
  onShare: () => void;
  isShareLoading: boolean;
}

function count<T extends string>(rows: OutSlaRow[], key: keyof OutSlaRow): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const val = (row[key] as T) || 'Sem motivo';
    acc[val] = (acc[val] ?? 0) + 1;
    return acc;
  }, {});
}

function sortedEntries(map: Record<string, number>): [string, number][] {
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function toTitleCase(s: string): string {
  return s.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

function shortName(fullName: string): string {
  const parts = toTitleCase(fullName).split(' ');
  if (parts.length <= 2) return parts.join(' ');
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

interface BreakdownRowProps {
  label: string;
  value: number;
  total: number;
  colorClass: string;
}
function BreakdownRow({ label, value, total, colorClass }: BreakdownRowProps) {
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

const STAGE_COLOR: Record<string, string> = {
  'Entrevista HM':    s.barHM,
  'Entrevista TA':    s.barTA,
  'Entrevista L+L':   s.barLL,
  'Reference Check':  s.barRefCheck,
  'Interview Panel':  s.barInterview,
  'Role Profiling':   s.barRoleProfil,
  'Sourcing':         s.barSourcing,
};

const REASON_COLOR: Record<string, string> = {
  'Demoras Hiring Manager':     s.barReasonHM,
  'Perfil de Nicho':            s.barReasonNicho,
  'Cambio de perfil':           s.barReasonCambio,
  'Background check rejected':  s.barReasonBgc,
};

export function OutSlaPanel({ meta, pdfs, status, onUpload, onReset, onRemovePdf, onShare, isShareLoading }: Props) {
  const allRows = useMemo(
    () => pdfs.flatMap(p => p.outSlaPayload?.rows ?? []),
    [pdfs]
  );

  // ── TA filter ──────────────────────────────────────────────────────────────
  const taList = useMemo(() => {
    const set = new Set<string>();
    allRows.forEach(r => { if (r.ta) set.add(r.ta); });
    return Array.from(set).sort();
  }, [allRows]);

  // When exactly 1 TA is in the data, auto-select it (individual analysis mode)
  const isIndividual = taList.length === 1;

  const [selectedTa, setSelectedTa] = useState<string | null>(null);

  // Effective TA: explicit selection OR auto-individual
  const activeTa = selectedTa ?? (isIndividual ? taList[0] : null);

  const rows = useMemo(
    () => activeTa ? allRows.filter(r => r.ta === activeTa) : allRows,
    [allRows, activeTa]
  );

  // ── Per-TA summary (always uses allRows, not filtered) ─────────────────────
  const perTaStats = useMemo(() => {
    return taList.map(ta => {
      const taRows = allRows.filter(r => r.ta === ta);
      const n      = taRows.length;
      const avg    = n ? Math.round(taRows.reduce((acc, r) => acc + r.timeToOffer, 0) / n) : 0;
      const stageCounts = taRows.reduce<Record<string, number>>((acc, r) => {
        acc[r.stage] = (acc[r.stage] ?? 0) + 1;
        return acc;
      }, {});
      const topStage = Object.entries(stageCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
      return { ta, n, avg, topStage };
    });
  }, [taList, allRows]);

  // ── Stats from filtered rows ───────────────────────────────────────────────
  const insights = useMemo(() => buildOutSlaInsights(rows), [rows]);

  const total = rows.length;
  const avg   = total ? Math.round(rows.reduce((acc, r) => acc + r.timeToOffer, 0) / total) : 0;
  const max   = total ? Math.max(...rows.map(r => r.timeToOffer)) : 0;

  const byStage     = useMemo(() => sortedEntries(count(rows, 'stage')),    [rows]);
  const byReason    = useMemo(() => sortedEntries(count(rows.map(r => ({ ...r, offTimeReason: r.offTimeReason || 'Sem motivo' })) as OutSlaRow[], 'offTimeReason')), [rows]);
  const bySeniority = useMemo(() => sortedEntries(count(rows, 'seniority')), [rows]);
  const byOrigin    = useMemo(() => sortedEntries(count(rows, 'origin')),    [rows]);

  const periodLabel = pdfs[0]?.periodLabel ?? 'Out SLA';

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

      {/* TA filter — individual badge OR team chips */}
      {isIndividual && taList[0] ? (
        <div className={s.toolbarSub}>
          <span className={s.taIndividualBadge}>
            Análise Individual · {toTitleCase(taList[0])}
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
              onClick={() => setSelectedTa(activeTa === ta ? null : ta)}
              title={toTitleCase(ta)}
            >
              {shortName(ta)}
            </button>
          ))}
        </div>
      ) : null}

      {/* KPI row */}
      <div className={s.kpiRow}>
        <div className={`${s.kpiBox} ${s.kpiTotal}`}>
          <div className={s.kpiVal}>{total}</div>
          <div className={s.kpiLabel}>Total Out SLA{activeTa && !isIndividual ? ' (filtrado)' : ''}</div>
        </div>
        <div className={`${s.kpiBox} ${s.kpiAvg}`}>
          <div className={s.kpiVal}>{avg}</div>
          <div className={s.kpiLabel}>Média de Dias</div>
        </div>
        <div className={`${s.kpiBox} ${s.kpiMax}`}>
          <div className={s.kpiVal}>{max}</div>
          <div className={s.kpiLabel}>Maior SLA (dias)</div>
        </div>
        <div className={`${s.kpiBox} ${s.kpiReason}`}>
          <div className={s.kpiVal}>{rows.filter(r => r.offTimeReason).length}</div>
          <div className={s.kpiLabel}>Com Motivo Registrado</div>
        </div>
      </div>

      <div className={s.main}>
        {/* ── Left: per-TA summary + breakdowns ── */}
        <div className={s.colLeft}>

          {/* Per-TA breakdown table */}
          {perTaStats.length > 0 && (
            <div className={s.breakdownSection}>
              <div className={s.breakdownTitle}>Por TA</div>
              <div className={s.taTable}>
                <div className={s.taTableHeader}>
                  <span>TA</span>
                  <span>Vagas</span>
                  <span>Média</span>
                  <span>Etapa Principal</span>
                </div>
                {perTaStats.map(({ ta, n, avg: taAvg, topStage }) => (
                  <div
                    key={ta}
                    className={`${s.taTableRow} ${selectedTa === ta ? s.taTableRowActive : ''}`}
                    onClick={() => setSelectedTa(selectedTa === ta ? null : ta)}
                    title={toTitleCase(ta)}
                  >
                    <span className={s.taTableName}>{shortName(ta)}</span>
                    <span className={s.taTableStat}>{n}</span>
                    <span className={`${s.taTableStat} ${taAvg >= 90 ? s.taStatAlert : ''}`}>{taAvg}d</span>
                    <span className={s.taTableStage}>{topStage}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={s.breakdownSection}>
            <div className={s.breakdownTitle}>Por Etapa</div>
            {byStage.map(([label, val]) => (
              <BreakdownRow key={label} label={label} value={val} total={total}
                colorClass={STAGE_COLOR[label] ?? s.barDefault} />
            ))}
          </div>

          <div className={s.breakdownSection}>
            <div className={s.breakdownTitle}>Por Motivo</div>
            {byReason.map(([label, val]) => (
              <BreakdownRow key={label} label={label} value={val} total={total}
                colorClass={REASON_COLOR[label] ?? s.barDefault} />
            ))}
          </div>

          <div className={s.breakdownRow2}>
            <div className={s.breakdownSection}>
              <div className={s.breakdownTitle}>Por Senioridade</div>
              {bySeniority.map(([label, val]) => (
                <BreakdownRow key={label} label={label} value={val} total={total}
                  colorClass={s.barSeniority} />
              ))}
            </div>

            <div className={s.breakdownSection}>
              <div className={s.breakdownTitle}>Por Origem</div>
              {byOrigin.map(([label, val]) => (
                <BreakdownRow key={label} label={label} value={val} total={total}
                  colorClass={label === 'New Position' ? s.barNew : s.barReplacement} />
              ))}
            </div>
          </div>

        </div>

        {/* ── Right: insights ── */}
        <div className={s.colRight}>
          {activeTa && !isIndividual && (
            <div className={s.taActiveTag}>
              Análise: <strong>{toTitleCase(activeTa)}</strong>
            </div>
          )}
          <div>
            <div className={`${s.insightTitle} ${s.highs}`}>Highs</div>
            <ul className={`${s.insightList} ${s.highsList}`}>
              {insights.highs.map((h, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: h }} />
              ))}
            </ul>
          </div>
          <div>
            <div className={`${s.insightTitle} ${s.lows}`}>Lows</div>
            <ul className={`${s.insightList} ${s.lowsList}`}>
              {insights.lows.map((l, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: l }} />
              ))}
            </ul>
          </div>
          <div>
            <div className={`${s.insightTitle} ${s.actions}`}>Actions</div>
            <ul className={`${s.insightList} ${s.actionsList}`}>
              {insights.actions.map((a, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: a }} />
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className={s.footer}>
        <div className={s.footerText}>{meta.section} · TA Transportes Brasil · {periodLabel}</div>
      </div>
    </>
  );
}
