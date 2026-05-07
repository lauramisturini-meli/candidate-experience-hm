import type { PdfData, TonhCase } from '../types';

export function isTonhReport(fullText: string): boolean {
  return (
    /exit\s+discussion\s+new\s+hires/i.test(fullText) &&
    /nombre\s+y\s+apellido/i.test(fullText)
  );
}

function extractAfter(text: string, pattern: RegExp): string {
  const m = text.match(pattern);
  if (!m || m.index == null) return '';
  const after = text.slice(m.index + m[0].length).replace(/^[\s→►:]+/, '');
  const stopM = after.match(/\n\s*[→►•]|\n\s*\n/);
  const block = stopM?.index != null ? after.slice(0, stopM.index) : after.slice(0, 300);
  return block.replace(/\n/g, ' ').trim();
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function extractBlock(text: string, start: RegExp, stop: RegExp): string {
  const startM = text.match(start);
  if (!startM || startM.index == null) return '';
  const from = startM.index + startM[0].length;
  const rest = text.slice(from).replace(/^[\s→►:]+/, '');
  const stopM = rest.match(stop);
  const block = stopM?.index != null ? rest.slice(0, stopM.index) : rest.slice(0, 800);
  return block.replace(/\n+/g, ' ').trim();
}

function parseCasePage(page: string, fileName: string): TonhCase {
  const nome               = capitalize(extractAfter(page, /nombre\s+y\s+apellido\s*[:→►]?\s*/i));
  const rol                = capitalize(extractAfter(page, /\brol\s*[:→►]\s*/i));
  const area               = capitalize(extractAfter(page, /\barea\s*[:→►]\s*/i));
  const hiringManager      = capitalize(extractAfter(page, /hiring\s+manager\s*[:→►]\s*/i));
  const panelEntrevistador = capitalize(extractAfter(page, /panel\s+entrevistador\s*[:→►]\s*/i));
  const flags              = capitalize(extractAfter(page, /yellow\s*[/\\]?\s*red\s*flags?\s*[:→►]\s*/i));

  const tiempoRaw        = extractAfter(page, /tiempo\s+en\s+el\s+rol\s*[:→►]\s*/i);
  const tiempoEnRolMeses = (() => {
    // Prefer a number immediately before its unit (most accurate)
    const unitMatch = tiempoRaw.match(/(\d+(?:[.,]\d+)?)\s*(meses?|dias?|semanas?)/i);
    if (unitMatch) {
      const num  = parseFloat(unitMatch[1].replace(',', '.'));
      const unit = unitMatch[2].toLowerCase();
      if (/^dia/.test(unit))    return Math.max(1, Math.round(num / 30));
      if (/^semana/.test(unit)) return Math.max(1, Math.round(num / 4.3));
      return Math.round(num);
    }
    // Fallback: first number, with 18-month cap to filter parse errors
    const m = tiempoRaw.match(/(\d+(?:[.,]\d+)?)/);
    if (!m) return null;
    const num = parseFloat(m[1].replace(',', '.'));
    if (/\bdias?\b/i.test(tiempoRaw))    return Math.max(1, Math.round(num / 30));
    if (/\bsemanas?\b/i.test(tiempoRaw)) return Math.max(1, Math.round(num / 4.3));
    const months = Math.round(num);
    return months > 18 ? null : months;
  })();

  const principaisMotivos = capitalize(
    extractAfter(page, /principales?\s+motivos?\s+de\s+salida\s*[:→►]\s*/i)
      .replace(/^[●•►→◆▶\s]+/, '').trim()
  );

  const comentarios  = extractBlock(page, /comentarios?\s+adicionales?\s*[:→►]?\s*/i, /\n\s*\n|conclusi[oó]n/i);
  const motivoSalida = extractBlock(page, /motivo\s+de\s+salida\s*[:→►]?\s*/i, /tiempo\s+en\s+el\s+rol|principales?\s+motivos?/i);
  const conclusoes   = extractBlock(page, /conclusi[oó]n(?:es)?\s*/i, /acuerdos?\s+y\s+next/i);
  const acuerdos     = extractBlock(page, /acuerdos?\s+y\s+next\s+steps?\s*/i, /\n\s*\n\s*\n|\bguia\b|\bgracias\b/i);

  return {
    nome, rol, area, hiringManager, panelEntrevistador, flags,
    motivoSalida, principaisMotivos,
    tiempoEnRol: tiempoRaw, tiempoEnRolMeses,
    comentarios, conclusoes, acuerdos,
    fileName,
  };
}

export function parseTonhReport(fullText: string, pageTexts: string[], fileName: string): PdfData {
  const casePages = pageTexts.filter(p => /nombre\s+y\s+apellido/i.test(p));

  // Fallback: if no page-level split available, treat fullText as one case
  const tonhCases = casePages.length > 0
    ? casePages.map(p => parseCasePage(p, fileName))
    : [parseCasePage(fullText, fileName)];

  return {
    respostas: null,
    fav: '',
    desfav: '',
    dimensions: [],
    comments: [],
    filters: {},
    overallRange: '',
    periodLabel: '',
    isHm: false,
    fileName,
    isTonhExit: true,
    tonhCases,
  };
}
