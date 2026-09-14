import * as XLSX from 'xlsx';
import type { PcdHcBuRow, PcdHcData, PcdHcSeniorityRow, PcdTipoRow, PdfData } from '../types';

const text = (value: unknown): string => String(value ?? '').trim();
const normalized = (value: unknown): string => text(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

function numberValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = text(value).replace(/\s/g, '').replace(',', '.');
  const parsed = Number(raw.replace('%', ''));
  if (!Number.isFinite(parsed)) return 0;
  return raw.includes('%') ? parsed / 100 : parsed;
}

// Excel stores percentage-formatted cells as fractions (e.g. 0.078 for 7.8%).
// The PCD panel receives values on the 0–100 scale, so normalize both formats.
function percentageValue(value: unknown): number {
  const numeric = numberValue(value);
  const pct = numeric > 0 && numeric <= 1 ? numeric * 100 : numeric;
  return Number(pct.toFixed(4));
}

function rows(wb: XLSX.WorkBook, sheetName: string): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: true,
  });
}

function workbookText(wb: XLSX.WorkBook): string {
  return wb.SheetNames.flatMap(name => [name, ...rows(wb, name).flat()]).map(normalized).join(' ');
}

export function isPcdHcWorkbook(wb: XLSX.WorkBook): boolean {
  const content = workbookText(wb);
  return /hc actual.*distribucion por seniority/.test(content)
    && /hc actual.*distribucion por bu/.test(content)
    && /distribucion tipos.*(?:pcd|all meli)/.test(content);
}

function nextValue(
  source: unknown[][],
  start: number,
  column: number,
  label: string,
  transform: (value: unknown) => number = numberValue,
): number {
  for (let row = start; row < Math.min(source.length, start + 8); row++) {
    if (normalized(source[row][column]) === label) return transform(source[row][column + 1]);
  }
  return 0;
}

function parseSeniority(source: unknown[][]): PcdHcSeniorityRow[] {
  const result: PcdHcSeniorityRow[] = [];
  for (let row = 0; row < source.length; row++) {
    for (let column = 0; column < source[row].length; column++) {
      if (normalized(source[row][column]) !== 'layer') continue;
      const layer = text(source[row][column + 1]);
      if (!layer) continue;
      result.push({
        layer,
        hcComDiscapacidad: nextValue(source, row + 1, column, 'hc con discapacidad'),
        hcTotal: nextValue(source, row + 1, column, 'hc total'),
        pct: nextValue(source, row + 1, column, '%', percentageValue),
      });
    }
  }
  return result;
}

function parseBu(source: unknown[][]): PcdHcBuRow[] {
  const result: PcdHcBuRow[] = [];
  for (let row = 0; row < source.length; row++) {
    for (let column = 0; column < source[row].length; column++) {
      if (normalized(source[row][column]) !== 'bu') continue;
      const bu = text(source[row][column + 1]);
      if (!bu) continue;
      result.push({
        bu,
        hcComDiscapacidad: nextValue(source, row + 1, column, 'hc con discapacidad'),
        hcTotal: nextValue(source, row + 1, column, 'hc total'),
        pct: nextValue(source, row + 1, column, '%', percentageValue),
      });
    }
  }
  return result;
}

const PCD_TYPES = new Set([
  'fisica motriz', 'auditiva', 'visual', 'mental psicosocial',
  'intelectual', 'rehabilitado', 'multiple', 'outra',
]);

function parseTypes(source: unknown[][]): PcdTipoRow[] {
  const result: PcdTipoRow[] = [];
  for (const row of source) {
    for (let column = 0; column < row.length - 1; column++) {
      const tipo = text(row[column]);
      if (!PCD_TYPES.has(normalized(tipo).replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim())) continue;
      result.push({ tipo, pct: percentageValue(row[column + 1]) });
    }
  }
  return result;
}

export function parsePcdHcWorkbook(wb: XLSX.WorkBook, fileName: string): PdfData {
  const allRows = wb.SheetNames.flatMap(sheetName => rows(wb, sheetName));
  const pcdHcData: PcdHcData = {
    porSeniority: parseSeniority(allRows),
    porBu: parseBu(allRows),
    tiposDistribucion: parseTypes(allRows),
  };

  return {
    respostas: null,
    fav: '',
    desfav: '',
    dimensions: [],
    comments: [],
    filters: {},
    overallRange: '',
    periodLabel: 'Base HC PCD',
    isHm: false,
    fileName,
    pcdHcData,
  };
}
