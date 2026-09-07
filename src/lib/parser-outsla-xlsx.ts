import * as XLSX from 'xlsx';
import type { PdfData, OutSlaRow } from '../types';
import { normalizeReason } from './parser-outsla';

// ── Column detection ──────────────────────────────────────────────────────────
//
// Individual TA/supervisor spreadsheets are compiled by hand from the raw
// Hiring report, using the same column names as the team's master Out SLA
// tracker — but column ORDER varies between snapshots, so we look up cells by
// header name instead of position (unlike the PDF regex parser, which has to
// guess column order from plain text).
//
const REQUIRED_HEADERS = ['id_internal', 'position_code_ssff', 'off_time_reason', 'ta_asignado', 'on_going'];

function normalizeHeader(h: unknown): string {
  return String(h ?? '').trim().toLowerCase();
}

function findHeaderRow(rows: unknown[][]): { headerIdx: number; headers: string[] } | null {
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const headers = (rows[i] ?? []).map(normalizeHeader);
    if (REQUIRED_HEADERS.every(h => headers.includes(h))) {
      return { headerIdx: i, headers };
    }
  }
  return null;
}

function sheetToRows(ws: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
}

// The master tracker keeps one sheet per weekly snapshot, named as a day-month date — but
// inconsistently: "27-04"/"18-05" (dash), "06/08" (slash), or "0505"/"1205" (no separator
// at all). Returns a sortable month*100+day key, or null if unparseable.
function parseSheetDateKey(sheetName: string): number | null {
  const trimmed = sheetName.trim();
  const separatedMatch = /^(\d{1,2})[-/](\d{1,2})$/.exec(trimmed);
  const compactMatch = /^(\d{2})(\d{2})$/.exec(trimmed);
  const match = separatedMatch ?? compactMatch;
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return month * 100 + day;
}

// ── Detection ─────────────────────────────────────────────────────────────────
export function isOutSlaXlsxWorkbook(wb: XLSX.WorkBook): boolean {
  return wb.SheetNames.some(name => findHeaderRow(sheetToRows(wb.Sheets[name])) !== null);
}

// ── Main parser ───────────────────────────────────────────────────────────────
//
// Only ONE sheet is read. Files may carry extra sheets (e.g. a master tracker with one
// dated snapshot tab per week) — reading all of them would duplicate the same vagas
// across snapshots. When several sheets match, we always want the most recent snapshot:
// if every candidate sheet name parses as a date, the latest one wins; otherwise we fall
// back to the last matching sheet in the workbook (snapshots are appended over time, so
// this still lands on the most recent one for files whose tabs aren't literally dated).
//
function pickTargetSheet(wb: XLSX.WorkBook): { sheetName: string; headerIdx: number; headers: string[]; allRows: unknown[][] } | null {
  const candidates: Array<{ sheetName: string; headerIdx: number; headers: string[]; allRows: unknown[][] }> = [];
  for (const sheetName of wb.SheetNames) {
    const allRows = sheetToRows(wb.Sheets[sheetName]);
    const found = findHeaderRow(allRows);
    if (found) candidates.push({ sheetName, ...found, allRows });
  }
  if (candidates.length <= 1) return candidates[0] ?? null;

  const dateKeys = candidates.map(c => parseSheetDateKey(c.sheetName));
  if (dateKeys.every(k => k !== null)) {
    let bestIdx = 0;
    for (let i = 1; i < dateKeys.length; i++) {
      if (dateKeys[i]! > dateKeys[bestIdx]!) bestIdx = i;
    }
    return candidates[bestIdx];
  }
  return candidates[candidates.length - 1];
}

export function parseOutSlaXlsxReport(wb: XLSX.WorkBook, fileName: string): PdfData {
  const rows: OutSlaRow[] = [];
  const target = pickTargetSheet(wb);

  if (target) {
    const { headerIdx, headers, allRows } = target;
    const col = (name: string) => headers.indexOf(name);

    const idxIdInternal   = col('id_internal');
    const idxPositionCode = col('position_code_ssff');
    const idxQExpectation = col('q_expectation');
    const idxTimeToOffer  = col('time_to_offer');
    const idxOrigin       = col('origin');
    const idxStage        = col('on_going');
    const idxSeniority    = col('seniority');
    const idxSite         = col('site');
    const idxOffReason    = col('off_time_reason');
    const idxTa           = col('ta_asignado');
    const idxStatus       = col('status');

    for (const raw of allRows.slice(headerIdx + 1)) {
      const idInternal = String(raw[idxIdInternal] ?? '').trim();
      if (!idInternal) continue;

      const ta = idxTa >= 0 ? String(raw[idxTa] ?? '').trim() : '';
      const status = idxStatus >= 0 ? String(raw[idxStatus] ?? '').trim().toLowerCase() : '';

      rows.push({
        idInternal,
        positionCode: idxPositionCode >= 0 ? String(raw[idxPositionCode] ?? '').trim() : '',
        qExpectation: idxQExpectation >= 0 ? String(raw[idxQExpectation] ?? '').trim() : '',
        timeToOffer:  idxTimeToOffer >= 0 ? Number(raw[idxTimeToOffer]) || 0 : 0,
        origin:       idxOrigin >= 0 ? String(raw[idxOrigin] ?? '').trim() : '',
        stage:        idxStage >= 0 ? String(raw[idxStage] ?? '').trim() : '',
        seniority:    idxSeniority >= 0 ? String(raw[idxSeniority] ?? '').trim() : '',
        site:         idxSite >= 0 ? String(raw[idxSite] ?? '').trim() : '',
        offTimeReason: idxOffReason >= 0 ? normalizeReason(String(raw[idxOffReason] ?? '').trim()) : '',
        ta: ta || undefined,
        status: status || undefined,
      });
    }
  }

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
    outSlaPayload: { rows },
  };
}
