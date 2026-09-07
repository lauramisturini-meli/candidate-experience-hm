import * as XLSX from 'xlsx';
import type { PdfData, TonhCase } from '../types';
import { canonicalizeTa, TEAM_TAS } from './ta-team';

interface TonhTable {
  headers: string[];
  rows: unknown[][];
}

const text = (value: unknown): string => String(value ?? '').trim();
const normalized = (value: unknown): string => text(value)
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

const REQUIRED_HEADERS = [
  /^data de contratacao$/,
  /^localizacao$/,
  /^supervisor$/,
  /^seniority$/,
  /^nome completo$/,
  /^gerou to nh/,
  /^motivo macro$/,
  /^motivo$/,
  /^data de saida/,
  /^dias trabalhados$/,
  /^tipo de saida/,
  /^motivo de salida$/,
  /^ta owner people bp/,
];

function findTonhTable(wb: XLSX.WorkBook): TonhTable | null {
  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
      header: 1,
      defval: '',
      raw: true,
    });
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const headers = (rows[i] ?? []).map(normalized);
      if (REQUIRED_HEADERS.every(pattern => headers.some(value => pattern.test(value)))) {
        return { headers, rows: rows.slice(i + 1) };
      }
    }
  }
  return null;
}

export function isTonhTrackingWorkbook(wb: XLSX.WorkBook): boolean {
  return findTonhTable(wb) !== null;
}

function cell(table: TonhTable, row: unknown[], pattern: RegExp): unknown {
  const index = table.headers.findIndex(value => pattern.test(value));
  return index >= 0 ? row[index] : '';
}

function taName(value: unknown): string {
  const raw = text(value);
  const commaParts = raw.split(',').map(part => part.trim()).filter(Boolean);
  const reordered = commaParts.length >= 2
    ? `${commaParts.slice(1).join(' ')} ${commaParts[0]}`
    : raw;
  const canonical = canonicalizeTa(reordered);
  return TEAM_TAS.includes(canonical) ? canonical : '';
}

function daysValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  const parsed = Number(text(value).replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function exitDateInfo(value: unknown): { label: string; year: number | null } {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      label: value.toISOString().slice(0, 10),
      year: value.getFullYear(),
    };
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed?.y) {
      const month = String(parsed.m).padStart(2, '0');
      const day = String(parsed.d).padStart(2, '0');
      return { label: `${parsed.y}-${month}-${day}`, year: parsed.y };
    }
  }

  const raw = text(value);
  const fourDigitYear = raw.match(/\b(20\d{2})\b/);
  if (fourDigitYear) return { label: raw, year: Number(fourDigitYear[1]) };

  const twoDigitYear = raw.match(/\b\d{1,2}[\/.-]\d{1,2}[\/.-](\d{2})\b/);
  if (twoDigitYear) return { label: raw, year: 2000 + Number(twoDigitYear[1]) };

  return { label: raw, year: null };
}

export function parseTonhTrackingReport(wb: XLSX.WorkBook, fileName: string): PdfData {
  const table = findTonhTable(wb);
  const cases: TonhCase[] = [];

  if (table) {
    for (const row of table.rows) {
      const generated = normalized(cell(table, row, /^gerou to nh/));
      if (generated !== 'sim' && generated !== 'si') continue;

      const exitDate = exitDateInfo(cell(table, row, /^data de saida/));
      if (exitDate.year !== 2026) continue;

      const name = text(cell(table, row, /^nome completo$/));
      if (!name) continue;
      const days = daysValue(cell(table, row, /^dias trabalhados$/));
      const macro = text(cell(table, row, /^motivo macro$/));
      const detail = text(cell(table, row, /^motivo$/));
      const exitType = text(cell(table, row, /^tipo de saida/));
      const exitReason = text(cell(table, row, /^motivo de salida$/));
      const owner = taName(
        cell(table, row, /^ta owner ext$/) || cell(table, row, /^ta owner people bp/),
      );
      if (!owner) continue;

      cases.push({
        nome: name,
        rol: text(cell(table, row, /^seniority$/)),
        area: text(cell(table, row, /^localizacao$/)),
        hiringManager: text(cell(table, row, /^supervisor$/)),
        panelEntrevistador: owner,
        flags: '',
        motivoSalida: [exitType, exitReason].filter(Boolean).join(' — '),
        principaisMotivos: [macro, detail].filter(Boolean).join(' — '),
        tiempoEnRol: days === null ? '' : `${days} dias`,
        tiempoEnRolMeses: days === null ? null : Math.round((days / 30.44) * 10) / 10,
        comentarios: detail,
        conclusoes: macro,
        acuerdos: text(cell(table, row, /^exit discussion/)),
        fileName,
        ta: owner || undefined,
        dataSaida: exitDate.label,
        anoSaida: exitDate.year,
        origem: 'base',
      });
    }
  }

  return {
    respostas: cases.length,
    fav: '',
    desfav: '',
    dimensions: [],
    comments: [],
    filters: {},
    overallRange: '',
    periodLabel: 'TO NH',
    isHm: false,
    fileName,
    isTonhExit: true,
    tonhCases: cases,
  };
}
