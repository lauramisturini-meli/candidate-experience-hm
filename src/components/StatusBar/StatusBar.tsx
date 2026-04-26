import type { StatusMessage } from '../../types';
import s from './StatusBar.module.css';

export function StatusBar({ status }: { status: StatusMessage | null | undefined }) {
  if (!status) return null;
  return (
    <div className={`${s.bar} ${s[status.type]}`}>
      {status.msg}
    </div>
  );
}
