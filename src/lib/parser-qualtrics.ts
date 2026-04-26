import type { PdfData } from '../types';

const DIM_TRANSLATIONS: Record<string, string> = {
  'Comprensión de proceso':   'Compreensão do processo',
  'Descripción posición':     'Descrição da posição',
  'Excelencia en entrevista': 'Excelência na entrevista',
  'Ser yo mism@':             'Ser eu mesmo(a)',
  'Visibilidad proceso':      'Visibilidade do processo',
};

const DIM_ORDER_ES = [
  'Comprensión de proceso',
  'Descripción posición',
  'Excelencia en entrevista',
  'Ser yo mism@',
  'Visibilidad proceso',
];

const BOUNDARY_RES = [
  /^Cantidad de$/, /^Filtros$/, /Candidate Experience Survey/,
  /^Favorabilidad por sentencia$/, /^Desfavorabilidad por sentencia$/,
  /^Campo abierto$/, /^Pregunta abierto$/, /^Recuento$/,
  /^Siendo 1 malo y 5 excelente/,
];

function isScoreLine(s: string): boolean { return /^[1-5]$/.test(s); }
function isDivisionLine(s: string): boolean { return !!s && /\([^)]+\)/.test(s) && !s.includes('%') && s.length < 120; }
function isBoundaryLine(s: string): boolean { return BOUNDARY_RES.some(re => re.test(s)); }

function findNearestPercent(tokens: string[], labelIdx: number, kind: 'fav' | 'desfav'): string | null {
  const scaleFav = new Set([0, 30, 70, 100]);
  const scaleDesfav = new Set([0, 20, 50, 100]);
  const scale = kind === 'desfav' ? scaleDesfav : scaleFav;

  const parseTok = (s: string) => {
    const m = (s || '').match(/^(\d{1,3})%$/);
    return m ? parseInt(m[1], 10) : null;
  };

  const candidates: Array<{ v: number; dist: number; scaleHit: boolean }> = [];
  for (let dist = 1; dist <= 6; dist++) {
    for (const sign of [-1, 1]) {
      const j = labelIdx + sign * dist;
      if (j < 0 || j >= tokens.length) continue;
      const v = parseTok(tokens[j]);
      if (v != null) candidates.push({ v, dist, scaleHit: scale.has(v) });
    }
  }
  const nonScale = candidates.find(c => !c.scaleHit);
  if (nonScale) return nonScale.v + '%';
  if (candidates.length) return candidates[0].v + '%';
  return null;
}

function stripKeyword(cluster: string, keyword: string): string {
  const kLower = keyword.toLowerCase();
  const cLower = cluster.toLowerCase();
  let result = '';
  let kIdx = 0;
  for (let i = 0; i < cluster.length; i++) {
    if (kIdx < kLower.length && cLower[i] === kLower[kIdx]) {
      kIdx++;
    } else {
      result += cluster[i];
    }
  }
  return result;
}

function extractFavDesfav(pageText: string): { fav: string | null; desfav: string | null } {
  const tokens = pageText.split(/\s+/).filter(Boolean);
  let fav: string | null = null;
  let desfav: string | null = null;

  const setValue = (kind: 'fav' | 'desfav', val: string) => {
    if (!val) return;
    if (kind === 'fav' && fav == null) fav = val;
    else if (kind === 'desfav' && desfav == null) desfav = val;
  };

  for (const tok of tokens) {
    if (!/lidad/i.test(tok)) continue;
    const lettersOnly = tok.toLowerCase().replace(/[^a-z]/g, '');
    let kind: 'fav' | 'desfav' | null = null;
    let keyword = '';
    if (lettersOnly.startsWith('desfavorabilidad')) { kind = 'desfav'; keyword = 'Desfavorabilidad'; }
    else if (lettersOnly.startsWith('favorabilidad')) { kind = 'fav'; keyword = 'Favorabilidad'; }
    else continue;

    const residual = stripKeyword(tok, keyword);
    const m = residual.match(/(\d{1,3})/);
    if (m) setValue(kind, m[1] + '%');
  }

  if (fav == null || desfav == null) {
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (!/lidad/i.test(tok)) continue;
      const lettersOnly = tok.toLowerCase().replace(/[^a-z]/g, '');
      let kind: 'fav' | 'desfav' | null = null;
      if (lettersOnly === 'desfavorabilidad') kind = 'desfav';
      else if (lettersOnly === 'favorabilidad') kind = 'fav';
      else continue;
      if ((kind === 'fav' && fav != null) || (kind === 'desfav' && desfav != null)) continue;

      const val = findNearestPercent(tokens, i, kind);
      if (val) setValue(kind, val);
    }
  }

  return { fav, desfav };
}

