import type { TabId, TabMeta, StatusMessage } from '../../types';
import { StatusBar } from '../StatusBar/StatusBar';
import s from './SkeletonPanel.module.css';

interface Props {
  tabId: TabId;
  meta: TabMeta;
  status: StatusMessage | null | undefined;
  onUpload: () => void;
}

const HIDE_KPI_GRID: TabId[] = ['tonh', 'pcd', 'hpc', 'outsla'];

export function SkeletonPanel({ tabId, meta, status, onUpload }: Props) {
  const hideKpiGrid = HIDE_KPI_GRID.includes(tabId);

  return (
    <>
      <StatusBar status={status} />
      <div className={s.sectionTag}>{meta.section}</div>
      <div className={s.toolbar}>
        <div />
        <button className={s.uploadBtn} onClick={onUpload}>⬆ Adicionar arquivo</button>
      </div>
      <div className={s.hintRow}>
        <span className={s.hint}>
          {tabId === 'tonh'
            ? <>Faça upload do PDF de <strong>Exit Discussion New Hires</strong> para análise dos casos de saída — motivos, flags, tempo no cargo e learnings são extraídos automaticamente.</>
            : tabId === 'pcd'
            ? 'Faça upload do relatório de vagas PCD para análise dos indicadores de inclusão do time.'
            : tabId === 'hpc'
            ? <>Faça upload do <strong>Relatório Semanal de Hiring Plan</strong> para análise dos indicadores de conclusão — SLA, pipeline e quarters são calculados automaticamente.</>
            : tabId === 'outsla'
            ? 'Faça upload do relatório de Out SLA para análise dos indicadores de tempo de oferta do time.'
            : 'Faça upload de um ou mais PDFs do Qualtrics para preencher esta aba. Dimensões, Highs, Lows e Actions são gerados automaticamente.'
          }
        </span>
        {tabId === 'external' && (
          <span className={s.hintTA}>
            Para análise individual por TA, exporte o PDF do Qualtrics com o filtro <strong>TA Owner</strong> aplicado — o indicador de análise individual aparece automaticamente.
          </span>
        )}
        {tabId === 'tonh' && (
          <span className={s.hintTA}>
            Você pode fazer o upload de múltiplos PDFs para análises por senioridade, localidade, gestor e etc, ou subir individualmente por TA para análise individual.
          </span>
        )}
        {(tabId === 'pcd' || tabId === 'hpc' || tabId === 'outsla') && (
          <span className={s.hintTA}>
            Análises individuais por TA podem ser feitas a partir dos filtros disponíveis após o upload.
          </span>
        )}
      </div>
      <div className={s.panel}>
        <div className={s.icon}>⚙</div>
        <div className={s.title}>{meta.section}</div>
        {!hideKpiGrid && (
          <div className={s.grid}>
            <div className={s.kpi}><div className={s.val}>—</div><div className={s.label}>Respostas</div></div>
            <div className={s.kpi}><div className={s.val}>—</div><div className={s.label}>Favorabilidade</div></div>
            <div className={s.kpi}><div className={s.val}>—</div><div className={s.label}>Neutros</div></div>
            <div className={s.kpi}><div className={s.val}>—</div><div className={s.label}>Desfavorabilidade</div></div>
          </div>
        )}
      </div>
      <div className={s.footer}>
        <div className={s.footerText}>{meta.section} · TA Transportes Brasil · Aguardando dados</div>
      </div>
    </>
  );
}
