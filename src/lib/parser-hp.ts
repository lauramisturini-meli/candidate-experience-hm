import type { PdfData, HpPayload, HpLayerRow } from '../types';

export function isHpReport(text: string): boolean {
  const signals = [
    /Plan\s+Shipping\s+Individuales/i,
    /Porcentaje\s+de\s+Avance/i,
    /Hiring\s+plan\s+\d{4}/i,
    /Posiciones\s+(?:cerradas|On\s+Going|Sin\s+activar)/i,
    /HP\s*[-–]\s*Shipping/i,
  ];
  return signals.filter(re => re.test(text)).length >= 2;
}

function parseSpanishNumber(raw: string): number {
  // "1.799" → 1799, "31,18" → 31.18
  return parseFloat(raw.replace(/\./g, '').replace(',', '.'));
}

/**
 * Extract a KPI card value from fullText (PDF content-stream order).
 * Each text item is on its own line, so the value appears within a small
 * window right after the label. If the first match is a table header (no
 * number immediately follows), we advance to the next occurrence.
 */
function extractKpiValue(text: string, labelPattern: RegExp, windowChars = 60): number | null {
  let searchFrom = 0;
  while (searchFrom < text.length) {
    const sub = text.slice(searchFrom);
    const m = labelPattern.exec(sub);
    if (!m) return null;

    const afterLabel = sub.slice(m.index + m[0].length, m.index + m[0].length + windowChars);
    // Only accept a number that appears right after the label (no non-whitespace text in between)
    const numMatch = afterLabel.match(/^[\s\n]*([\d.,]+)/);
    if (numMatch) {
      const v = parseSpanishNumber(numMatch[1]);
      if (!isNaN(v)) return v;
    }

    // No number immediately after this occurrence — try the next one
    searchFrom += m.index + m[0].length;
  }
  return null;
}

function extractLayerRows(positionalText: string): HpLayerRow[] {
  const rows: HpLayerRow[] = [];

  const layerPatterns: Array<{ label: string; pattern: RegExp }> = [
    { label: 'TLs',              pattern: /\bTLs?\b/i },
    // "Analistas &" and "Sups" are split across positional lines; match just "Analistas"
    { label: 'Analistas & Sups', pattern: /\bAnalistas\b/i },
    { label: 'Manager',          pattern: /\bManagers?\b/i },
  ];

  // Anchor to the table section
  const tableStart = positionalText.search(/Hiring\s+plan\s+\d{4}/i);
  const tableSection = tableStart !== -1 ? positionalText.slice(tableStart) : positionalText;

  for (const { label, pattern } of layerPatterns) {
    const m = pattern.exec(tableSection);
    if (!m) continue;

    // Grab 5 consecutive integers right after the layer name
    // (cerradas, sinActivar, onGoing, reemplazos, rotaciones)
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
      cerradas:               nums[0],
      sinActivar:             nums[1],
      onGoing:                nums[2],
      reemplazosProyectados:  nums[3],
      rotacionesProyectadas:  nums[4],
    });
  }

  return rows;
}

export function parseHpReport(positionalText: string, fullText?: string): PdfData {
  // Use fullText for KPI card values (label+value are adjacent in content-stream order).
  // Fall back to positionalText if fullText is not supplied.
  const kpiSource = fullText ?? positionalText;

  const titleMatch = kpiSource.match(/Plan\s+Shipping\s+Individuales\s*[-–—]?\s*(20\d{2})/i)
                  || kpiSource.match(/HP\s*[-–—]\s*Shipping[\s\S]{0,60}(20\d{2})/i);
  const year  = titleMatch ? titleMatch[1] : String(new Date().getFullYear());
  const title = `Plan Shipping Individuales - ${year}`;

  const cerradas              = extractKpiValue(kpiSource, /Posiciones\s+cerradas/i)     ?? 0;
  const onGoing               = extractKpiValue(kpiSource, /Posiciones\s+On\s+Going/i)   ?? 0;
  const sinActivar            = extractKpiValue(kpiSource, /Posiciones\s+Sin\s+activar/i) ?? 0;
  const operadoresProyectados = extractKpiValue(kpiSource, /Operadores\s+proyectados/i)   ?? 0;
  const posicionesTotal       = extractKpiValue(kpiSource, /Total\s+de\s+posiciones/i)    ?? 0;
  const reemplazosProyectados = extractKpiValue(kpiSource, /Reemplazos\s+proyectados/i)   ?? 0;

  // "Porcentaje de Avance" is followed by the percentage value ("31,18")
  const porcentajeAvance = extractKpiValue(kpiSource, /Porcentaje\s+de\s+Avance/i, 80) ?? 0;

  // Table row extraction uses positional text (Y-aligned rows)
  const rows          = extractLayerRows(positionalText);
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
    respostas:    null,
    fav:          '—',
    desfav:       '—',
    dimensions:   [],
    comments:     [],
    filters:      {},
    overallRange: '',
    periodLabel:  year,
    isHm:         false,
    fileName:     '',
    isHp:         true,
    hpPayload,
  };
}
