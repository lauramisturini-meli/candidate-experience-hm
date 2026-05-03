import type { PdfData, HpPayload, HpLayerRow } from '../types';

export function isHpReport(text: string): boolean {
  const signals = [
    /Plan\s+Shipping\s+Individuales/i,
    /Porcentaje\s+de\s+Avance/i,
    /Hiring\s+plan\s+\d{4}/i,
    /Posiciones\s+(?:cerradas|On\s+Going|Sin\s+activar)/i,
    /HP\s*[-–]\s*Shipping/i,
  ];
  const matches = signals.filter(re => re.test(text)).length;
  return matches >= 2;
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

  const layerPatterns: Array<{ label: string; pattern: RegExp }> = [
    { label: 'TLs',              pattern: /\bTLs?\b/i },
    { label: 'Analistas & Sups', pattern: /Analistas\s*(?:&|y)\s*Sups?/i },
    { label: 'Manager',          pattern: /\bManagers?\b/i },
  ];

  // Anchor search to the table section
  const tableStart = text.search(/Hiring\s+plan\s+\d{4}/i);
  const tableSection = tableStart !== -1 ? text.slice(tableStart) : text;

  for (const { label, pattern } of layerPatterns) {
    const m = pattern.exec(tableSection);
    if (!m) continue;

    // Grab 5 consecutive integers after the layer name (cerradas, sinActivar, onGoing, reemplazos, rotaciones)
    const slice = tableSection.slice(m.index + m[0].length, m.index + m[0].length + 500);
    const nums = [...slice.matchAll(/\b(\d{1,5})\b/g)]
      .map(n => parseInt(n[1], 10))
      .filter(n => !isNaN(n));
    if (nums.length < 5) continue;

    const before = tableSection.slice(Math.max(0, m.index - 300), m.index);
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

  const titleMatch = text.match(/Plan\s+Shipping\s+Individuales\s*[-–—]?\s*(20\d{2})/i)
                  || text.match(/HP\s*[-–—]\s*Shipping[\s\S]{0,60}(20\d{2})/i);
  const year = titleMatch ? titleMatch[1] : String(new Date().getFullYear());
  const title = titleMatch ? `Plan Shipping Individuales - ${year}` : `HP Shipping ${year}`;

  const cerradas            = extractAfterLabel(text, /Posiciones\s+cerradas/i)    ?? 0;
  const onGoing             = extractAfterLabel(text, /Posiciones\s+On\s+Going/i)  ?? 0;
  const sinActivar          = extractAfterLabel(text, /Posiciones\s+Sin\s+activar/i) ?? 0;
  const operadoresProyectados = extractAfterLabel(text, /Operadores\s+proyectados/i) ?? 0;
  const posicionesTotal     = extractAfterLabel(text, /Total\s+de\s+posiciones/i)  ?? 0;

  const avanceMatch = text.match(/Porcentaje\s+de\s+Avance[\s\S]{0,100}?([\d]+[,.][\d]+|[\d]+)\s*%?/i);
  const porcentajeAvance = avanceMatch ? parseSpanishNumber(avanceMatch[1]) : 0;

  const reemplazosMatch = text.match(/Reemplazos\s+proyectados[\s\S]{0,150}?([\d.,]+)/i);
  const reemplazosProyectados = reemplazosMatch ? parseSpanishNumber(reemplazosMatch[1]) : 0;

  const rows = extractLayerRows(text);
  const totalRotations = rows.reduce((sum, r) => sum + r.rotacionesProyectadas, 0);

  const hpPayload: HpPayload = {
    title,
    year,
    posicionesTotal,
    cerradas,
    onGoing,
    sinActivar,
    reemplazosProyectados,
    operadoresProyectados,
    totalRotations,
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
