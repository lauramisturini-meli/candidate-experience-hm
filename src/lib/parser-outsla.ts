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

// Names (lider/pbp/ta) are ALL CAPS; reasons contain lowercase letters.
// Try multi-space column split first (positional PDF preserves column gaps),
// then fall back to lowercase-detection for the reason.
function parseTail(tail: string): { ta: string; offTimeReason: string } {
  const t = tail.trim();
  if (!t) return { ta: '', offTimeReason: '' };

  // Primary: split on 2+ spaces — each column in the positional text is separated by large gaps
  const parts = t.split(/\s{2,}/).map(p => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const isAllCaps = (s: string) => !/[a-záéíóúñà-ü]/.test(s);
    const nameParts   = parts.filter(isAllCaps);
    const reasonParts = parts.filter(p => !isAllCaps(p));
    const ta          = nameParts.length >= 1 ? nameParts[nameParts.length - 1] : '';
    return { ta, offTimeReason: normalizeReason(reasonParts.join(' ')) };
  }

  // Fallback: single-space text — find where reason starts
  const m = t.match(/\S*[a-záéíóúñà-ü]\S*/);
  if (!m) return { ta: '', offTimeReason: '' };
  const idx       = t.indexOf(m[0]);
  const wordStart = idx > 0 ? t.lastIndexOf(' ', idx - 1) + 1 : 0;
  return { ta: '', offTimeReason: normalizeReason(t.slice(wordStart).trim()) };
}

function normalizeReason(raw: string): string {
  if (!raw) return '';
  if (/perfil.{0,15}nicho/i.test(raw))            return 'Perfil de Nicho';
  if (/demoras?.{0,10}hiring/i.test(raw))          return 'Demoras Hiring Manager';
  if (/cambio.{0,10}perfil/i.test(raw))            return 'Cambio de perfil';
  if (/background.{0,10}check/i.test(raw))         return 'Background check rejected';
  if (/busqueda\s+(?:interna|externa)/i.test(raw)) return 'Busqueda Interna/Externa';
  return raw;
}

export function isOutSlaReport(text: string): boolean {
  return (
    /id_internal/i.test(text) &&
    /time_to_offer/i.test(text) &&
    /off_time_reason/i.test(text)
  );
}

export function parseOutSlaReport(positionalText: string, fileName: string): PdfData {
  const rows: OutSlaRow[] = [];

  for (const line of positionalText.split('\n')) {
    const m = ROW_RE.exec(line.trim());
    if (!m) continue;

    const { ta, offTimeReason } = parseTail(m[9] ?? '');
    rows.push({
      idInternal:   m[1],
      positionCode: m[2],
      qExpectation: m[3],
      origin:       m[4],
      timeToOffer:  parseInt(m[5], 10),
      stage:        m[6].replace('\\+', '+'),
      seniority:    m[7],
      site:         m[8].trim(),
      offTimeReason,
      ta,
    });
  }

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
