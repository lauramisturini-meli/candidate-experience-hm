import type { TabId, TabMeta, StatusMessage } from '../../types';
import { StatusBar } from '../StatusBar/StatusBar';
import s from './SkeletonPanel.module.css';

interface Props {
  tabId: TabId;
  meta: TabMeta;
  status: StatusMessage | null | undefined;
  onUpload: () => void;
}

const HIDE_INSTRUCTIONS: TabId[] = ['tonh', 'pcd', 'hpc'];
const HIDE_KPI_GRID: TabId[] = ['pcd', 'hpc'];

export function SkeletonPanel({ tabId, meta, status, onUpload }: Props) {
  const hideInstructions = HIDE_INSTRUCTIONS.includes(tabId);
  const hideKpiGrid      = HIDE_KPI_GRID.includes(tabId);

  return (
    <>
      <StatusBar status={status} />
      <div className={s.sectionTag}>{meta.section}</div>
      <div className={s.toolbar}>
        <div className={s.hint}>
          {hideInstructions ? '' : 'Faça upload de um ou mais PDFs do Qualtrics para preencher esta aba. Dimensões, Highs, Lows e Actions são gerados automaticamente.'}
        </div>
        <button className={s.uploadBtn} onClick={onUpload}>⬆ Upload PDF(s)</button>
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
