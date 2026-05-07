import { useEffect, useRef } from 'react';
import type { Toast as ToastType } from '../../types';
import s from './Toast.module.css';

function ToastItem({ toast }: { toast: ToastType }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    requestAnimationFrame(() => el.classList.add(s.show));
    return () => el.classList.remove(s.show);
  }, []);

  return (
    <div
      ref={ref}
      className={`${s.toast} ${toast.kind === 'error' ? s.error : ''}`}
    >
      {toast.msg}
    </div>
  );
}

export function Toast({ toasts }: { toasts: ToastType[] }) {
  return (
    <>
      {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
    </>
  );
}
