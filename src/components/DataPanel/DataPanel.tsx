import { useMemo } from 'react';
import { buildMergedView } from '../../lib/merger';
import { StatusBar } from '../StatusBar/StatusBar';
import { PdfPill } from '../PdfPill/PdfPill';
import type { PdfData, TabId, TabMeta, StatusMessage } from '../../types';
import s from './DataPanel.module.css';

interface Props {
  tabId: TabId;
  meta: TabMeta;
  pdfs: PdfData[];
  status: StatusMessage | null | undefined;
  onUpload: () => void;
  onReset: () => void;
  onRemovePdf: (idx: number) => void;
  onShare: () => void;
  isShareLoading: boolean;
}

export function DataPanel({ tabId, meta, pdfs, status, onUpload, onReset, onRemovePdf, onShare, isShareLoading }: Props) {
  const data = useMemo(() => buildMergedView(pdfs, tabId), [pdfs, tabId]);

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
          <button className={s.uploadBtn} onClick={onUpload}>⬆ Adicionar PDF</button>
        </div>
      </div>
      <div className={s.toolbarSub}>
        <div className={s.uploadHint}>Período: <strong>{data.periodLabel}</strong></div>
      </div>

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
                  <div className={s.kpiVal}>{data.kpis.neutros}</div>
                  <div className={s.kpiLabel}>Neutros</div>
                </div>
                <div className={`${s.kpiBox} ${s.kpiDesfav}`}>
                  <div className={s.kpiVal}>{data.kpis.desfavorabilidade}</div>
                  <div className={s.kpiLabel}>Desfavorabilidade</div>
                </div>
              </div>

              {tabId !== 'hm' && (
                <div className={s.detractorCallout}>
                  <div className={s.dcTitle}>Detratores (notas 1–2)</div>
                  <div className={s.dcText} dangerouslySetInnerHTML={{ __html: data.detractorHtml }} />
                </div>
              )}

              <div className={s.dimSectionTitle}>Favorabilidade por Dimensão</div>
              <table className={s.dimTable}>
                <thead>
                  <tr>
                    <td className={s.dimName}>Dimensão</td>
                    <td className={s.dimFav}>Favorabilidade</td>
                    <td className={s.dimDesf}>Desfavorabilidade</td>
                  </tr>
                </thead>
                <tbody>
                  {data.dimensions.map((d, i) => {
                    const isWorst = d.name === data.worstDimensionName;
                    return (
                      <tr key={i} className={isWorst ? s.dimHighlight : ''}>
                        <td className={s.dimName}>
                          {isWorst ? <strong>{d.name} ⚠</strong> : d.name}
                        </td>
                        <td className={s.dimFav}>{d.fav}</td>
                        <td className={s.dimDesf}>
                          {isWorst ? <strong>{d.desfav}</strong> : d.desfav}
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
              {data.highs.map((h, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: h }} />
              ))}
            </ul>
          </div>
          <div>
            <div className={`${s.insightTitle} ${s.lows}`}>Lows</div>
            <ul className={`${s.insightList} ${s.lowsList}`}>
              {data.lows.map((l, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: l }} />
              ))}
            </ul>
          </div>
          <div>
            <div className={`${s.insightTitle} ${s.actions}`}>Actions</div>
            <ul className={`${s.insightList} ${s.actionsList}`}>
              {data.actions.map((a, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: a }} />
              ))}
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
