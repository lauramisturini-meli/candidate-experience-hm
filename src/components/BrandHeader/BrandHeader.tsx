import { useState } from 'react';
import s from './BrandHeader.module.css';

export function BrandHeader() {
  const [logoError, setLogoError] = useState(false);

  return (
    <div className={s.header}>
      <div className={s.logo}>
        {!logoError ? (
          <img src="/assets/logo.png" alt="Mercado Livre" onError={() => setLogoError(true)} />
        ) : (
          <span className={s.logoFallback}>mercado livre</span>
        )}
      </div>
      <div className={s.titles}>
        <div className={s.title}>KPIs TA Transportes 2026</div>
      </div>
      <div className={s.spacer} />
      <div className={s.pill}>Talent Acquisition</div>
    </div>
  );
}
