import type { PdfData, OutSlaRow } from '../types';

// ── Seniority list — longest first ───────────────────────────────────────────
const SENIORITY_ALT = [
  'Analista Semi Senior',
  'Analista Senior',
  'Sr Team Leader - Shipping',
  'Team Leader - Shipping',
  'Specialist',
  'Analista',
  'Asistente',
  'Supervisor',
  'Gerente',
  'Coordinador',
  'Coordenador',
].join('|');

// ── Stage list — longest first ────────────────────────────────────────────────
const STAGE_ALT = [
  'Entrevista L\\+L',
  'Interview Panel',
  'Role Profiling',
  'Entrevista HM',
  'Entrevista TA',
  'Reference Check',
  'Worksample',
  'Sourcing',
].join('|');

// Site code: accepts _EBA, _MLB, and similar 2-4 letter suffixes
const SITE_PAT = `(.+?\\([A-Z0-9_]+_[A-Z]{2,4}\\))`;

// ── Two regex variants for the two known column orders ────────────────────────
//   Old format (11-06 and earlier): ...days | STAGE | SENIORITY | site...
//   New format (10-07 and later):   ...days | SENIORITY | STAGE  | site...
const ROW_RE_OLD = new RegExp(
  `(\\d{5,6})\\s+(\\d{7,10})\\s+(Q\\d)\\s+` +
  `(New Position|Replacement)\\s+on going\\s+(\\d{1,4})\\s+` +
  `(${STAGE_ALT})\\s+(${SENIORITY_ALT})\\s+` +
  `${SITE_PAT}\\s*(.*)`
);
const ROW_RE_NEW = new RegExp(
  `(\\d{5,6})\\s+(\\d{7,10})\\s+(Q\\d)\\s+` +
  `(New Position|Replacement)\\s+on going\\s+(\\d{1,4})\\s+` +
  `(${SENIORITY_ALT})\\s+(${STAGE_ALT})\\s+` +
  `${SITE_PAT}\\s*(.*)`
);

interface RowMatch {
  idInternal: string;
  positionCode: string;
  qExpectation: string;
  origin: string;
  timeToOffer: number;
  stage: string;
  seniority: string;
  site: string;
  tail: string;
}

function matchRow(line: string): RowMatch | null {
  // Try new format first (seniority before stage — 10-07 onwards)
  const mNew = ROW_RE_NEW.exec(line);
  if (mNew) {
    return {
      idInternal:   mNew[1],
      positionCode: mNew[2],
      qExpectation: mNew[3],
      origin:       mNew[4],
      timeToOffer:  parseInt(mNew[5], 10),
      seniority:    mNew[6],
      stage:        mNew[7].replace('\\+', '+'),
      site:         mNew[8].trim(),
      tail:         mNew[9] ?? '',
    };
  }
  // Fall back to old format (stage before seniority — 11-06 and earlier)
  const mOld = ROW_RE_OLD.exec(line);
  if (mOld) {
    return {
      idInternal:   mOld[1],
      positionCode: mOld[2],
      qExpectation: mOld[3],
      origin:       mOld[4],
      timeToOffer:  parseInt(mOld[5], 10),
      stage:        mOld[6].replace('\\+', '+'),
      seniority:    mOld[7],
      site:         mOld[8].trim(),
      tail:         mOld[9] ?? '',
    };
  }
  return null;
}

// ── Reason normalisation ──────────────────────────────────────────────────────
function normalizeReason(raw: string): string {
  if (!raw) return '';
  if (/perfil.{0,15}nicho/i.test(raw))            return 'Perfil de Nicho';
  if (/demoras?.{0,10}hiring/i.test(raw))          return 'Demoras Hiring Manager';
  if (/cambio.{0,10}perfil/i.test(raw))            return 'Cambio de perfil';
  if (/background.{0,10}check/i.test(raw))         return 'Background check rejected';
  if (/offer.{0,10}reject/i.test(raw))             return 'Offer rejected';
  if (/busqueda\s+(?:interna|externa)/i.test(raw)) return 'Busqueda Interna/Externa';
  return raw;
}

// ── Tail splitting ────────────────────────────────────────────────────────────
//
// New format tail (10-07): <LIDER> <PBP> <TA> [PCD] <Extra? Hiring Plan> <type> [reason]
// Old format tail (11-06): <LIDER> <PBP> <TA> [reason]
//
// "Hiring Plan" is a reliable separator: everything before it = names (+optional PCD tag),
// everything after the search-type phrase = reason.
//
const POSITION_TYPE_RE = /\b(?:Extra )?Hiring Plan\b/;
const SEARCH_TYPE_RE   = /\bBusqueda (?:Interna\/)?Externa\b|\bOportunidades Meli\b/;

