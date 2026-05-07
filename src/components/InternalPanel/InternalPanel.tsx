import { useMemo, useState, useEffect } from 'react';
import { buildMergedView } from '../../lib/merger';
import { StatusBar } from '../StatusBar/StatusBar';
import { PdfPill } from '../PdfPill/PdfPill';
import type { PdfData, TabMeta, StatusMessage, TabUiState } from '../../types';
import s from './InternalPanel.module.css';

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

function parsePct(val: string): number {
  return parseInt((val || '').replace('%', '').trim()) || 0;
}

const DASH = (v: string) => v === '—' || v === '-';

function DonutChart({ fav, neutral, desfav, hasData }: {
  fav: number; neutral: number; desfav: number; hasData: boolean;
}) {
  const r = 52;
  const C = 2 * Math.PI * r;
  const favLen     = (fav     / 100) * C;
  const neutralLen = (neutral / 100) * C;
  const desfavLen  = (desfav  / 100) * C;

  if (!hasData) {
    return (
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#ebebeb" strokeWidth="18" />
        <text x="70" y="70" textAnchor="middle" dominantBaseline="middle"
          fontSize="13" fill="#bbb" fontWeight="700">—</text>
      </svg>
    );
  }

  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#ebebeb" strokeWidth="18" />
      {favLen > 0 && (
        <circle cx="70" cy="70" r={r} fill="none" stroke="#1bbc9b" strokeWidth="18"
          strokeDasharray={`${favLen} ${C}`}
          strokeDashoffset={0}
          strokeLinecap="butt"
          transform="rotate(-90 70 70)" />
      )}
      {neutralLen > 0 && (
        <circle cx="70" cy="70" r={r} fill="none" stroke="#b0bec5" strokeWidth="18"
          strokeDasharray={`${neutralLen} ${C}`}
          strokeDashoffset={-favLen}
          strokeLinecap="butt"
          transform="rotate(-90 70 70)" />
      )}
      {desfavLen > 0 && (
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--danger)" strokeWidth="18"
          strokeDasharray={`${desfavLen} ${C}`}
          strokeDashoffset={-(favLen + neutralLen)}
          strokeLinecap="butt"
          transform="rotate(-90 70 70)" />
      )}
      <text x="70" y="70" textAnchor="middle" dominantBaseline="middle"
        fontSize="26" fontWeight="900" fill="#222">{fav}%</text>
    </svg>
  );
}

type DimOverrides = Record<number, { desfav?: string }>;

