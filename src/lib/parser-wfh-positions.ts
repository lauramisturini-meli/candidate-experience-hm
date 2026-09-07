import * as XLSX from 'xlsx';
import type { OutSlaRow, PdfData, PcdStatus, PcdVaga } from '../types';
import { canonicalizeTa, TEAM_TAS } from './ta-team';
import { normalizeReason } from './parser-outsla';

const REQUIRED_HEADERS = [
  'id_internal', 'position_code_ssff', 'year', 'q_expectation', 'origin',
  'status', 'on_going', 'ta_asignado', 'seniority', 'country', 'site',
  'tag', 'position_type', 'full_name', 'hiring_date', 'aging_on_going',
  'time_to_offer', 'off_time_reason', 'turnover_full_name', 'naturaleza_turnover',
];

interface WfhTable {
  headers: string[];
  rows: unknown[][];
}

const text = (value: unknown): string => String(value ?? '').trim();
const header = (value: unknown): string => text(value).toLowerCase();

function numberValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const normalized = text(value).replace(/\s/g, '').replace(',', '.');
  const valueAsNumber = Number(normalized);
  return Number.isFinite(valueAsNumber) ? valueAsNumber : 0;
}

function findWfhTable(wb: XLSX.WorkBook): WfhTable | null {
  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
      header: 1,
      defval: '',
      raw: true,
    });
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const headers = (rows[i] ?? []).map(header);
      if (REQUIRED_HEADERS.every(required => headers.includes(required))) {
        return { headers, rows: rows.slice(i + 1) };
      }
    }
  }
  return null;
}

export function isWfhPositionsWorkbook(wb: XLSX.WorkBook): boolean {
  return findWfhTable(wb) !== null;
}

function cell(table: WfhTable, row: unknown[], name: string): unknown {
  return row[table.headers.indexOf(name)];
}

function teamTa(raw: unknown): string | null {
  const canonical = canonicalizeTa(text(raw));
  return TEAM_TAS.includes(canonical) ? canonical : null;
}

function isBrazilTeamRow(table: WfhTable, row: unknown[]): boolean {
  return /^brazil$/i.test(text(cell(table, row, 'country'))) && teamTa(cell(table, row, 'ta_asignado')) !== null;
}

function emptyPdf(fileName: string): Omit<PdfData, 'isOutSla' | 'outSlaPayload' | 'pcdVagas'> {
  return {
    respostas: null,
    fav: '',
    desfav: '',
    dimensions: [],
    comments: [],
    filters: {},
    overallRange: '',
    periodLabel: 'WFH Geral',
    isHm: false,
    fileName,
  };
}

export function parseWfhOutSlaReport(wb: XLSX.WorkBook, fileName: string): PdfData {
  const table = findWfhTable(wb);
  const rows: OutSlaRow[] = [];

  if (table) {
    for (const raw of table.rows) {
      if (!isBrazilTeamRow(table, raw)) continue;
      const idInternal = text(cell(table, raw, 'id_internal'));
      const positionCode = text(cell(table, raw, 'position_code_ssff'));
      if (!idInternal && !positionCode) continue;

      rows.push({
        idInternal: idInternal || positionCode,
        positionCode,
        qExpectation: text(cell(table, raw, 'q_expectation')),
        timeToOffer: numberValue(cell(table, raw, 'time_to_offer')),
        origin: text(cell(table, raw, 'origin')),
        stage: text(cell(table, raw, 'on_going')),
        seniority: text(cell(table, raw, 'seniority')),
        site: text(cell(table, raw, 'site')),
        offTimeReason: normalizeReason(text(cell(table, raw, 'off_time_reason'))),
        ta: teamTa(cell(table, raw, 'ta_asignado')) ?? undefined,
        status: text(cell(table, raw, 'status')).toLowerCase() || undefined,
      });
    }
  }

  return {
    ...emptyPdf(fileName),
    respostas: rows.length,
    isOutSla: true,
    outSlaPayload: { rows },
  };
}

function pcdStatus(sourceStatus: string, approvedCandidate: string): PcdStatus {
  const closed = /^(done|offer accepted|offer extended)$/i.test(sourceStatus);
  if (!closed) return 'Em processo';
  return approvedCandidate
    ? 'Concluída com inclusão de PCD'
    : 'Concluída sem inclusão de PCD';
}

function pcdStage(stage: string, status: PcdStatus): string {
  if (status !== 'Em processo') return 'Concluída';
  if (/^role profiling$/i.test(stage)) return 'Alinhamento de Perfil';
  if (/^sourcing$/i.test(stage)) return 'Hunting';
  return stage || 'Pending';
}

function closingDateParts(value: unknown, fallbackYear: unknown): { month?: string; year?: number } {
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return { month: String(parsed.m).padStart(2, '0'), year: parsed.y };
  }

  const raw = text(value);
  const iso = /^(\d{4})[-/](\d{1,2})[-/]\d{1,2}/.exec(raw);
  if (iso) return { month: iso[2].padStart(2, '0'), year: Number(iso[1]) };
  const br = /^\d{1,2}[-/](\d{1,2})[-/](\d{4})/.exec(raw);
  if (br) return { month: br[1].padStart(2, '0'), year: Number(br[2]) };

  const year = numberValue(fallbackYear);
  return year > 2000 ? { year } : {};
}

export function parseWfhPcdReport(wb: XLSX.WorkBook, fileName: string): PdfData {
  const table = findWfhTable(wb);
  const vagas: PcdVaga[] = [];

  if (table) {
    for (const raw of table.rows) {
      if (!isBrazilTeamRow(table, raw)) continue;
      if (!/(^|\b)PCD(\b|$)/i.test(text(cell(table, raw, 'tag')))) continue;

      const approvedCandidate = text(cell(table, raw, 'full_name'));
      const sourceStatus = text(cell(table, raw, 'status'));
      const status = pcdStatus(sourceStatus, approvedCandidate);
      const date = status === 'Em processo'
        ? {}
        : closingDateParts(cell(table, raw, 'hiring_date'), cell(table, raw, 'year'));
      const positionCode = text(cell(table, raw, 'position_code_ssff'));
      const idInternal = text(cell(table, raw, 'id_internal'));

      vagas.push({
        numVaga: positionCode || idInternal,
        senioridade: text(cell(table, raw, 'seniority')),
        localidade: text(cell(table, raw, 'site')),
        hm: text(cell(table, raw, 'lider_directo')),
        bp: text(cell(table, raw, 'pbp')),
        ta: teamTa(cell(table, raw, 'ta_asignado')) ?? undefined,
        status,
        instancia: pcdStage(text(cell(table, raw, 'on_going')), status),
        sla: status === 'Em processo'
          ? numberValue(cell(table, raw, 'aging_on_going')) || numberValue(cell(table, raw, 'time_to_offer'))
          : numberValue(cell(table, raw, 'time_to_offer')),
        pontosDificuldade: normalizeReason(text(cell(table, raw, 'off_time_reason'))) || text(cell(table, raw, 'comments')) || undefined,
        candidatoAprovado: approvedCandidate || undefined,
        mesFechamento: date.month,
        anoFechamento: date.year,
      });
    }
  }

  return {
    ...emptyPdf(fileName),
    pcdVagas: vagas,
  };
}
