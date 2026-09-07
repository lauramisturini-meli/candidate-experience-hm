import type { PdfData, TonhCase } from '../types';
import { canonicalizeTa } from './ta-team';

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
  const stopM = after.match(
    /\n\s*(?:[→►•]|\n|(?:nombre\s+y\s+apellido|rol|area|hiring\s+manager|panel\s+entrevistador|yellow\s*[/\\]?\s*red\s*flags?|motivo\s+de\s+salida|tiempo\s+en\s+el\s+rol|principales?\s+motivos?|comentarios?\s+adicionales?|conclusi[oó]n(?:es)?|acuerdos?\s+y\s+next\s+steps?|(?:fecha|data)\s+(?:de\s+)?(?:salida|sa[ií]da|baja|egreso|desligamento)|(?:exit|termination)\s+date)\s*[:→►])/i,
  );
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

function extractTaFromPanel(panel: string): string {
  // Match the name that appears just before the "(TA)" marker.
  // Handles separators: comma, slash, dash, or start of string.
  // e.g. "Marianne Fernandes (TA)", "Neucielle(TA), Daniel", "LETICIA, NAVARRO... wait..."
  // Note: "NAVARRO SILVA MARCON, LETICIA (TA)" → last segment after comma → "LETICIA"
  const m = panel.match(/(?:(?:^|[,\/\-])\s*)([^,\/\-\n()]+?)\s*\(TA\)/i);
  if (!m) return '';
  return canonicalizeTa(m[1].trim());
}

function exitDateInfo(text: string, fallbackYear?: number | null): { label: string; year: number | null } {
  const label = text.match(
    /(?:fecha|data)\s+(?:de\s+)?(?:salida|sa[ií]da|baja|egreso|desligamento)|(?:exit|termination)\s+date/i,
  );

  if (label?.index != null) {
    const afterLabel = text.slice(label.index + label[0].length, label.index + label[0].length + 100);
    const date = afterLabel.match(
      /\b(?:\d{1,2}[\/.-]\d{1,2}[\/.-](?:20)?\d{2}|20\d{2}[\/.-]\d{1,2}[\/.-]\d{1,2}|\d{1,2}\s+de\s+[a-zá-ú]+\s+de\s+20\d{2})\b/i,
    );
    const context = date?.[0] ?? afterLabel.split(/\r?\n/)[0].trim();
    const fourDigitYear = context.match(/\b(20\d{2})\b/);
    if (fourDigitYear) return { label: date?.[0] ?? context, year: Number(fourDigitYear[1]) };

    const twoDigitYear = context.match(/\b\d{1,2}[\/.-]\d{1,2}[\/.-](\d{2})\b/);
    if (twoDigitYear) return { label: date?.[0] ?? context, year: 2000 + Number(twoDigitYear[1]) };
  }

  return { label: '', year: fallbackYear ?? null };
}

function parseCasePage(page: string, fileName: string, fallbackYear?: number | null): TonhCase {
  const nome               = capitalize(extractAfter(page, /nombre\s+y\s+apellido\s*[:→►]?\s*/i));
  const rol                = capitalize(extractAfter(page, /\brol\s*[:→►]\s*/i));
  const area               = capitalize(extractAfter(page, /\barea\s*[:→►]\s*/i));
  const hiringManager      = capitalize(extractAfter(page, /hiring\s+manager\s*[:→►]\s*/i));
  const panelEntrevistador = capitalize(extractAfter(page, /panel\s+entrevistador\s*[:→►]\s*/i));
  const ta                 = extractTaFromPanel(panelEntrevistador);
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
    // English format: "X Years Y Months Z Days" (Workday/SAP exports)
    const yM = tiempoRaw.match(/(\d+)\s*years?/i);
    const mM = tiempoRaw.match(/(\d+)\s*months?/i);
    const dM = tiempoRaw.match(/(\d+)\s*days?/i);
    if (yM || mM || dM) {
      const years  = yM ? parseInt(yM[1]) : 0;
      const months = mM ? parseInt(mM[1]) : 0;
      const days   = dM ? parseInt(dM[1]) : 0;
      const total  = years * 12 + months + Math.round(days / 30);
      return total > 18 ? null : Math.max(1, total);
    }
    // Last fallback: bare number, with 18-month cap to filter parse errors
    const m = tiempoRaw.match(/(\d+(?:[.,]\d+)?)/);
    if (!m) return null;
    const num = parseFloat(m[1].replace(',', '.'));
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
  const exitDate     = exitDateInfo(page, fallbackYear);

  return {
    nome, rol, area, hiringManager, panelEntrevistador, flags,
    motivoSalida, principaisMotivos,
    tiempoEnRol: tiempoRaw, tiempoEnRolMeses,
    comentarios, conclusoes, acuerdos,
    fileName, ta,
    dataSaida: exitDate.label,
    anoSaida: exitDate.year ?? undefined,
    origem: 'exit-discussion',
  };
}

function splitCaseSections(pageText: string): string[] {
  // Some PDF pages contain two case templates side-by-side (e.g. page with Michele + Fernando).
  // Split on each "nombre y apellido" occurrence so each sub-section becomes its own case.
  const parts = pageText.split(/(?=\bnombre\s+y\s+apellido\b)/i);
  if (parts.length > 1 && !/nombre\s+y\s+apellido/i.test(parts[0])) {
    parts[1] = `${parts[0]}${parts[1]}`;
  }
  return parts.filter(s => /nombre\s+y\s+apellido/i.test(s));
}

function deduplicateByNome(cases: TonhCase[]): TonhCase[] {
  // A shared-layout page (e.g. page 14) may repeat a case template from a previous page
  // alongside a new case. Keep only the first occurrence of each person by name.
  const seen = new Set<string>();
  return cases.filter(c => {
    const key = c.nome.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseTonhReport(
  fullText: string,
  pageTexts: string[],
  fileName: string,
  confirmedExitYear?: number,
): PdfData {
  const casePages = pageTexts.filter(p => /nombre\s+y\s+apellido/i.test(p));

  // Fallback: if no page-level split available, treat fullText as one case
  const parsedCases = casePages.length > 0
    ? casePages.flatMap(page => {
        const pageYear = exitDateInfo(page).year ?? confirmedExitYear;
        return splitCaseSections(page).map(section => parseCasePage(section, fileName, pageYear));
      })
    : [parseCasePage(fullText, fileName, confirmedExitYear)];

  const undatedCases = parsedCases.filter(item => item.anoSaida == null);
  if (undatedCases.length > 0) {
    throw new Error(
      `Não foi possível identificar o ano de saída em ${undatedCases.length} caso(s) de Exit Discussion. `
      + 'Confirme explicitamente no upload que todos os casos do PDF são saídas de 2026.',
    );
  }

  const tonhCases = deduplicateByNome(parsedCases.filter(item => item.anoSaida === 2026));

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

