import { useMemo, useState, useEffect } from 'react';
import { buildMergedView } from '../../lib/merger';
import { buildHmDimensionInsights } from '../../lib/insights';
import { StatusBar } from '../StatusBar/StatusBar';
import { PdfPill } from '../PdfPill/PdfPill';
import type { PdfData, TabId, TabMeta, StatusMessage, TabUiState, DimOverrides } from '../../types';
import s from './DataPanel.module.css';

interface Props {
  tabId: TabId;
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

const DASH = (v: string) => v === '—' || v === '-';

export function DataPanel({ tabId, meta, pdfs, ui, status, onUpload, onReset, onRemovePdf, onShare, isShareLoading, onUiChange }: Props) {
  const data = useMemo(() => buildMergedView(pdfs, tabId), [pdfs, tabId]);
  const overrides: DimOverrides = ui?.dimOverrides ?? {};
  const kpiNeutros = ui?.kpiNeutros ?? '';
  const kpiDesfav  = ui?.kpiDesfav  ?? '';
  const [goalInput, setGoalInput] = useState('');

  // Auto-fill goal from PDF fav value
  useEffect(() => {
    const raw = data.kpis.favorabilidade;
    if (raw && raw !== '—' && raw !== '-') setGoalInput(raw.replace('%', ''));
  }, [data.kpis.favorabilidade]);

  const setOverride = (idx: number, field: 'fav' | 'neutros' | 'desfav', val: string) =>
    onUiChange({ dimOverrides: { ...overrides, [idx]: { ...overrides[idx], [field]: val } } });

  const dimVal = (idx: number, field: 'fav' | 'neutros' | 'desfav', raw: string) =>
    overrides[idx]?.[field] ?? raw;

  // Display in <input> without "%"; store with "%"
  const pctDisplay = (v: string) => DASH(v) ? '' : v.replace('%', '');
  const pctStore   = (raw: string) => { const n = raw.replace(/[^0-9,.]/g, ''); return n ? n + '%' : '—'; };

  // When user fills in HM dimension values, recalculate insights from real data
  const effectiveDims = useMemo(() =>
    data.dimensions.map((d, i) => ({
      name:   d.name,
      fav:    overrides[i]?.fav    ?? d.fav,
      desfav: overrides[i]?.desfav ?? d.desfav,
    })),
    [data.dimensions, overrides],
  );

  const hasDesfavOverride = useMemo(
    () => Object.values(overrides).some(o => o.desfav && !DASH(o.desfav)),
    [overrides],
  );

  const { highs, lows, actions } = useMemo(() => {
    if (tabId === 'hm' && (hasDesfavOverride || (kpiNeutros && !DASH(kpiNeutros)) || (kpiDesfav && !DASH(kpiDesfav)))) {
      const dim = buildHmDimensionInsights(effectiveDims, kpiNeutros, kpiDesfav);
      // Merge dimension-based (quantitative) with comment-based (qualitative), dim insights first
      return {
        highs:   [...dim.highs,   ...data.highs  ].slice(0, 6),
        lows:    [...dim.lows,    ...data.lows    ].slice(0, 6),
        actions: [...dim.actions, ...data.actions ].slice(0, 6),
      };
    }
    return { highs: data.highs, lows: data.lows, actions: data.actions };
  }, [tabId, hasDesfavOverride, kpiNeutros, kpiDesfav, effectiveDims, data.highs, data.lows, data.actions]);

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

      {(tabId === 'external' || tabId === 'hm') && (() => {
        const META  = tabId === 'hm' ? 95 : 90;
        const LABEL = tabId === 'hm' ? 'Hiring Manager' : 'External Candidate';
        const current = goalInput.trim() ? (parseFloat(goalInput.replace(',', '.')) || null) : null;
        const fill    = current !== null ? Math.min((current / META) * 100, 100) : 0;
        const gap     = current !== null ? Math.abs(META - current).toFixed(1).replace('.', ',') : null;
        const ok      = current !== null && current >= META;
        return (
          <div className={s.goalRow}>
            <div className={s.goalBlock}>
              <div className={s.goalTopRow}>
                <span className={s.goalTitle}>Meta Favorabilidade — {LABEL} 2026</span>
                <span className={s.goalMetaTag}>Meta: {META}%</span>
              </div>
              {current === null ? (
                <div className={s.goalEmpty}>
                  <span className={s.goalEmptyLabel}>% Favorabilidade atual</span>
                  <div className={s.goalEmptyRow}>
                    <input className={s.goalInputBig} type="text" placeholder="ex: 93" value={goalInput} onChange={e => setGoalInput(e.target.value)} />
                    <span className={s.goalEmptyUnit}>%</span>
                  </div>
                </div>
              ) : (
                <div className={s.goalBody}>
                  <div className={s.goalLeft}>
                    <span className={`${s.goalBigNum} ${ok ? s.goalOk : s.goalAlert}`}>{current.toLocaleString('pt-BR')}%</span>
                    <span className={s.goalBigLabel}>Favorabilidade atual</span>
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

      <div className={s.main}>
        <div className={s.colLeft}>
          {data.hpPayload ? (
            <>
              <div className={s.hpKpiGrid}>
                <div className={`${s.kpiBox} ${s.hpKpiFechadas}`}>
                  <div className={s.kpiVal}>{data.hpPayload.cerradas.toLocaleString('pt-BR')}</div>
                  <div className={s.kpiLabel}>Posições Fechadas</div>
                </div>
                <div className={`${s.kpiBox} ${s.hpKpiOnGoing}`}>
                  <div className={s.kpiVal}>{data.hpPayload.onGoing.toLocaleString('pt-BR')}</div>
                  <div className={s.kpiLabel}>On Going</div>
                </div>
                <div className={`${s.kpiBox} ${s.hpKpiInativas}`}>
                  <div className={s.kpiVal}>{data.hpPayload.sinActivar.toLocaleString('pt-BR')}</div>
                  <div className={s.kpiLabel}>Sin Activar</div>
                </div>
                <div className={`${s.kpiBox} ${s.hpKpiReemplazos}`}>
                  <div className={s.kpiVal}>{data.hpPayload.reemplazosProyectados.toLocaleString('pt-BR')}</div>
                  <div className={s.kpiLabel}>Reemplazos Proj.</div>
                </div>
                <div className={`${s.kpiBox} ${s.hpKpiOperadores}`}>
                  <div className={s.kpiVal}>{data.hpPayload.operadoresProyectados.toLocaleString('pt-BR')}</div>
                  <div className={s.kpiLabel}>Operadores Proj.</div>
                </div>
                <div className={`${s.kpiBox} ${s.hpKpiTotal}`}>
                  <div className={s.kpiVal}>{data.hpPayload.posicionesTotal.toLocaleString('pt-BR')}</div>
                  <div className={s.kpiLabel}>Total de Posições</div>
                </div>
                <div className={`${s.kpiBox} ${s.hpKpiAvance}`}>
                  <div className={s.kpiVal}>{data.hpPayload.porcentajeAvance.toFixed(2).replace('.', ',')}%</div>
                  <div className={s.kpiLabel}>Porcentaje de Avance</div>
                </div>
              </div>

              {data.hpPayload.rows.length > 0 && (() => {
                const maxRot = Math.max(...data.hpPayload!.rows.map(r => r.rotacionesProyectadas));
                return (
                  <>
                    <div className={s.dimSectionTitle}>Breakdown por Layer</div>
                    <table className={s.dimTable}>
                      <thead>
                        <tr>
                          <td className={s.dimName}>Layer</td>
                          <td className={s.hpCol}>Fechadas</td>
                          <td className={s.hpCol}>Sin Activar</td>
                          <td className={s.hpCol}>On Going</td>
                          <td className={s.hpCol}>Reemplazos</td>
                          <td className={s.hpCol}>Rotações</td>
                        </tr>
                      </thead>
                      <tbody>
                        {data.hpPayload!.rows.map((row, i) => {
                          const isHighRot = row.rotacionesProyectadas === maxRot && maxRot > 0;
                          return (
                            <tr key={i} className={isHighRot ? s.dimHighlight : ''}>
                              <td className={s.dimName}>{isHighRot ? <strong>{row.agrupLayer} ⚠</strong> : row.agrupLayer}</td>
                              <td className={s.hpCol}>{row.cerradas}</td>
                              <td className={s.hpCol}>{row.sinActivar}</td>
                              <td className={s.hpCol}>{row.onGoing}</td>
                              <td className={s.hpCol}>{row.reemplazosProyectados}</td>
                              <td className={`${s.hpCol} ${isHighRot ? s.hpColDanger : ''}`}>{isHighRot ? <strong>{row.rotacionesProyectadas}</strong> : row.rotacionesProyectadas}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                );
              })()}
            </>
          ) : (
            <>
              <div className={s.kpiGrid}>
                <div className={`${s.kpiBox} ${s.kpiTotal}`}>
                  <div className={s.kpiVal}>{data.kpis.respostas}</div>
                  <div className={s.kpiLabel}>Respostas</div>
                </div>
                <div className={`${s.kpiBox} ${s.kpiFav}`}>
                  <div className={s.kpiVal}>{data.kpis.favorabilidade}</div>
                  <div className={s.kpiLabel}>Favorabilidade</div>
                </div>
                <div className={`${s.kpiBox} ${s.kpiNeutral}`}>
                  <div className={s.kpiVal}>
                    {(DASH(data.kpis.neutros) || data.kpis.neutros === '0%')
                      ? <span className={s.kpiInputRow}>
                          <input
                            className={`${s.kpiInput} ${s.kpiInputNeutral}`}
                            value={kpiNeutros}
                            placeholder="—"
                            style={{ width: `${Math.max(1, kpiNeutros.length || 1) * 0.65}em` }}
                            onChange={e => onUiChange({ kpiNeutros: e.target.value.replace(/[^0-9,.]/g, '') })}
                          />
                          {kpiNeutros && <span className={`${s.kpiInputUnit} ${s.kpiInputNeutral}`}>%</span>}
                        </span>
                      : data.kpis.neutros}
                  </div>
                  <div className={s.kpiLabel}>Neutros</div>
                </div>
                <div className={`${s.kpiBox} ${s.kpiDesfav}`}>
                  <div className={s.kpiVal}>
                    {DASH(data.kpis.desfavorabilidade)
                      ? <span className={s.kpiInputRow}>
                          <input
                            className={`${s.kpiInput} ${s.kpiInputDesfav}`}
                            value={kpiDesfav}
                            placeholder="—"
                            style={{ width: `${Math.max(1, kpiDesfav.length || 1) * 0.65}em` }}
                            onChange={e => onUiChange({ kpiDesfav: e.target.value.replace(/[^0-9,.]/g, '') })}
                          />
                          {kpiDesfav && <span className={`${s.kpiInputUnit} ${s.kpiInputDesfav}`}>%</span>}
                        </span>
                      : data.kpis.desfavorabilidade}
                  </div>
                  <div className={s.kpiLabel}>Desfavorabilidade</div>
                </div>
              </div>

              {tabId !== 'hm' && (
                <div className={s.detractorCallout}>
                  <div className={s.dcTitle}>Detratores (notas 1 e 2)</div>
                  <div className={s.dcText} dangerouslySetInnerHTML={{ __html: data.detractorHtml }} />
                </div>
              )}

              <div className={s.dimSectionTitle}>Favorabilidade por Dimensão</div>
              <table className={s.dimTable}>
                <thead>
                  <tr>
                    <td className={s.dimName}>Dimensão</td>
                    <td className={s.dimFav}>Favorabilidade</td>
                    {tabId === 'hm' && <td className={s.dimNeutro}>Neutros</td>}
                    <td className={s.dimDesf}>Desfavorabilidade</td>
                  </tr>
                </thead>
                <tbody>
                  {data.dimensions.map((d, i) => {
                    const isWorst = d.name === data.worstDimensionName;
                    const fav    = dimVal(i, 'fav',    d.fav);
                    const desfav = dimVal(i, 'desfav', d.desfav);

                    // Compute neutros from fav + desfav when both are numbers; otherwise editable
                    const favNum    = parseInt(fav);
                    const desfavNum = parseInt(desfav);
                    const computed  = !isNaN(favNum) && !isNaN(desfavNum)
                      ? Math.max(0, 100 - favNum - desfavNum) + '%'
                      : null;
                    const neutros = computed ?? (overrides[i]?.neutros ?? '—');

                    return (
                      <tr key={i} className={isWorst ? s.dimHighlight : ''}>
                        <td className={s.dimName}>
                          {isWorst ? <strong>{d.name} ⚠</strong> : d.name}
                        </td>
                        <td className={s.dimFav}>
                          {DASH(d.fav)
                            ? <input
                                className={s.dimInput}
                                value={pctDisplay(fav)}
                                placeholder="—"
                                onChange={e => setOverride(i, 'fav', pctStore(e.target.value))}
                              />
                            : fav}
                        </td>
                        {tabId === 'hm' && (
                          <td className={s.dimNeutro}>
                            {computed
                              ? computed
                              : <span className={s.dimInputWrap}>
                                  <input
                                    className={`${s.dimInput} ${s.dimInputNeutro}`}
                                    value={pctDisplay(neutros)}
                                    placeholder="—"
                                    style={{ width: `${Math.max(1, pctDisplay(neutros).length || 1) * 0.7}em` }}
                                    onChange={e => setOverride(i, 'neutros', pctStore(e.target.value))}
                                  />
                                  {!DASH(neutros) && <span className={s.dimInputPct}>%</span>}
                                </span>}
                          </td>
                        )}
                        <td className={s.dimDesf}>
                          {DASH(d.desfav)
                            ? <span className={s.dimInputWrap}>
                                <input
                                  className={`${s.dimInput} ${s.dimInputDesf}`}
                                  value={pctDisplay(desfav)}
                                  placeholder="—"
                                  style={{ width: `${Math.max(1, pctDisplay(desfav).length || 1) * 0.7}em` }}
                                  onChange={e => setOverride(i, 'desfav', pctStore(e.target.value))}
                                />
                                {!DASH(desfav) && <span className={s.dimInputPct}>%</span>}
                              </span>
                            : isWorst ? <strong>{desfav}</strong> : desfav}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

        <div className={s.colRight}>
          <div>
            <div className={`${s.insightTitle} ${s.highs}`}>Highs</div>
            <ul className={`${s.insightList} ${s.highsList}`}>
              {highs.map((h, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: h }} />
              ))}
            </ul>
          </div>
          <div>
            <div className={`${s.insightTitle} ${s.lows}`}>Lows</div>
            <ul className={`${s.insightList} ${s.lowsList}`}>
              {lows.map((l, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: l }} />
              ))}
            </ul>
          </div>
          <div>
            <div className={`${s.insightTitle} ${s.actions}`}>Actions</div>
            <ul className={`${s.insightList} ${s.actionsList}`}>
              {actions.map((a, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: a }} />
              ))}
            </ul>
          </div>
          {data.hpSummary && (
            <div className={s.hpSummary}>
              <div className={s.hpSummaryTitle}>Síntese Executiva</div>
              <p className={s.hpSummaryText}>{data.hpSummary.paragraph1}</p>
              <p className={s.hpSummaryText}>{data.hpSummary.paragraph2}</p>
            </div>
          )}
        </div>
      </div>

      <div className={s.footer}>
        <div className={s.footerText}>{meta.section} · TA Transportes Brasil · {data.periodLabel}</div>
      </div>
    </>
  );
}
