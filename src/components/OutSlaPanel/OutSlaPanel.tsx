import { useMemo } from 'react';
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
  'Entrevista HM':  s.barHM,
  'Entrevista TA':  s.barTA,
  'Reference Check': s.barRefCheck,
  'Sourcing':       s.barSourcing,
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

  const insights = useMemo(() => buildOutSlaInsights(allRows), [allRows]);

  const total = allRows.length;
  const avg   = total ? Math.round(allRows.reduce((s, r) => s + r.timeToOffer, 0) / total) : 0;
  const max   = total ? Math.max(...allRows.map(r => r.timeToOffer)) : 0;

  const byStage     = useMemo(() => sortedEntries(count(allRows, 'stage')),    [allRows]);
  const byReason    = useMemo(() => sortedEntries(count(allRows.map(r => ({ ...r, offTimeReason: r.offTimeReason || 'Sem motivo' })) as OutSlaRow[], 'offTimeReason')), [allRows]);
  const bySeniority = useMemo(() => sortedEntries(count(allRows, 'seniority')), [allRows]);
  const byOrigin    = useMemo(() => sortedEntries(count(allRows, 'origin')),    [allRows]);

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
      <div className={s.toolbarSub}>
      </div>

      {/* KPI row */}
      <div className={s.kpiRow}>
        <div className={`${s.kpiBox} ${s.kpiTotal}`}>
          <div className={s.kpiVal}>{total}</div>
          <div className={s.kpiLabel}>Total Out SLA</div>
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
          <div className={s.kpiVal}>{allRows.filter(r => r.offTimeReason).length}</div>
          <div className={s.kpiLabel}>Com Motivo Registrado</div>
        </div>
      </div>

      <div className={s.main}>
        {/* ── Left: breakdowns ── */}
        <div className={s.colLeft}>

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
