import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { isTonhTrackingWorkbook, parseTonhTrackingReport } from '../src/lib/parser-tonh-xlsx';

const HEADER = [
  'Data de contratação', 'Localização', 'Supervisor', 'Seniority', 'Codigo Senioridade ',
  'E-mail Meli', 'Fonte de recrutamento', 'TA Owner People BP / Supervisor Adicional Nome',
  'NOME COMPLETO', 'Sexo ', 'Realizar acompanhamento', 'Gerou TO NH? ', 'Motivo Macro',
  'Motivo', 'Exit Discussion (Link)', 'Data de saida ', 'Dias Trabalhados',
  'Tipo de Saida ', 'Motivo de Salida', 'TA Owner EXT',
];

function workbook(rows: unknown[][]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Dashboard sem dados']]), 'Dashboard');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Base');
  return wb;
}

describe('TO NH tracking workbook parser', () => {
  const wb = workbook([
    HEADER,
    ['2026-01-01', 'SP', 'HM 1', 'Team Leader - Shipping', 1, 'a@meli.com', 'Fonte', 'NAVARRO SILVA MARCON, LETICIA', 'Pessoa A', 'F', 'SIM', 'SIM', 'Adaptação a Rotina/Liderança', 'Dificuldade com a rotina', 'Exit Discussion', '2026-03-01', 60, 'Renuncia', 'Outro trabalho', ''],
    ['2026-01-01', 'RJ', 'HM 2', 'Supervisor', 2, 'b@meli.com', 'Fonte', 'GONCALVES DE FARIA, NEUCIELLE THAMYLA', 'Pessoa B', 'M', 'SIM', 'SIM', 'Compliance', 'Conduta inadequada', 'Exit Discussion', '2026-02-01', 31, 'Despido', 'No Aplica', ''],
    ['2025-01-01', 'BA', 'HM 4', 'Analista', 3, 'd@meli.com', 'Fonte', 'ISABELLA NOGUEIRA SIMAS', 'Pessoa de 2025', 'F', 'SIM', 'SIM', 'Compliance', 'Caso antigo', 'Exit Discussion', '2025-02-01', 31, 'Renuncia', 'Outro trabalho', ''],
    ['2026-01-01', 'MG', 'HM 3', 'Analista', 3, 'c@meli.com', 'Fonte', 'ISABELLA NOGUEIRA SIMAS', 'Pessoa C', 'F', 'SIM', 'NÃO', '', '', '', '', '', '', '', ''],
  ]);

  it('detects the Jornada do TA base sheet inside a full workbook', () => {
    expect(isTonhTrackingWorkbook(wb)).toBe(true);
  });

  it('keeps only 2026 TO NH cases owned by the current team', () => {
    const parsed = parseTonhTrackingReport(wb, 'jornada.xlsx');
    expect(parsed.tonhCases).toHaveLength(1);
    expect(parsed.tonhCases?.[0]).toMatchObject({
      ta: 'Leticia Navarro Silva Marcon',
      tiempoEnRolMeses: 2,
      motivoSalida: 'Renuncia — Outro trabalho',
      anoSaida: 2026,
      dataSaida: '2026-03-01',
    });
    expect(parsed.tonhCases?.some(item => item.nome === 'Pessoa B')).toBe(false);
  });
});
