import type { TabId, TabMeta, PdfData, StatusMessage } from '../../types';
import { DataPanel } from '../DataPanel/DataPanel';
import { SkeletonPanel } from '../SkeletonPanel/SkeletonPanel';
import { PcdPanel } from '../PcdPanel/PcdPanel';
import s from './TabPanel.module.css';

interface Props {
  tabId: TabId;
  meta: TabMeta;
  pdfs: PdfData[];
  isActive: boolean;
  status: StatusMessage | null | undefined;
  onUpload: () => void;
  onReset: () => void;
  onRemovePdf: (idx: number) => void;
  onShare: () => void;
  isShareLoading: boolean;
}

export function TabPanel({ tabId, meta, pdfs, isActive, status, onUpload, onReset, onRemovePdf, onShare, isShareLoading }: Props) {
  return (
    <div className={`${s.panel} ${isActive ? s.active : ''}`}>
      {tabId === 'pcd' ? (
        <PcdPanel meta={meta} />
      ) : pdfs.length > 0 ? (
        <DataPanel
          tabId={tabId} meta={meta} pdfs={pdfs} status={status}
          onUpload={onUpload} onReset={onReset} onRemovePdf={onRemovePdf}
          onShare={onShare} isShareLoading={isShareLoading}
        />
      ) : (
        <SkeletonPanel tabId={tabId} meta={meta} status={status} onUpload={onUpload} />
      )}
    </div>
  );
}