function extractDimensions(pageText: string): Array<{ name: string; fav: string; desfav: string }> {
  const parts = pageText.split('Favorabilidad por sentencia');
  if (parts.length < 2) return [];

  const afterFav = parts[1];
  const [favBlock, afterDesfavRaw] = afterFav.split('Desfavorabilidad por sentencia');
  const desfavBlock = (afterDesfavRaw || '').split(/Campo abierto|Pregunta abierto|Filtros/)[0] || '';

  const favLines    = favBlock.split('\n').map(l => l.trim()).filter(Boolean);
  const desfavLines = desfavBlock.split('\n').map(l => l.trim()).filter(Boolean);

  const pickValues = (lines: string[], count: number): string[] => {
    const isValue = (s: string) => /^-$/.test(s) || /^\d+%$/.test(s);
    return lines.filter(isValue).slice(0, count);
  };

  const favValues    = pickValues(favLines, 5);
  const desfavValues = pickValues(desfavLines, 5);

  return DIM_ORDER_ES.map((esName, i) => ({
    name:   DIM_TRANSLATIONS[esName] || esName,
    fav:    favValues[i]    || '-',
    desfav: desfavValues[i] || '-',
  })).filter(d => d.fav !== '-' || d.desfav !== '-');
}

function extractFilters(pageText: string): Record<string, string> {
  const m = pageText.match(/Filtros\s*\n([\s\S]+?)(?=\n(?:Candidate Experience|Cantidad de|Pregunta abierto|$))/);
  if (!m) return {};
  const raw = m[1].replace(/\s+/g, ' ').trim();
  const result: Record<string, string> = { raw };
  const keys = ['País', 'División', 'TA Owner', 'Evaluación overall', 'Fecha inicio encuesta', 'Seniority'];
  const keyAlt = keys.map(k => k.replace(/ /g, '\\s+')).join('|');
  const re = new RegExp('(' + keyAlt + ')\\s*:\\s*([^:]+?)(?=\\s+(?:' + keyAlt + ')\\s*:|$)', 'g');
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw)) !== null) {
    const key = match[1].replace(/\s+/g, ' ');
    result[key] = match[2].trim();
  }
  return result;
}

function normalizeOverallRange(filters: Record<string, string>): string {
  const raw = filters['Evaluación overall'];
  if (!raw) return 'ALL';
  const m = raw.match(/(\d)\s*-\s*(\d)/);
  if (!m) return 'ALL';
  const lo = parseInt(m[1], 10), hi = parseInt(m[2], 10);
  if (lo === 1 && hi === 5) return 'ALL';
  return `${lo}-${hi}`;
}

function extractComments(fullText: string): Array<{ score: number; division: string; name: string; text: string }> {
  const lines = fullText.split('\n').map(l => l.trim());
  const comments: Array<{ score: number; division: string; name: string; text: string }> = [];
  let i = 0;
  while (i < lines.length) {
    const next = lines[i + 1] ?? '';
    if (isScoreLine(lines[i]) && isDivisionLine(next)) {
      const score = parseInt(lines[i], 10);
      const division = next;
      const name = lines[i + 2] ?? '';
      let text = '';
      let j = i + 3;
      while (j < lines.length) {
        const peek = lines[j] ?? '';
        if (!peek) { j++; continue; }
        if (isScoreLine(peek) && isDivisionLine(lines[j + 1] ?? '')) break;
        if (isBoundaryLine(peek)) break;
        text += (text ? ' ' : '') + peek;
        j++;
      }
      if (name && !isScoreLine(name) && !isDivisionLine(name)) {
        comments.push({ score, division, name, text: text.trim() });
      }
      i = j;
      continue;
    }
    i++;
  }
  return comments;
}

function extractCommentsLoose(fullText: string): Array<{ score: number; division: string; name: string; text: string }> {
  const comments: Array<{ score: number; division: string; name: string; text: string }> = [];
  const re = /(?:^|\n)\s*([1-5])\s*\n\s*([^\n]*\([^)]+\)[^\n]*)\s*\n\s*([^\n]+?)\s*\n([\s\S]*?)(?=\n\s*[1-5]\s*\n\s*[^\n]*\([^)]+\)|\n\s*(?:Cantidad de|Filtros|Campo abierto|Pregunta abierto|Favorabilidad por sentencia|Desfavorabilidad por sentencia|Recuento|Candidate Experience Survey)\b|\n{3,}|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fullText)) !== null) {
    const name = m[3].trim();
    if (!name || /^[1-5]$/.test(name)) continue;
    comments.push({
      score: parseInt(m[1], 10),
      division: m[2].trim(),
      name,
      text: m[4].trim().replace(/\s+/g, ' '),
    });
  }
  return comments;
}

export function parseQualtricsReport(fullText: string, pageTexts: string[]): PdfData {
  const firstPage = pageTexts[0] || '';
  let respostas: number | null = null;
  const respPatterns = [
    /Cantidad de\s*\n?\s*Respuestas[\s\S]*?\n\s*(\d{1,6})\s*\n/,
    /Cantidad de\s+Respuestas[\s\S]{0,200}?(\d{1,6})/,
    /Respuestas[\s\S]{0,80}?\n(\d{1,6})\b/,
  ];
  for (const re of respPatterns) {
    const m = firstPage.match(re);
    if (m) { respostas = parseInt(m[1], 10); break; }
  }

  const { fav, desfav } = extractFavDesfav(firstPage);
  const dimensions = extractDimensions(firstPage);
  const filters = extractFilters(firstPage);

  let comments = extractComments(fullText);
  if (!comments.length) comments = extractCommentsLoose(fullText);

  return {
    respostas,
    fav: fav || '—',
    desfav: desfav || '—',
    dimensions,
    filters,
    comments,
    overallRange: normalizeOverallRange(filters),
    periodLabel: '',
    isHm: false,
    fileName: '',
  };
}
