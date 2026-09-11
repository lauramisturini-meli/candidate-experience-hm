import { useMemo, useState } from 'react';
import { buildOutSlaInsights } from '../../lib/insights-outsla';
import { canonicalizeTa, TEAM_TAS } from '../../lib/ta-team';
import { SENIORITY_SLA_TARGETS, getOfficialSlaDays, getSenioritySlaTarget, isClosedOutSlaRow, isOutOfSla } from '../../lib/outsla-sla';
import { StatusBar } from '../StatusBar/StatusBar';
import type { PdfData, TabMeta, StatusMessage, OutSlaRow } from '../../types';
import s from './OutSlaPanel.module.css';

interface Props {
  meta: TabMeta;
  pdfs: PdfData[];
  status: StatusMessage | null | undefined;
  onUpload: () => void;
  onReset: () => void;
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

const PREPS = new Set(['da', 'de', 'do', 'dos', 'das', 'e', 'della', 'di']);

function toTitleCase(s: string): string {
  return s.split(' ').map(w =>
    PREPS.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join(' ');
}

// First name + last non-preposition word — keeps both distinct and readable
function shortName(fullName: string): string {
  const parts = toTitleCase(fullName).split(' ');
  if (parts.length <= 2) return parts.join(' ');
  let lastIdx = parts.length - 1;
  while (lastIdx > 0 && PREPS.has(parts[lastIdx].toLowerCase())) lastIdx--;
  return `${parts[0]} ${parts[lastIdx]}`;
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

const STATUS_LABEL: Record<string, string> = {
  'on going': 'Em andamento',
  'done':     'Concluída',
  'stand by': 'Stand by',
};

const STATUS_ORDER: Record<string, number> = {
  done: 0,
  'on going': 1,
  'stand by': 2,
  pending: 3,
};

function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? toTitleCase(status);
}

type ChallengeItem = { row: OutSlaRow; target: NonNullable<ReturnType<typeof getSenioritySlaTarget>> };

function sortChallengeItems(items: ChallengeItem[], urgency: 'risk' | 'overdue'): ChallengeItem[] {
  return [...items].sort((a, b) => {
    // Active vacancies need intervention first; within that group, show the
    // closest-to-breach (yellow) or furthest-over-target (red) item first.
    const activityDiff = Number(isClosedOutSlaRow(a.row)) - Number(isClosedOutSlaRow(b.row));
    if (activityDiff) return activityDiff;
    const aDelta = a.row.timeToOffer - a.target.challengeDays;
    const bDelta = b.row.timeToOffer - b.target.challengeDays;
    return urgency === 'risk' ? bDelta - aDelta : bDelta - aDelta;
  });
}

export function OutSlaPanel({ meta, pdfs, status, onUpload, onReset, onShare, isShareLoading }: Props) {
  const rawRows = useMemo(
    () => pdfs.flatMap(p => p.outSlaPayload?.rows ?? []),
    [pdfs]
  );
  // Every vaga past the SLA threshold — open, stand by, or already closed.
  const slaRows = useMemo(
    () => rawRows.filter(r => isOutOfSla(r.timeToOffer, getOfficialSlaDays(r.seniority))),
    [rawRows]
  );

  // ── TA filter (canonical names) ────────────────────────────────────────────
  const taList = useMemo(() => {
    const set = new Set<string>();
    slaRows.forEach(r => { if (r.ta) set.add(canonicalizeTa(r.ta)); });
    return Array.from(set)
      .filter(name => TEAM_TAS.includes(name))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [slaRows]);

  const isIndividual = taList.length === 1;
  const [selectedTa, setSelectedTa] = useState<string | null>(null);
  const activeTa = selectedTa ?? (isIndividual ? taList[0] : null);

  const rows = useMemo(
    () => activeTa ? slaRows.filter(r => r.ta && canonicalizeTa(r.ta) === activeTa) : slaRows,
    [slaRows, activeTa]
  );
  const openRows   = useMemo(() => rows.filter(r => !isClosedOutSlaRow(r)), [rows]);
  const closedRows = useMemo(() => rows.filter(r =>  isClosedOutSlaRow(r)), [rows]);

  // ── Per-TA summary (always uses the full sla cohort, not filtered by selection) ───────────
  const perTaStats = useMemo(() => {
    return taList.map(ta => {
      const taRows       = slaRows.filter(r => r.ta && canonicalizeTa(r.ta) === ta);
      const taOpenRows   = taRows.filter(r => !isClosedOutSlaRow(r));
      const n            = taRows.length;
      const avg          = n ? Math.round(taRows.reduce((acc, r) => acc + r.timeToOffer, 0) / n) : 0;
      const stageCounts = taOpenRows.reduce<Record<string, number>>((acc, r) => {
        acc[r.stage] = (acc[r.stage] ?? 0) + 1;
        return acc;
      }, {});
      const topStage = Object.entries(stageCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
        ?? (n > 0 ? 'Todas concluídas' : '—');
      return { ta, n, openCount: taOpenRows.length, avg, topStage };
    });
  }, [taList, slaRows]);

  // ── Stats from filtered rows ───────────────────────────────────────────────
  const insights = useMemo(() => buildOutSlaInsights(rows), [rows]);

  const total = rows.length;
  const avg   = total ? Math.round(rows.reduce((acc, r) => acc + r.timeToOffer, 0) / total) : 0;

  const byStage     = useMemo(() => sortedEntries(count(rows, 'stage')),    [rows]);
  const byReason    = useMemo(() => sortedEntries(count(rows.map(r => ({ ...r, offTimeReason: r.offTimeReason || 'Sem motivo' })) as OutSlaRow[], 'offTimeReason')), [rows]);
  const bySeniority = useMemo(() => sortedEntries(count(rows, 'seniority')), [rows]);
  const byOrigin    = useMemo(() => sortedEntries(count(rows, 'origin')),    [rows]);

  // Raw `status` column mix for the sla cohort in view — cross-checks against the stage-based
  // open/closed KPIs above. Only shown when it mixes values (a mismatch here, e.g. "done" with an
  // active stage, usually means the status column was filled in wrong when the sheet was compiled).
  const byStatus = useMemo(() => Object.entries(
    rows.reduce<Record<string, number>>((acc, r) => {
      const val = r.status || 'on going';
      acc[val] = (acc[val] ?? 0) + 1;
      return acc;
    }, {})
  ).sort(([a], [b]) => (STATUS_ORDER[a] ?? 99) - (STATUS_ORDER[b] ?? 99) || a.localeCompare(b)), [rows]);
  const showStatusBreakdown = byStatus.length > 1;

  // How many vagas in the raw upload (for the active TA, if filtered) never crossed the SLA
  // threshold at all — shown so the KPI cards' scope against the full file is never a mystery.
  const rawCountInView = useMemo(
    () => (activeTa ? rawRows.filter(r => r.ta && canonicalizeTa(r.ta) === activeTa) : rawRows).length,
    [rawRows, activeTa]
  );
  const withinSlaCount = rawCountInView - total;

  // The challenge view deliberately uses every vacancy in scope, including ones
  // below 75 days. It gives the team time to act before the formal SLA is missed.
  const challengeRows = useMemo(
    () => (activeTa ? rawRows.filter(r => r.ta && canonicalizeTa(r.ta) === activeTa) : rawRows)
      .map(row => ({ row, target: getSenioritySlaTarget(row.seniority) }))
      .filter((item): item is { row: OutSlaRow; target: NonNullable<ReturnType<typeof getSenioritySlaTarget>> } => item.target !== null),
    [rawRows, activeTa]
  );
  const challengeOverdue = challengeRows.filter(({ row, target }) => row.timeToOffer > target.challengeDays);
  const challengeAtRisk = challengeRows.filter(({ row, target }) =>
    row.timeToOffer <= target.challengeDays && row.timeToOffer > target.challengeDays - 10
  );
  const challengeOnTargetPct = challengeRows.length
    ? Math.round(((challengeRows.length - challengeOverdue.length) / challengeRows.length) * 100)
    : 0;
  const urgentChallengeRows = sortChallengeItems(challengeOverdue, 'overdue').slice(0, 5);
  const riskChallengeRows = sortChallengeItems(challengeAtRisk, 'risk').slice(0, 5);

  const periodLabel = pdfs[0]?.periodLabel ?? 'Out SLA';

  return (
    <>
      <StatusBar status={status} />
      <div className={s.topHeader}>
        <div className={s.sectionTag}>{meta.section}</div>
        <div className={s.btnGroup}>
          <button className={`${s.uploadBtn} ${s.secondary}`} onClick={onReset}>↺ Resetar</button>
          <button className={`${s.uploadBtn} ${s.secondary}`} onClick={onShare} disabled={isShareLoading}>
            🔗 Copiar link
          </button>
          <button className={s.uploadBtn} onClick={onUpload}>⬆ Adicionar arquivo</button>
        </div>
      </div>

      {/* TA filter chips (team uploads with multiple TAs) */}
      {isIndividual && taList[0] ? (
        <div className={s.filterBar}>
          <div className={s.filterHeading}><span className={s.filterEyebrow}>Visualização</span><span className={s.filterTitle}>TA responsável</span></div>
          <span className={s.taIndividualBadge}>Análise individual · {taList[0]}</span>
        </div>
      ) : taList.length > 1 ? (
        <div className={s.filterBar}>
          <div className={s.filterHeading}><span className={s.filterEyebrow}>Visualização</span><span className={s.filterTitle}>Filtrar por TA</span></div>
          <div className={s.filterOptions}>
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
              title={ta}
            >
              {shortName(ta)}
            </button>
          ))}
          </div>
        </div>
      ) : null}

      {/* KPI row */}
      <section className={s.challengeSection} aria-labelledby="sla-desafio-title">
        <div className={s.challengeHeader}>
          <div>
            <span className={s.challengeEyebrow}>Visão de teste</span>
            <h2 id="sla-desafio-title">SLA desafio por senioridade</h2>
            <p>Antecipação da gestão. O indicador oficial de Out SLA continua sendo calculado separadamente.</p>
          </div>
          <div className={s.challengeLegend}><i className={s.legendGreen} /> Dentro da meta <i className={s.legendYellow} /> Até 10 dias da meta <i className={s.legendRed} /> Acima da meta</div>
        </div>
        <div className={s.challengeTargets}>
          {SENIORITY_SLA_TARGETS.map(target => (
            <div className={s.challengeTarget} key={target.label}>
              <span>{target.label}</span>
              <strong>{target.challengeDays}d</strong>
              <small>SLA atual: {target.officialDays}d</small>
            </div>
          ))}
        </div>
        <div className={s.challengeKpis}>
          <div><strong>{challengeOnTargetPct}%</strong><span>Dentro da meta desafio</span></div>
          <div className={s.challengeRisk}><strong>{challengeAtRisk.length}</strong><span>Em risco nos próximos 10 dias</span></div>
          <div className={s.challengeOverdue}><strong>{challengeOverdue.length}</strong><span>Acima da meta desafio</span></div>
        </div>
        {(urgentChallengeRows.length > 0 || riskChallengeRows.length > 0) && (
          <div className={s.challengeCases}>
            <ChallengeCases title="Vermelho · priorizar agora" tone="red" items={urgentChallengeRows} total={challengeOverdue.length} />
            <ChallengeCases title="Amarelo · agir antes do estouro" tone="yellow" items={riskChallengeRows} total={challengeAtRisk.length} />
          </div>
        )}
      </section>
      <div className={s.kpiScope}>
        <strong>{total}</strong> vaga(s) estão acima do <strong>SLA oficial da senioridade</strong> (Out SLA)
        {' '}de um total de <strong>{rawCountInView}</strong> na planilha
        {withinSlaCount > 0 ? <> ({withinSlaCount} dentro do SLA, não contam aqui)</> : null}
      </div>
      <div className={s.kpiRow}>
        <div className={`${s.kpiBox} ${s.kpiTotal}`}>
          <div className={s.kpiVal}>{total}</div>
          <div className={s.kpiLabel}>Vagas Out SLA{activeTa && !isIndividual ? ' (filtrado)' : ''}</div>
        </div>
        <div className={`${s.kpiBox} ${s.kpiOpen}`}>
          <div className={s.kpiVal}>{openRows.length}</div>
          <div className={s.kpiLabel}>Em Andamento / Stand By</div>
        </div>
        <div className={`${s.kpiBox} ${s.kpiClosed}`}>
          <div className={s.kpiVal}>{closedRows.length}</div>
          <div className={s.kpiLabel}>Concluídas fora do SLA</div>
        </div>
        <div className={`${s.kpiBox} ${s.kpiAvg}`}>
          <div className={s.kpiVal}>{avg}</div>
          <div className={s.kpiLabel}>Média de Dias (dos {total} Out SLA)</div>
        </div>
      </div>

      <div className={s.main}>
        {/* ── Left: per-TA summary + breakdowns ── */}
        <div className={s.colLeft}>

          {/* Per-TA breakdown table */}
          {perTaStats.length > 0 && (
            <div className={s.breakdownSection}>
              <div className={s.breakdownTitle}>Por TA</div>
              <table className={s.taTable}>
                <thead>
                  <tr>
                    <th className={s.thTa}>TA</th>
                    <th className={s.thNum}>Out SLA</th>
                    <th className={s.thNum}>Em andamento</th>
                    <th className={s.thNum}>Média</th>
                    <th className={s.thStage}>Última etapa</th>
                  </tr>
                </thead>
                <tbody>
                  {perTaStats.map(({ ta, n, openCount, avg: taAvg, topStage }) => (
                    <tr
                      key={ta}
                      className={selectedTa === ta ? s.taTableRowActive : ''}
                      onClick={() => setSelectedTa(selectedTa === ta ? null : ta)}
                      title={toTitleCase(ta)}
                    >
                      <td className={s.taTableName}>{shortName(ta)}</td>
                      <td className={s.taTableStat}>{n}</td>
                      <td className={`${s.taTableStat} ${openCount > 0 ? s.taStatAlert : ''}`}>{openCount}</td>
                      <td className={`${s.taTableStat} ${taAvg >= 90 ? s.taStatAlert : ''}`}>{taAvg}d</td>
                      <td className={s.taTableStage}>{topStage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showStatusBreakdown && (
            <div className={s.breakdownSection}>
              <div className={s.breakdownTitle}>Status da vaga (usado nos indicadores)</div>
              {byStatus.map(([label, val]) => (
                <BreakdownRow key={label} label={statusLabel(label)} value={val} total={total}
                  colorClass={label === 'on going' ? s.barNew : s.barDefault} />
              ))}
              <div className={s.bNote}>
                Status define se a vaga está concluída ou em andamento; a etapa mostra o último ponto registrado no processo.
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
              Análise: <strong>{activeTa}</strong>
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

function ChallengeCases({ title, tone, items, total }: { title: string; tone: 'red' | 'yellow'; items: ChallengeItem[]; total: number }) {
  return (
    <div className={`${s.challengeCaseGroup} ${tone === 'red' ? s.challengeCaseGroupRed : s.challengeCaseGroupYellow}`}>
      <div className={s.challengeCaseHeading}>
        <strong>{title}</strong>
        <span>{total > items.length ? `Mostrando 5 de ${total}` : `${total} vaga${total === 1 ? '' : 's'}`}</span>
      </div>
      {items.length === 0 ? <p className={s.challengeEmpty}>Nenhuma vaga nesta faixa.</p> : items.map(({ row, target }) => {
        const delta = row.timeToOffer - target.challengeDays;
        const active = !isClosedOutSlaRow(row);
        return (
          <div className={s.challengeCase} key={`${row.idInternal}-${row.positionCode}-${row.timeToOffer}`}>
            <div className={s.challengeCaseMain}>
              <strong>{row.positionCode || row.idInternal || 'Vaga sem código'}</strong>
              <span>{row.seniority} · {row.site || 'Local não informado'}</span>
            </div>
            <div className={s.challengeCaseDays}>
              <strong>{row.timeToOffer}d</strong>
              <span>{delta > 0 ? `+${delta}d da meta` : `faltam ${Math.abs(delta)}d`}</span>
            </div>
            <div className={s.challengeCaseDetails}>
              <span><b>{active ? 'Aberta' : 'Concluída'}</b> · {row.stage}</span>
              <span>TA: {row.ta ? shortName(row.ta) : 'Não informado'}</span>
              {row.offTimeReason && <span>Motivo: {row.offTimeReason}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

