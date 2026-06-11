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
// Strip leading all-caps blocks to isolate the reason.
function extractReason(tail: string): string {
  const t = tail.trim();
  if (!t) return '';
  // Find first word that has a lowercase letter — that's where the reason starts
  const m = t.match(/\S*[a-záéíóúñà-ü]\S*/);
  if (!m) return '';
  const idx = t.indexOf(m[0]);
  const wordStart = idx > 0 ? t.lastIndexOf(' ', idx - 1) + 1 : 0;
  return normalizeReason(t.slice(wordStart).trim());
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

    rows.push({
      idInternal:    m[1],
      positionCode:  m[2],
      qExpectation:  m[3],
      origin:        m[4],
      timeToOffer:   parseInt(m[5], 10),
      stage:         m[6].replace('\\+', '+'),
      seniority:     m[7],
      site:          m[8].trim(),
      offTimeReason: extractReason(m[9] ?? ''),
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
