import type { PdfData, OutSlaRow, OutSlaPayload } from '../types';

const SENIORITY_ALT = [
  'Analista Semi Senior',
  'Sr Team Leader - Shipping',
  'Team Leader - Shipping',
  'Analista',
  'Asistente',
  'Supervisor',
].join('|');

const STAGE_ALT = 'Entrevista HM|Entrevista TA|Reference Check|Sourcing';

// Anchors on fixed enum fields; names block is intentionally not captured (ta excluded per spec)
const ROW_RE = new RegExp(
  `(\\d{5,6})\\s+(\\d{7,10})\\s+(Q\\d)\\s+(\\d{1,4})\\s+` +
  `(New Position|Replacement)\\s+on going\\s+` +
  `(${STAGE_ALT})\\s+` +
  `.+?\\s+` +
  `(${SENIORITY_ALT})\\s+` +
  `(.+?\\([A-Z0-9_]+_EBA\\))\\s*(.*)$`
);

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
      timeToOffer:   parseInt(m[4], 10),
      origin:        m[5],
      stage:         m[6],
      seniority:     m[7],
      site:          m[8].trim(),
      offTimeReason: (m[9] ?? '').trim().replace(/^Busqueda\s+(?:Interna\/Externa|Interna|Externa)\s*/i, '').trim(),
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