export function InternalPanel({ meta, pdfs, ui, status, onUpload, onReset, onRemovePdf, onShare, isShareLoading, onUiChange }: Props) {
  const data = useMemo(() => buildMergedView(pdfs, 'internal'), [pdfs]);

  const kpiDesfav  = ui?.kpiDesfav  ?? '';
  const kpiNeutros = ui?.kpiNeutros ?? '';
  const overrides: DimOverrides = (ui?.dimOverrides ?? {}) as DimOverrides;
  const [goalInput, setGoalInput] = useState('');

  useEffect(() => {
    const raw = data.kpis.favorabilidade;
    if (raw && raw !== '—' && raw !== '-') setGoalInput(raw.replace('%', ''));
  }, [data.kpis.favorabilidade]);

  const pctStore = (raw: string) => { const n = raw.replace(/[^0-9,.]/g, ''); return n ? n + '%' : '—'; };
  const pctDisplay = (v: string) => DASH(v) ? '' : v.replace('%', '');

  const hasData = data.kpis.favorabilidade !== '—';
  const favPct  = parsePct(data.kpis.favorabilidade);

  // Effective desfav: manual input > PDF data
  const effDesfavNum = kpiDesfav
    ? parseInt(kpiDesfav) || 0
    : DASH(data.kpis.desfavorabilidade) ? 0 : parsePct(data.kpis.desfavorabilidade);

  // Effective neutros: manual > auto-compute from fav+desfav > PDF data
  const effNeutrosNum = kpiNeutros
    ? parseInt(kpiNeutros) || 0
    : (kpiDesfav || !DASH(data.kpis.desfavorabilidade))
      ? Math.max(0, 100 - favPct - effDesfavNum)
      : DASH(data.kpis.neutros) ? 0 : parsePct(data.kpis.neutros);

  const showDesfavInDonut  = kpiDesfav  || !DASH(data.kpis.desfavorabilidade);
  const showNeutrosInDonut = kpiNeutros || showDesfavInDonut || !DASH(data.kpis.neutros);

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

      {/* ── Meta Favorabilidade ── */}
      {(() => {
        const META    = 90;
        const current = goalInput.trim() ? (parseFloat(goalInput.replace(',', '.')) || null) : null;
        const fill    = current !== null ? Math.min((current / META) * 100, 100) : 0;
        const gap     = current !== null ? Math.abs(META - current).toFixed(1).replace('.', ',') : null;
        const ok      = current !== null && current >= META;
        return (
          <div className={s.goalRow}>
            <div className={s.goalBlock}>
              <div className={s.goalTopRow}>
                <span className={s.goalTitle}>Meta Favorabilidade — Internal Candidate 2026</span>
                <span className={s.goalMetaTag}>Meta: {META}%</span>
              </div>
              {current === null ? (
                <div className={s.goalEmpty}>
                  <span className={s.goalEmptyLabel}>% Favorabilidade atual</span>
                  <div className={s.goalEmptyRow}>
                    <input className={s.goalInputBig} type="text" placeholder="ex: 75" value={goalInput} onChange={e => setGoalInput(e.target.value)} />
                    <span className={s.goalEmptyUnit}>%</span>
                  </div>
                </div>
              ) : (
                <div className={s.goalBody}>
                  <div className={s.goalLeft}>
                    <span className={`${s.goalBigNum} ${ok ? s.goalOk : s.goalAlert}`}>{current.toLocaleString('pt-BR')}%</span>
                    <span className={s.goalBigLabel}>Favorabilidade atual</span>
                    <input className={s.goalInput} type="text" value={goalInput} onChange={e => setGoalInput(e.target.value)} />
                  </div>
                  <div className={s.goalRight}>
                    <div className={s.goalBarWrap}>
                      <div className={s.goalBarTrack}>
                        <div className={ok ? s.goalFillOk : s.goalFillAlert} style={{ width: `${fill}%` }} />
                        <div className={s.goalMark} />
                      </div>
                      <div className={s.goalBarLabels}><span>0%</span><span>{META}%</span></div>
                    </div>
                    <div className={ok ? s.goalGapOk : s.goalGapAlert}>
                      {ok ? `✓ ${gap}% acima da meta` : `Faltam ${gap}% para a meta`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── KPI row ── */}
      <div className={s.kpiRow}>
        <div className={`${s.kpiBox} ${s.kpiTotal}`}>
          <div className={s.kpiVal}>{data.kpis.respostas}</div>
          <div className={s.kpiLabel}>Respostas</div>
        </div>

        <div className={`${s.kpiBox} ${s.kpiDonut}`}>
          <DonutChart
            fav={favPct}
            neutral={showNeutrosInDonut ? effNeutrosNum : 0}
            desfav={showDesfavInDonut   ? effDesfavNum  : 0}
            hasData={hasData}
          />
          <div className={s.donutMeta}>
            <div className={s.donutTitle}>Sendo 1 ruim e 5 excelente</div>
            <div className={s.donutSubtitle}>Como viveu este processo?</div>
            <div className={s.donutLegend}>
              {hasData && (
                <span className={s.lgFav}>
                  <span className={s.dot} style={{ background: '#1bbc9b' }} />
                  {data.kpis.favorabilidade} favorável
                </span>
              )}

              {/* Neutros — auto-computed or editable */}
              <span className={s.lgNeutral}>
                <span className={s.dot} style={{ background: '#b0bec5' }} />
                {showDesfavInDonut && !kpiNeutros
                  ? <>{effNeutrosNum}%</>
                  : <span className={s.lgInputRow}>
                      <input
                        className={s.lgInput}
                        value={kpiNeutros}
                        placeholder="—"
                        style={{ width: `${Math.max(1, kpiNeutros.length || 1) * 0.65}em` }}
                        onChange={e => onUiChange({ kpiNeutros: e.target.value.replace(/[^0-9,.]/g, '') })}
                      />
                      {kpiNeutros && <span className={s.lgUnit}>%</span>}
                    </span>
                }
                {' '}neutros
              </span>

              {/* Desfav — always editable */}
              <span className={s.lgDesfav}>
                <span className={s.dot} style={{ background: 'var(--danger)' }} />
                {!DASH(data.kpis.desfavorabilidade) && !kpiDesfav
                  ? <>{data.kpis.desfavorabilidade}</>
                  : <span className={s.lgInputRow}>
                      <input
                        className={`${s.lgInput} ${s.lgInputDesfav}`}
                        value={kpiDesfav}
                        placeholder={DASH(data.kpis.desfavorabilidade) ? '—' : pctDisplay(data.kpis.desfavorabilidade)}
                        style={{ width: `${Math.max(1, kpiDesfav.length || 1) * 0.65}em` }}
                        onChange={e => onUiChange({ kpiDesfav: e.target.value.replace(/[^0-9,.]/g, '') })}
                      />
                      {kpiDesfav && <span className={`${s.lgUnit} ${s.lgUnitDesfav}`}>%</span>}
                    </span>
                }
                {' '}desfavorável
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className={s.main}>
        <div className={s.colLeft}>

          <div className={s.dimSectionTitle}>Favorabilidade por Dimensão</div>
          <table className={s.dimTable}>
            <thead>
              <tr>
                <td className={s.dimName}>Dimensão</td>
                <td className={s.dimFav}>Favorabilidade</td>
                <td className={s.dimNeutral}>Neutros</td>
                <td className={s.dimDesf}>Desfavorabilidade</td>
              </tr>
            </thead>
            <tbody>
              {data.dimensions.map((d, i) => {
                const isWorst    = d.name === data.worstDimensionName;
                const effDesfav  = overrides[i]?.desfav ?? d.desfav;
                const favN       = parsePct(d.fav);
                const desfavN    = parsePct(effDesfav);
                const neutro     = !DASH(d.fav) && !DASH(effDesfav)
                  ? `${Math.max(0, 100 - favN - desfavN)}%`
                  : '—';
                return (
                  <tr key={i} className={isWorst ? s.dimHighlight : ''}>
                    <td className={s.dimName}>
                      {isWorst ? <strong>{d.name} ⚠</strong> : d.name}
                    </td>
                    <td className={s.dimFav}>{d.fav}</td>
                    <td className={s.dimNeutral}>{neutro}</td>
                    <td className={s.dimDesf}>
                      {DASH(d.desfav)
                        ? <span className={s.dimInputWrap}>
                            <input
                              className={s.dimInput}
                              value={pctDisplay(effDesfav)}
                              placeholder="—"
                              style={{ width: `${Math.max(1, pctDisplay(effDesfav).length || 1) * 0.7}em` }}
                              onChange={e => onUiChange({ dimOverrides: { ...overrides, [i]: { desfav: pctStore(e.target.value) } } })}
                            />
                            {!DASH(effDesfav) && <span className={s.dimInputPct}>%</span>}
                          </span>
                        : isWorst ? <strong>{d.desfav}</strong> : d.desfav}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

        </div>

        <div className={s.colRight}>
          <div>
            <div className={`${s.insightTitle} ${s.highs}`}>Highs</div>
            <ul className={`${s.insightList} ${s.highsList}`}>
              {data.highs.map((h, i) => <li key={i} dangerouslySetInnerHTML={{ __html: h }} />)}
            </ul>
          </div>
          <div>
            <div className={`${s.insightTitle} ${s.lows}`}>Lows</div>
            <ul className={`${s.insightList} ${s.lowsList}`}>
              {data.lows.map((l, i) => <li key={i} dangerouslySetInnerHTML={{ __html: l }} />)}
            </ul>
          </div>
          <div>
            <div className={`${s.insightTitle} ${s.actions}`}>Actions</div>
            <ul className={`${s.insightList} ${s.actionsList}`}>
              {data.actions.map((a, i) => <li key={i} dangerouslySetInnerHTML={{ __html: a }} />)}
            </ul>
          </div>
        </div>
      </div>

      <div className={s.footer}>
        <div className={s.footerText}>{meta.section} · TA Transportes Brasil · {data.periodLabel}</div>
      </div>
    </>
  );
}
