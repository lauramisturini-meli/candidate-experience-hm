import { describe, expect, it } from 'vitest';
import { parseTonhReport } from '../src/lib/parser-tonh';

function exitDiscussion(name: string, exitDate?: string): string {
  return [
    'Exit Discussion New Hires',
    exitDate ? `Fecha de salida: ${exitDate}` : '',
    `Nombre y apellido: ${name}`,
    'Rol: Team Leader',
    'Area: São Paulo',
    'Hiring Manager: Gestor Teste',
    'Panel entrevistador: Leticia Navarro (TA)',
    'Motivo de salida: Renuncia',
    'Tiempo en el rol: 2 meses',
    'Principales motivos de salida: Propuesta externa',
  ].filter(Boolean).join('\n');
}

describe('TO NH Exit Discussion parser', () => {
  it('keeps only cases whose exit date is in 2026', () => {
    const case2026 = exitDiscussion('Pessoa 2026', '15/03/2026');
    const case2025 = exitDiscussion('Pessoa 2025', '10/12/2025');
    const parsed = parseTonhReport(`${case2026}\n${case2025}`, [case2026, case2025], 'Exit Discussions.pdf');

    expect(parsed.tonhCases).toHaveLength(1);
    expect(parsed.tonhCases?.[0]).toMatchObject({
      nome: 'Pessoa 2026',
      dataSaida: '15/03/2026',
      anoSaida: 2026,
    });
  });

  it('uses the explicitly confirmed 2026 scope for undated material', () => {
    const page = exitDiscussion('Pessoa confirmada');
    const parsed = parseTonhReport(page, [page], 'Exit Discussions.pdf', 2026);

    expect(parsed.tonhCases).toHaveLength(1);
    expect(parsed.tonhCases?.[0].anoSaida).toBe(2026);
  });

  it('does not infer the year from the file name', () => {
    const page = exitDiscussion('Pessoa sem data');

    expect(() => parseTonhReport(page, [page], 'Exit Discussions 2026.pdf'))
      .toThrow(/confirme explicitamente/i);
  });
});