function splitTail(tail: string): { preReason: string; offTimeReason: string } {
  const t = tail.trim();
  if (!t) return { preReason: '', offTimeReason: '' };

  // New format: "Hiring Plan" acts as separator
  const ptMatch = POSITION_TYPE_RE.exec(t);
  if (ptMatch) {
    // Strip optional trailing PCD tag from the names block
    let preReason = t.slice(0, ptMatch.index).trim().replace(/\s+PCD\s*$/, '').trim();

    const afterPt  = t.slice(ptMatch.index + ptMatch[0].length);
    const stMatch  = SEARCH_TYPE_RE.exec(afterPt);
    const afterType = stMatch
      ? afterPt.slice(stMatch.index + stMatch[0].length).trim()
      : afterPt.trim();

    return { preReason, offTimeReason: normalizeReason(afterType) };
  }

  // Old format: try 2+ space column split (positional PDF may preserve gaps)
  const parts = t.split(/\s{2,}/).map(p => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const isAllCaps = (s: string) => !/[a-záéíóúñà-ü]/.test(s);
    return {
      preReason:     parts.filter(isAllCaps).join(' '),
      offTimeReason: normalizeReason(parts.filter(p => !isAllCaps(p)).join(' ')),
    };
  }

  // Old format fallback: find reason by first lowercase-containing word
  const m = t.match(/\S*[a-záéíóúñà-ü]\S*/);
  if (!m) return { preReason: t, offTimeReason: '' };
  const idx       = t.indexOf(m[0]);
  const wordStart = idx > 0 ? t.lastIndexOf(' ', idx - 1) + 1 : 0;
  return {
    preReason:     t.slice(0, wordStart).trim(),
    offTimeReason: normalizeReason(t.slice(wordStart).trim()),
  };
}

// ── Two-pass TA extraction ────────────────────────────────────────────────────
//
// The TA name is always the LAST all-caps name block in the pre-reason section.
// It repeats across multiple rows for the same TA, so we identify it by finding
// N-word suffixes (N = 2..5) that appear as trailing suffix in ≥ 2 rows.
//
// Rules to avoid PBP name bleed-in:
//  1. Cap at 5 words.
//  2. Prefer HIGHEST FREQUENCY — the true TA name covers all that TA's rows;
//     a contaminated suffix (PBP-last-word + TA-name) covers only the rows
//     sharing that same PBP, so it has lower frequency.
//  3. Break ties with LONGEST match (picks full name over sub-names).
//
function identifyTas(preSections: string[]): string[] {
  if (!preSections.length) return [];

  const MAX_TA_WORDS = 5;

  const freqMap = new Map<string, number[]>();
  preSections.forEach((section, rowIdx) => {
    const words = section.trim().split(/\s+/).filter(Boolean);
    for (let len = 2; len <= Math.min(MAX_TA_WORDS, words.length); len++) {
      const key = words.slice(-len).join(' ');
      if (!freqMap.has(key)) freqMap.set(key, []);
      freqMap.get(key)!.push(rowIdx);
    }
  });

  const candidates = new Map<string, { freq: number; len: number; rowSet: Set<number> }>();
  for (const [suffix, indices] of freqMap) {
    if (indices.length >= 2) {
      candidates.set(suffix, {
        freq:   indices.length,
        len:    suffix.split(/\s+/).length,
        rowSet: new Set(indices),
      });
    }
  }

  return preSections.map((section, rowIdx) => {
    const words = section.trim().split(/\s+/).filter(Boolean);
    let bestMatch = '';
    let bestFreq  = 0;
    let bestLen   = 0;
    for (const [suffix, { freq, len, rowSet }] of candidates) {
      if (!rowSet.has(rowIdx)) continue;
      if (words.slice(-len).join(' ') !== suffix) continue;
      if (freq > bestFreq || (freq === bestFreq && len > bestLen)) {
        bestMatch = suffix;
        bestFreq  = freq;
        bestLen   = len;
      }
    }
    return bestMatch;
  });
}

// ── Detection ─────────────────────────────────────────────────────────────────
export function isOutSlaReport(text: string): boolean {
  // time_to_offer + off_time_reason together are unique to this report type.
  return /time_to_offer/i.test(text) && /off_time_reason/i.test(text);
}

// ── Main parser ───────────────────────────────────────────────────────────────
export function parseOutSlaReport(positionalText: string, fileName: string): PdfData {
  // Pass 1: parse all rows and collect pre-reason sections
  const rowData: Array<{ partial: Omit<OutSlaRow, 'ta'>; preReason: string }> = [];

  for (const line of positionalText.split('\n')) {
    const r = matchRow(line.trim());
    if (!r) continue;

    const { preReason, offTimeReason } = splitTail(r.tail);

    rowData.push({
      partial: {
        idInternal:    r.idInternal,
        positionCode:  r.positionCode,
        qExpectation:  r.qExpectation,
        origin:        r.origin,
        timeToOffer:   r.timeToOffer,
        stage:         r.stage,
        seniority:     r.seniority,
        site:          r.site,
        offTimeReason,
      },
      preReason,
    });
  }

  // Pass 2: identify TA names via suffix frequency
  const tas = identifyTas(rowData.map(r => r.preReason));

  const rows: OutSlaRow[] = rowData.map((r, i) => ({
    ...r.partial,
    ta: tas[i] || undefined,
  }));

  return {
    respostas: rows.length,
    fav: '',
    desfav: '',
    dimensions: [],
    comments: [],
    filters: {},
    overallRange: '',
    periodLabel: 'Out SLA',
    isHm: false,
    fileName,
    isOutSla: true,
    outSlaPayload: { rows },
  };
}
