import type { PdfData } from '../../types';
import s from './PdfPill.module.css';

interface Props {
  pdf: PdfData;
  index: number;
  onRemove: (idx: number) => void;
}

export function PdfPill({ pdf, index, onRemove }: Props) {
  if (pdf.isTonhExit && pdf.tonhCases) {
    return (
      <span className={s.pill} title={pdf.fileName}>
        <span className={s.name}>{pdf.fileName}</span>
        <span className={s.n}>{pdf.tonhCases.length} caso(s) TO NH</span>
        <button className={s.remove} onClick={() => onRemove(index)} title="Remover">×</button>
      </span>
    );
  }

  if (pdf.pcdVagas) {
    return (
      <span className={s.pill} title={pdf.fileName}>
        <span className={s.name}>{pdf.fileName}</span>
        <span className={s.n}>{pdf.pcdVagas.length} vaga(s) PCD</span>
        <button className={s.remove} onClick={() => onRemove(index)} title="Remover">×</button>
      </span>
    );
  }

  if (pdf.isOutSla) {
    const total = pdf.outSlaPayload?.rows.length ?? 0;
    return (
      <span className={s.pill} title={pdf.fileName}>
        <span className={s.name}>{pdf.fileName}</span>
        <span className={s.n}>{total} vaga(s)</span>
        <button className={s.remove} onClick={() => onRemove(index)} title="Remover">×</button>
      </span>
    );
  }

  const range = pdf.overallRange || 'ALL';
  const rangeClass = range === 'ALL' ? s.all
    : /^1/.test(range) ? s.low
    : /5$/.test(range) ? s.high
    : '';

  const diag = `${pdf.fileName}\nRespostas: ${pdf.respostas ?? '?'} · Favorabilidade: ${pdf.fav}\nComentários: ${pdf.comments.length}`;

  return (
    <span className={s.pill} title={diag}>
      <span className={`${s.range} ${rangeClass}`}>{range}</span>
      <span className={s.name}>{pdf.fileName}</span>
      <span className={s.n}>n={pdf.respostas ?? '?'} · {pdf.comments.length}💬</span>
      <button className={s.remove} onClick={() => onRemove(index)} title="Remover">×</button>
    </span>
  );
}

