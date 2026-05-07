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
  /^Favorabilidad por (?:sentencia|pregunta|afirmaci[oó]n|quest[aã]o)$/i,
  /^Desfavorabilidad por (?:sentencia|pregunta|afirmaci[oó]n|quest[aã]o)$/i,
  /^Campo abierto$/, /^Questão aberta$/, /^Pregunta abierto$/, /^Recuento$/,
  /^Sendo 1 ruim e 5 excelente/, /^Siendo 1 malo y 5 excelente/,
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
      if (lettersOnly.startsWith('desfavorabilidad')) kind = 'desfav';
      else if (lettersOnly.startsWith('favorabilidad')) kind = 'fav';
      else continue;
      if ((kind === 'fav' && fav != null) || (kind === 'desfav' && desfav != null)) continue;

      const val = findNearestPercent(tokens, i, kind);
      if (val) setValue(kind, val);
    }
  }

  return { fav, desfav };
}

function extractDimensions(pageText: string): Array<{ name: string; fav: string; desfav: string }> {
  const desfavRe   = /Desfavorabilidad[ae]?\s+por\s+(?:sentencia|pregunta|afirmaci[oó]n|quest[aã]o|senten[çc]a|dimens[aã]o|dimensi[oó]n)/i;
  const favSplitRe = /(?<!des)Favorabilidad[ae]?\s+por\s+(?:sentencia|pregunta|afirmaci[oó]n|quest[aã]o|senten[çc]a|dimens[aã]o|dimensi[oó]n)/i;

  const favParts = pageText.split(favSplitRe);
  if (favParts.length < 2) return [];

  const beforeFav = favParts[0];
  const afterFav  = favParts[1];

  // Desfav section may come BEFORE or AFTER the fav section
  let favBlock    = afterFav;
  let desfavBlock = '';

  if (desfavRe.test(afterFav)) {
    // Desfav comes after fav (old format)
    const [fb, afterDesfavRaw] = afterFav.split(desfavRe);
    favBlock    = fb;
    desfavBlock = (afterDesfavRaw || '').split(/Campo abierto|Questão aberta|Pregunta abierto|Filtros/)[0];
  } else if (desfavRe.test(beforeFav)) {
    // Desfav comes before fav (new PT format)
    const desfavParts = beforeFav.split(desfavRe);
    desfavBlock = desfavParts[desfavParts.length - 1]
      .split(/Campo abierto|Questão aberta|Pregunta abierto|Filtros|(?=Favorabilidad)/i)[0];
  }

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

// ── Internal candidate survey (different Qualtrics template) ─────────────────

// Patterns cover both Spanish (ES/LATAM) and Portuguese (PT-BR) survey variants
const INTERNAL_Q_PATTERNS = [
  // Spanish
  /Tuve\s+visibilidad\s+durante\s+el\s+proceso/i,
  /Siendo\s+1\s+malo\s+y\s+5\s+excelente/i,
  /Recib[ií]\s+feedback\s+constructivo/i,
  /Comprend[ií]\s+desde\s+el\s+inicio/i,
  /Comprend[ií]\s+de\s+manera\s+clara/i,
  // Portuguese (PT-BR)
  /Tive\s+visibilidade\s+durante\s+o\s+processo/i,
  /Sendo\s+1\s+ruim\s+e\s+5\s+excelente/i,
  /Recebi\s+feedback\s+construtivo/i,
  /Compreendi\s+desde\s+o\s+in[íi]cio/i,
  /Compreendi\s+de\s+maneira\s+clara/i,
];

function isInternalSurveyFormat(text: string): boolean {
  const t = text.normalize('NFC');
  return INTERNAL_Q_PATTERNS.filter(p => p.test(t)).length >= 3;
}

function extractDimensionsInternal(rawText: string): Array<{ name: string; fav: string; desfav: string }> {
  // Normalize Unicode so accented chars match consistently
  const text = rawText.normalize('NFC');

  const tableStart = text.search(/(?:Teniendo|Tendo)\s+en?\s+cuenta[\s\S]{0,20}afirmac/i);
  const searchText = tableStart >= 0 ? text.slice(tableStart) : text;

  const dims: Array<{ name: string; fav: string; desfav: string; pos: number }> = [];

  for (const pattern of INTERNAL_Q_PATTERNS) {
    const re = new RegExp(pattern.source, 'i');
    const m = re.exec(searchText);
    if (!m) continue;

    // Use up to 200 chars after the match to find row data
    const after = searchText.slice(m.index + m[0].length, m.index + m[0].length + 200);

    // Primary: look for "[count] [avg] [fav%]" — the specific table-row format
    // This avoids capturing percentages from adjacent rows
    const rowM = after.match(/\d{1,4}[\s\n]+\d[\s\n]+(\d{1,3})%/);
    if (rowM) {
      const fav = rowM[1] + '%';
      // After fav%, look for up to 2 more consecutive percentages (neutral, desfav)
      const matchIndex = rowM.index ?? 0;
      const afterFav = after.slice(matchIndex + rowM[0].length, matchIndex + rowM[0].length + 60);
      const extraPcts = [...afterFav.matchAll(/\b(\d{1,3})%\b/g)].map(x => parseInt(x[1], 10));
      const favNum = parseInt(rowM[1], 10);
      let desfav = '—';
      if (extraPcts.length >= 2) {
        // Three values: fav + neutral + desfav — use the last one as desfav
        desfav = extraPcts[extraPcts.length - 1] + '%';
      } else if (extraPcts.length === 1) {
        // Two values: if fav + second ≈ 100 → second is non-fav combined; if < 100 → likely desfav
        const second = extraPcts[0];
        if (favNum + second <= 100 && second > 0) desfav = second + '%';
      }
      dims.push({ name: m[0].trim().replace(/\s+/g, ' '), fav, desfav, pos: m.index });
      continue;
    }

    // Fallback: first percentage within window
    const pctM = after.match(/\b(\d{1,3})%/);
    dims.push({
      name:   m[0].trim().replace(/\s+/g, ' '),
      fav:    pctM ? pctM[1] + '%' : '—',
      desfav: '—',
      pos:    m.index,
    });
  }

  // Positional fallback: if any fav still missing, pair with ordered pcts
  if (dims.some(d => d.fav === '—')) {
    const allPcts: string[] = [];
    const pctRe = /\b(\d{1,3})%\b/g;
    let pm: RegExpExecArray | null;
    while ((pm = pctRe.exec(searchText)) !== null) allPcts.push(pm[1] + '%');
    const sorted = [...dims].sort((a, b) => a.pos - b.pos);
    let pi = 0;
    for (const d of sorted) {
      if (d.fav === '—' && pi < allPcts.length) d.fav = allPcts[pi++];
    }
  }

  return dims.map(({ name, fav, desfav }) => ({ name, fav, desfav }));
}

function extractFavDesfavInternal(text: string): { fav: string | null; desfav: string | null } {
  // NPS question — Spanish or Portuguese variant
  const npsM = text.match(/(?:Siendo\s+1\s+malo|Sendo\s+1\s+ruim)[\s\S]{0,250}?(\d{1,3})%/i);
  if (npsM) return { fav: npsM[1] + '%', desfav: null };

  // Fallback: find any standalone pct (50–100) before the dimension table
  const tableStart = text.search(/(?:Teniendo|Tendo)\s+en?\s+cuenta[\s\S]{0,20}afirmac/i);
  const searchArea  = tableStart > 200 ? text.slice(0, tableStart) : text.slice(0, 3000);
  const pcts = [...searchArea.matchAll(/\b(\d{1,3})%\b/g)]
    .map(m => parseInt(m[1], 10))
    .filter(v => v >= 50 && v <= 100);
  if (pcts.length) return { fav: pcts[pcts.length - 1] + '%', desfav: null };

  return { fav: null, desfav: null };
}

function extractRespuestasInternal(text: string): number | null {
  const patterns = [
    // "20\n-1 ao longo da última semana" — delta below count is a strong signal
    /\b(\d{1,4})\s*\n\s*[−-]\d+\s+ao\s+longo/i,
    // Spanish
    /Cantidad\s+de\s*\n?\s*[Rr]espuestas?[\s\S]{0,60}?\n\s*(\d{1,6})/,
    /Cantidad\s+de\s+[Rr]espuestas?\s+(\d{1,6})/,
    // Portuguese
    /Quantidade\s+de\s*\n?\s*[Rr]espostas?[\s\S]{0,60}?\n\s*(\d{1,6})/,
    /Quantidade\s+de\s+[Rr]espostas?\s+(\d{1,6})/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return parseInt(m[1], 10);
  }
  return null;
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
  // Normalize Unicode so accented characters match consistently across PDF encodings
  const normFull  = fullText.normalize('NFC');
  const normFirst = firstPage.normalize('NFC');
  const isInternal = isInternalSurveyFormat(normFull);

  let respostas: number | null = null;
  if (isInternal) {
    respostas = extractRespuestasInternal(normFull) ?? extractRespuestasInternal(normFirst);
  }
  if (respostas === null) {
    const respPatterns = [
      /Cantidad de\s*\n?\s*Respuestas[\s\S]*?\n\s*(\d{1,6})\s*\n/,
      /Cantidad de\s+Respuestas[\s\S]{0,200}?(\d{1,6})/,
      /Respuestas[\s\S]{0,80}?\n(\d{1,6})\b/,
    ];
    for (const re of respPatterns) {
      const m = normFirst.match(re) ?? normFull.match(re);
      if (m) { respostas = parseInt(m[1], 10); break; }
    }
  }

  let fav: string | null;
  let desfav: string | null;
  let dimensions: Array<{ name: string; fav: string; desfav: string }>;

  if (isInternal) {
    const fd = extractFavDesfavInternal(normFull);
    fav    = fd.fav;
    desfav = fd.desfav;
    dimensions = extractDimensionsInternal(normFull);
  } else {
    // Find the page that contains the summary/fav data — not necessarily page 0
    const normPages = pageTexts.map(p => p.normalize('NFC'));
    const summaryPage = normPages.find(p =>
      /favorabilidad/i.test(p) && /desfavorabilidad/i.test(p)
    ) ?? normPages.find(p => /favorabilidad/i.test(p)) ?? normFirst;

    const fd = extractFavDesfav(summaryPage);
    fav    = fd.fav;
    desfav = fd.desfav;

    // Use fullText for dimensions — fav and desfav sections may be on different pages
    dimensions = extractDimensions(normFull);

    if (!fav && !desfav) {
      const fdFull = extractFavDesfav(normFull);
      fav    = fdFull.fav;
      desfav = fdFull.desfav;
    }

  }

  const filters = extractFilters(normFirst);

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
