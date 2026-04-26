import type { PdfData } from '../types';

const HM_QUESTIONS = [
  { name: 'Visibilidade sobre o avanço do processo',                     keyword: /Tuve\s+visibilidad/i,           isOverall: false },
  { name: 'Perfis avaliados alinhados ao perfil definido',               keyword: /Los\s+perfiles\s+evaluados/i,   isOverall: false },
  { name: 'Recomendações de valor do time de TA durante o processo',     keyword: /recomendaciones\s+de\s+valor/i, isOverall: false },
  { name: 'TA contribuiu ativamente na identificação do melhor talento', keyword: /El\s+equipo\s+de\s+TA/i,        isOverall: true  },
] as const;

export function isHmReport(fullText: string): boolean {
  return /Respuestas\s+acumuladas/i.test(fullText)
      || /El\s+equipo\s+de\s+TA\s+contribuy/i.test(fullText)
      || /Hiring\s+Manager\s+Experience/i.test(fullText);
}

export function parseHmReport(fullText: string, _pageTexts: string[]): PdfData {
  const normText = fullText.normalize('NFD').replace(/[̀-ͯ]/g, '');

  const pctAfter = (idx: number, win = 1200): number | null => {
    const slice = normText.slice(idx, idx + win);
    const m = slice.match(/(\d{1,3})\s*%/);
    if (!m) return null;
    const v = parseInt(m[1], 10);
    return (isNaN(v) || v > 100) ? null : v;
  };

  const numAfter = (idx: number, win = 400): number | null => {
    const slice = normText.slice(idx, idx + win);
    const m = slice.match(/\b(\d{1,6})\b(?!\s*%)/);
    return m ? parseInt(m[1], 10) : null;
  };

  let respostas: number | null = null;
  const respIdx = normText.search(/Respuestas\s+acumuladas/i);
  if (respIdx !== -1) {
    respostas = numAfter(respIdx + 'Respuestas acumuladas'.length, 300);
  }

  const dimensions: Array<{ name: string; fav: string; desfav: string }> = [];
  let overallFav: number | null = null;

  for (const q of HM_QUESTIONS) {
    const km = q.keyword.exec(normText);
    if (!km) continue;
    const pct = pctAfter(km.index + km[0].length, 1500);
    if (pct == null) continue;
    dimensions.push({ name: q.name, fav: pct + '%', desfav: (100 - pct) + '%' });
    if (q.isOverall) overallFav = pct;
  }

  if (overallFav == null && dimensions.length) {
    const pcts = dimensions.map(d => parseInt(d.fav, 10)).filter(v => !isNaN(v));
    if (pcts.length) overallFav = Math.max(...pcts);
  }

  const fav = overallFav != null ? overallFav + '%' : '—';
  const desfav = overallFav != null ? '0%' : '—';

  const comments: Array<{ score: number; division: string; name: string; text: string }> = [];
  const rawNorm = fullText.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const sectionAnchor = rawNorm.search(/Que\s+aspectos\s+positivos/i);

  if (sectionAnchor !== -1) {
    const sectionText = fullText.slice(sectionAnchor);
    const blocks = sectionText.split(/\n\s*Shipping\s*\n/i);
    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];
      const emailMatch = block.match(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+)/);
      if (!emailMatch) continue;
      const emailIdx = (emailMatch.index ?? 0) + emailMatch[0].length;
      const tail = block.slice(emailIdx);
      const stop = tail.search(/\n\s*(¿|Pregunta|Respuestas\s+acumuladas|Sin\s+cambio|Página)/i);
      const raw = stop !== -1 ? tail.slice(0, stop) : tail;
      const text = raw.replace(/\s+/g, ' ').trim();
      if (text.length < 5) continue;
      const email = emailMatch[1];
      const name = email.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
      comments.push({ score: 5, division: 'Shipping (Shipping)', name, text });
    }

    if (!comments.length) {
      const emailRegex = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+)/g;
      const hits: Array<{ email: string; idx: number }> = [];
      let em: RegExpExecArray | null;
      while ((em = emailRegex.exec(sectionText)) !== null) {
        hits.push({ email: em[1], idx: em.index });
      }
      for (let i = 0; i < hits.length; i++) {
        const start = hits[i].idx + hits[i].email.length;
        const end = i + 1 < hits.length ? hits[i + 1].idx : Math.min(start + 2000, sectionText.length);
        const raw = sectionText.slice(start, end);
        const text = raw.replace(/\s+/g, ' ').trim();
        if (text.length < 10) continue;
        const name = hits[i].email.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
        comments.push({ score: 5, division: 'Shipping (Shipping)', name, text });
      }
    }
  }

  return {
    respostas,
    fav,
    desfav,
    dimensions,
    comments,
    filters: {},
    overallRange: 'ALL',
    periodLabel: '2026',
    isHm: true,
    fileName: '',
  };
}
