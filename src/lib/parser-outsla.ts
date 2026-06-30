import type { PdfData, OutSlaRow, OutSlaPayload } from '../types';

// Longest variants first to prevent premature partial matching
const SENIORITY_ALT = [
  'Analista Semi Senior',
  'Analista Senior',
  'Sr Team Leader - Shipping',
  'Team Leader - Shipping',
  'Analista',
  'Asistente',
  'Supervisor',
  'Gerente',
  'Coordinador',
  'Coordenador',
].join('|');

// "Entrevista L+L" uses escaped + for regex literal; longer variants first
const STAGE_ALT = [
  'Entrevista L\\+L',
  'Interview Panel',
  'Role Profiling',
  'Entrevista HM',
  'Entrevista TA',
  'Reference Check',
  'Sourcing',
].join('|');

// PDF column order: id | posCode | Q | origin | on going | timeToOffer | stage | seniority | site(...EBA) | lider | pbp | ta | reason
const ROW_RE = new RegExp(
  `(\\d{5,6})\\s+(\\d{7,10})\\s+(Q\\d)\\s+` +
  `(New Position|Replacement)\\s+on going\\s+(\\d{1,4})\\s+` +
  `(${STAGE_ALT})\\s+` +
  `(${SENIORITY_ALT})\\s+` +
  `(.+?\\([A-Z0-9_]+_EBA\\))\\s*(.*)`
);

function normalizeReason(raw: string): string {
  if (!raw) return '';
  if (/perfil.{0,15}nicho/i.test(raw))            return 'Perfil de Nicho';
  if (/demoras?.{0,10}hiring/i.test(raw))          return 'Demoras Hiring Manager';
  if (/cambio.{0,10}perfil/i.test(raw))            return 'Cambio de perfil';
  if (/background.{0,10}check/i.test(raw))         return 'Background check rejected';
  if (/busqueda\s+(?:interna|externa)/i.test(raw)) return 'Busqueda Interna/Externa';
  return raw;
}

// Split tail into: names block (ALL CAPS) and optional reason (has lowercase).
// Returns both so the caller can use preReason for TA detection.
function splitTail(tail: string): { preReason: string; offTimeReason: string } {
  const t = tail.trim();
  if (!t) return { preReason: '', offTimeReason: '' };

  // Primary: 2+ spaces means PDF had column spacing preserved
  const parts = t.split(/\s{2,}/).map(p => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const isAllCaps = (s: string) => !/[a-záéíóúñà-ü]/.test(s);
    return {
      preReason:     parts.filter(isAllCaps).join(' '),
      offTimeReason: normalizeReason(parts.filter(p => !isAllCaps(p)).join(' ')),
    };
  }

  // Fallback: single-space — find where reason starts (first word with lowercase)
  const m = t.match(/\S*[a-záéíóúñà-ü]\S*/);
  if (!m) return { preReason: t, offTimeReason: '' };
  const idx       = t.indexOf(m[0]);
  const wordStart = idx > 0 ? t.lastIndexOf(' ', idx - 1) + 1 : 0;
  return {
    preReason:     t.slice(0, wordStart).trim(),
    offTimeReason: normalizeReason(t.slice(wordStart).trim()),
  };
}

// Two-pass TA extraction: the TA name is always the LAST all-caps name block
// before the reason. It repeats across multiple rows for the same TA, so we
// identify it by finding N-word suffixes (N = 2..5) that appear in ≥ 2 rows.
//
// Key rules that prevent PBP name bleed-in:
//  1. Cap at 5 words — longer candidates blend the PBP's last words with the TA name.
//  2. Prefer HIGHEST FREQUENCY first — the true TA name appears in all the TA's rows,
//     while a contaminated suffix (PBP-last-word + TA-name) only appears in the subset
//     of rows sharing that same PBP, so it has lower frequency.
//  3. Break frequency ties with LONGEST match — picks the full name over sub-names.
function identifyTas(preSections: string[]): string[] {
  if (!preSections.length) return [];

  const MAX_TA_WORDS = 5;

  // Build frequency map: suffix → indices of rows where it is a trailing suffix
  const freqMap = new Map<string, number[]>();
  preSections.forEach((section, rowIdx) => {
    const words = section.trim().split(/\s+/).filter(Boolean);
    for (let len = 2; len <= Math.min(MAX_TA_WORDS, words.length); len++) {
      const key = words.slice(-len).join(' ');
      if (!freqMap.has(key)) freqMap.set(key, []);
      freqMap.get(key)!.push(rowIdx);
    }
  });

  // Candidates: suffixes that appear in ≥ 2 rows
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

  // For each row: highest frequency wins; ties broken by longest match
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

export function isOutSlaReport(text: string): boolean {
  return (
    /id_internal/i.test(text) &&
    /time_to_offer/i.test(text) &&
    /off_time_reason/i.test(text)
  );
}

export function parseOutSlaReport(positionalText: string, fileName: string): PdfData {
  // ── Pass 1: parse all rows, collecting pre-reason sections ─────────────────
  const rowData: Array<{
    partial: Omit<OutSlaRow, 'ta'>;
    preReason: string;
  }> = [];

  for (const line of positionalText.split('\n')) {
    const m = ROW_RE.exec(line.trim());
    if (!m) continue;

    const { preReason, offTimeReason } = splitTail(m[9] ?? '');

    rowData.push({
      partial: {
        idInternal:    m[1],
        positionCode:  m[2],
        qExpectation:  m[3],
        origin:        m[4],
        timeToOffer:   parseInt(m[5], 10),
        stage:         m[6].replace('\\+', '+'),
        seniority:     m[7],
        site:          m[8].trim(),
        offTimeReason,
      },
      preReason,
    });
  }

  // ── Pass 2: identify TA names via suffix frequency ─────────────────────────
  const tas = identifyTas(rowData.map(r => r.preReason));

  const rows: OutSlaRow[] = rowData.map((r, i) => ({
    ...r.partial,
    ta: tas[i] || undefined,
  }));

  const payload: OutSlaPayload = { rows };

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
    outSlaPayload: payload,
  };
}
