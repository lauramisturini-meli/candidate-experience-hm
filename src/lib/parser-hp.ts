import type { PdfData, HpPayload, HpLayerRow } from '../types';

export function isHpReport(text: string): boolean {
  return /Plan\s+Shipping\s+Individuales/i.test(text)
      || (/Posiciones\s+cerradas/i.test(text) && /Sin\s+Activar/i.test(text) && /On\s+Going/i.test(text));
}

function parseSpanishNumber(raw: string): number {
  // "1.799" → 1799, "31,18" → 31.18
  const cleaned = raw.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned);
}

function extractAfterLabel(text: string, labelPattern: RegExp, windowSize = 200): number | null {
  const m = labelPattern.exec(text);
  if (!m) return null;
  const slice = text.slice(m.index + m[0].length, m.index + m[0].length + windowSize);
  const numMatch = slice.match(/([\d.,]+)/);
  if (!numMatch) return null;
  const v = parseSpanishNumber(numMatch[1]);
  return isNaN(v) ? null : v;
}

function extractLayerRows(text: string): HpLayerRow[] {
  const rows: HpLayerRow[] = [];

  // Known layer identifiers in the HP Shipping PDF
  const layerPatterns: Array<{ label: string; pattern: RegExp }> = [
    { label: 'TLs',             pattern: /\bTLs?\b/i },
    { label: 'Analistas & Sups', pattern: /Analistas\s*(?:&|y)\s*Sups?/i },
    { label: 'Manager',          pattern: /\bManagers?\b/i },
  ];

  // Find the table section anchored after "Hiring plan"
  const tableStart = text.search(/Hiring\s+plan\s+\d{4}/i);
  const tableSection = tableStart !== -1 ? text.slice(tableStart) : text;

  for (const { label, pattern } of layerPatterns) {
    const m = pattern.exec(tableSection);
    if (!m) continue;

    // Extract 5 integers that follow the layer name (cerradas, sinActivar, onGoing, reemplazos, rotaciones)
    const slice = tableSection.slice(m.index + m[0].length, m.index + m[0].length + 400);
    const nums = [...slice.matchAll(/\b(\d{1,5})\b/g)].map(n => parseInt(n[1], 10)).filter(n => !isNaN(n));
    if (nums.length < 5) continue;

    // Determine equipo: look backwards for an equipo name (e.g., "TTE BRASIL")
    const before = tableSection.slice(Math.max(0, m.index - 200), m.index);
    const equipoMatch = before.match(/([A-Z]{2,}(?:\s+[A-Z]{2,})+)\s*$/);
    const equipo = equipoMatch ? equipoMatch[1].trim() : 'TTE BRASIL';

    rows.push({
      equipo,
      agrupLayer: label,
      cerradas: nums[0],
      sinActivar: nums[1],
      onGoing: nums[2],
      reemplazosProyectados: nums[3],
      rotacionesProyectadas: nums[4],
    });
  }

  return rows;
}

export function parseHpReport(positionalText: string): PdfData {
  const text = positionalText;

  // Extract title and year
  const titleMatch = text.match(/Plan\s+Shipping\s+Individuales\s*[-–—]?\s*(20\d{2})/i)
                  || text.match(/HP\s*[-–—]\s*Shipping[\s\S]{0,60}(20\d{2})/i);
  const year = titleMatch ? titleMatch[1] : String(new Date().getFullYear());
  const title = titleMatch ? `Plan Shipping Individuales - ${year}` : `HP Shipping ${year}`;

  const cerradas = extractAfterLabel(text, /Posiciones\s+cerradas/i) ?? 0;
  const onGoing = extractAfterLabel(text, /Posiciones\s+On\s+Going/i) ?? 0;
  const sinActivar = extractAfterLabel(text, /Posiciones\s+Sin\s+activar/i) ?? 0;
  const operadoresProyectados = extractAfterLabel(text, /Operadores\s+proyectados/i) ?? 0;
  const posicionesTotal = extractAfterLabel(text, /Total\s+de\s+posiciones/i) ?? 0;

  // Porcentaje de Avance — may appear as "31,18%" or "31,18"
  const avanceMatch = text.match(/Porcentaje\s+de\s+Avance[\s\S]{0,100}?([\d]+[,.][\d]+|[\d]+)\s*%?/i);
  let porcentajeAvance = 0;
  if (avanceMatch) {
    porcentajeAvance = parseSpanishNumber(avanceMatch[1]);
  }

  // Reemplazos proyectados — the first occurrence in KPI area (not the table)
  // It appears as a KPI card before the table
  const reemplazosMatch = text.match(/Reemplazos\s+proyectados[\s\S]{0,150}?([\d.,]+)/i);
  const reemplazosProyectados = reemplazosMatch ? parseSpanishNumber(reemplazosMatch[1]) : 0;

  const rows = extractLayerRows(text);

  const hpPayload: HpPayload = {
    title,
    year,
    posicionesTotal,
    cerradas,
    onGoing,
    sinActivar,
    reemplazosProyectados,
    operadoresProyectados,
    porcentajeAvance,
    rows,
  };

  return {
    respostas: null,
    fav: '—',
    desfav: '—',
    dimensions: [],
    comments: [],
    filters: {},
    overallRange: '',
    periodLabel: year,
    isHm: false,
    fileName: '',
    isHp: true,
    hpPayload,
  };
}
