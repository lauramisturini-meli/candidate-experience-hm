import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { isOutSlaXlsxWorkbook, parseOutSlaXlsxReport } from '../src/lib/parser-outsla-xlsx';

const HEADER = [
  'id_internal', 'position_code_ssff', 'q_expectation', 'origin', 'status',
  'time_to_offer', 'seniority', 'on_going', 'site', 'lider_directo', 'pbp',
  'ta_asignado', 'position_type', 'type', 'off_time_reason',
];

function buildWorkbook(sheets: Record<string, unknown[][]>): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    // book_append_sheet validates sheet names against the strict OOXML/Excel character
    // rules (no `/`, `\`, `:`, etc.) — but Google Sheets happily allows `/` in a tab name
    // (e.g. "06/08"), and that survives into the .xlsx it exports. Assigning directly
    // bypasses that validation so we can test parsing against those real-world names too.
    wb.SheetNames.push(name);
    wb.Sheets[name] = XLSX.utils.aoa_to_sheet(rows);
  }
  return wb;
}

describe('parser-outsla-xlsx', () => {
  it('detects a workbook with the expected Out SLA columns', () => {
    const wb = buildWorkbook({
      'OUT SLA': [
        HEADER,
        [80791, 52020881, 'Q2', 'New Position', 'done', 123, 'Supervisor', 'Offer accepted',
         'XD - Santo Andre BRXSP18 - Brazil (SP03_EBA)', 'JULIANA SOUSA CARNEIRO', 'GUILHERME AUGUSTO BARBOZA',
         'MARIANNE FERNANDES', 'Extra Hiring Plan', 'Búsqueda Interna/Externa', 'Perfil de Nicho'],
      ],
    });
    expect(isOutSlaXlsxWorkbook(wb)).toBe(true);
  });

  it('rejects a workbook without the Out SLA columns', () => {
    const wb = buildWorkbook({ Sheet1: [['foo', 'bar'], [1, 2]] });
    expect(isOutSlaXlsxWorkbook(wb)).toBe(false);
  });

  it('maps columns by name regardless of order, and passes through status', () => {
    const wb = buildWorkbook({
      'OUT SLA': [
        HEADER,
        [80791, 52020881, 'Q2', 'New Position', 'done', 123, 'Supervisor', 'Offer accepted',
         'XD - Santo Andre BRXSP18 - Brazil (SP03_EBA)', 'JULIANA SOUSA CARNEIRO', 'GUILHERME AUGUSTO BARBOZA',
         'MARIANNE FERNANDES', 'Extra Hiring Plan', 'Búsqueda Interna/Externa', 'Perfil de Nicho - Nivel de especialización'],
        [76033, 52019413, 'Q2', 'New Position', 'on going', 96, 'Sr Team Leader - Shipping', 'Sourcing',
         'SC - Zona Norte SSP40 - Brazil (SCZN_EBA)', 'ARIANA FRANCIELE MENDES', 'JULIANA FAVARO CORREA BERNARDES',
         'MARIANNE FERNANDES', 'Hiring Plan', 'Oportunidades Meli', ''],
      ],
    });

    const parsed = parseOutSlaXlsxReport(wb, 'Vagas Marianne OUT SLA - All WFH.xlsx');
    expect(parsed.isOutSla).toBe(true);
    expect(parsed.outSlaPayload?.rows).toHaveLength(2);

    const [done, onGoing] = parsed.outSlaPayload!.rows;
    expect(done).toMatchObject({
      idInternal: '80791',
      positionCode: '52020881',
      qExpectation: 'Q2',
      timeToOffer: 123,
      origin: 'New Position',
      stage: 'Offer accepted',
      seniority: 'Supervisor',
      ta: 'MARIANNE FERNANDES',
      status: 'done',
      offTimeReason: 'Perfil de Nicho', // normalized via shared normalizeReason()
    });
    expect(onGoing.status).toBe('on going');
    expect(onGoing.offTimeReason).toBe('');
  });

  it('uses only the most recent dated snapshot sheet, ignoring older tabs', () => {
    const rowOld = [69739, 65011345, 'Q4', 'New Position', 'on going', 167, 'Team Leader - Shipping',
      'Entrevista HM', 'SC (SCB6_EBA)', 'LIDER', 'PBP', 'TA UM', '', '', 'Cambio de perfil'];
    const rowNew = [69739, 65011345, 'Q4', 'New Position', 'on going', 175, 'Team Leader - Shipping',
      'Entrevista HM', 'SC (SCB6_EBA)', 'LIDER', 'PBP', 'TA UM', '', '', 'Cambio de perfil'];

    // Sheets deliberately NOT in chronological workbook order, and mixing the real-world
    // date-name styles ("27-04" dashed, "06/08" slashed, "1205" compact) to make sure date
    // parsing — not sheet position — decides which snapshot is "latest".
    const wb = buildWorkbook({
      '06/08': [HEADER, rowNew], // Aug 6 — most recent, appears first in the workbook
      '27-04': [HEADER, rowOld], // Apr 27 — oldest
      '1205':  [HEADER, rowOld], // Dec 5 (compact) — not the latest either
    });

    const parsed = parseOutSlaXlsxReport(wb, 'master.xlsx');
    expect(parsed.outSlaPayload?.rows).toHaveLength(1);
    expect(parsed.outSlaPayload?.rows[0].timeToOffer).toBe(175);
  });

  it('falls back to the last matching sheet when a name is not a parseable date', () => {
    const rowOld = [1, 1, 'Q1', 'New Position', 'on going', 10, 'Analista',
      'Sourcing', 'SC (SCB6_EBA)', 'LIDER', 'PBP', 'TA UM', '', '', ''];
    const rowNew = [2, 2, 'Q1', 'New Position', 'on going', 20, 'Analista',
      'Sourcing', 'SC (SCB6_EBA)', 'LIDER', 'PBP', 'TA UM', '', '', ''];

    const wb = buildWorkbook({
      '27-04': [HEADER, rowOld],
      'Vagas atuais': [HEADER, rowNew], // not a date — appended last, so it wins
    });

    const parsed = parseOutSlaXlsxReport(wb, 'master.xlsx');
    expect(parsed.outSlaPayload?.rows[0].idInternal).toBe('2');
  });
});
