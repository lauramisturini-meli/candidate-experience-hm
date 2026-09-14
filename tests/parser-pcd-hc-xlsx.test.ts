import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { isPcdHcWorkbook, parsePcdHcWorkbook } from '../src/lib/parser-pcd-hc-xlsx';

function workbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['HC Actual - Distribución por Seniority'],
    ['Layer', 'Assistente'], ['HC con discapacidad', 25], ['HC TOTAL', 321], ['%', 0.078],
    ['Layer', 'Team Leader'], ['HC con discapacidad', 32], ['HC TOTAL', 1342], ['%', 0.024],
  ]), 'Seniority');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['HC Actual - Distribución por BU'],
    ['BU', 'Shipping'], ['HC con discapacidad', 115], ['HC TOTAL', 3340], ['%', 0.034],
  ]), 'BU');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Distribucion Tipos de PCD ALL Meli'],
    ['Fisica(motriz)', 0.589], ['Auditiva', 0.098], ['Visual', 0.205],
    ['Multiple', 0.007], ['Outra', 0.007],
  ]), 'Tipos');
  return wb;
}

describe('PCD HC workbook parser', () => {
  it('recognizes and extracts the optional HC reference workbook', () => {
    const wb = workbook();
    expect(isPcdHcWorkbook(wb)).toBe(true);

    const parsed = parsePcdHcWorkbook(wb, 'hc-pcd.xlsx');
    expect(parsed.pcdVagas).toBeUndefined();
    expect(parsed.pcdHcData?.porSeniority).toEqual(expect.arrayContaining([
      expect.objectContaining({ layer: 'Assistente', hcComDiscapacidad: 25, hcTotal: 321, pct: 7.8 }),
    ]));
    expect(parsed.pcdHcData?.porBu).toEqual(expect.arrayContaining([
      expect.objectContaining({ bu: 'Shipping', hcComDiscapacidad: 115, hcTotal: 3340, pct: 3.4 }),
    ]));
    expect(parsed.pcdHcData?.tiposDistribucion).toEqual(expect.arrayContaining([
      expect.objectContaining({ tipo: 'Fisica(motriz)', pct: 58.9 }),
      expect.objectContaining({ tipo: 'Multiple', pct: 0.7 }),
      expect.objectContaining({ tipo: 'Outra', pct: 0.7 }),
    ]));
  });
});
