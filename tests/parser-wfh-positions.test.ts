import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { isWfhPositionsWorkbook, parseWfhOutSlaReport, parseWfhPcdReport } from '../src/lib/parser-wfh-positions';

const HEADER = [
  'id_internal', 'position_code_ssff', 'year', 'q_expectation', 'origin',
  'status', 'on_going', 'ta_asignado', 'seniority', 'country', 'site',
  'tag', 'position_type', 'full_name', 'hiring_date', 'aging_on_going',
  'time_to_offer', 'off_time_reason', 'turnover_full_name', 'naturaleza_turnover',
  'lider_directo', 'pbp', 'comments',
];

function workbook(rows: unknown[][]): XLSX.WorkBook {
  const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\n');
  return XLSX.read(csv, { type: 'string' });
}

describe('WFH general positions parser', () => {
  const wb = workbook([
    HEADER,
    [1, 5001, 2026, 'Q3', 'New Position', 'on going', 'Sourcing', 'FABIO APARECIDO DOS SANTOS', 'Supervisor', 'Brazil', 'SP', '', 'Hiring Plan', '', '', 90, 90, 'Perfil de Nicho', '', '', 'HM 1', 'BP 1', ''],
    [2, 5002, 2026, 'Q3', 'New Position', 'on going', 'Role Profiling', 'ISABELLA NOGUEIRA SIMAS', 'Team Leader', 'Brazil', 'RJ', 'PCD', 'Hiring Plan', '', '', 20, 20, '', '', '', 'HM 2', 'BP 2', ''],
    [3, 5003, 2026, 'Q2', 'Replacement', 'done', 'Offer accepted', 'RAFAELA BORTOLOTTI MORIS', 'Analista', 'Brazil', 'MG', 'PCD', 'Hiring Plan', 'Pessoa aprovada', '2026-08-15', 0, 45, '', 'Pessoa anterior', 'Voluntary TO', 'HM 3', 'BP 3', ''],
    [4, 5004, 2026, 'Q3', 'New Position', 'on going', 'Sourcing', 'TA FORA DO TIME', 'Supervisor', 'Brazil', 'SP', 'PCD', 'Hiring Plan', '', '', 100, 100, '', '', '', 'HM 4', 'BP 4', ''],
    [5, 5005, 2026, 'Q3', 'New Position', 'on going', 'Sourcing', 'ELAINE BELTRANI', 'Supervisor', 'México', 'MX', 'PCD', 'Hiring Plan', '', '', 100, 100, '', '', '', 'HM 5', 'BP 5', ''],
  ]);

  it('detects the WFH general layout', () => {
    expect(isWfhPositionsWorkbook(wb)).toBe(true);
  });

  it('builds the team Out SLA dataset and excludes other TAs/countries', () => {
    const parsed = parseWfhOutSlaReport(wb, 'positions.csv');
    expect(parsed.outSlaPayload?.rows).toHaveLength(3);
    expect(parsed.outSlaPayload?.rows[0]).toMatchObject({
      ta: 'Fabio Aparecido dos Santos',
      timeToOffer: 90,
      offTimeReason: 'Perfil de Nicho',
    });
  });

  it('builds PCD vacancies with team and individual-ready TA names', () => {
    const parsed = parseWfhPcdReport(wb, 'positions.csv');
    expect(parsed.pcdVagas).toHaveLength(2);
    expect(parsed.pcdVagas?.[0]).toMatchObject({
      ta: 'Isabella Nogueira Simas',
      status: 'Em processo',
      instancia: 'Alinhamento de Perfil',
    });
    expect(parsed.pcdVagas?.[1]).toMatchObject({
      ta: 'Rafaela Bortolotti Moris',
      status: 'Concluída com inclusão de PCD',
      anoFechamento: 2026,
      mesFechamento: '08',
    });
  });
});
