import { describe, expect, it } from 'vitest';
import type { TonhCase } from '../src/types';
import { consolidateTonhCases, mergeTonhCases } from '../src/lib/tonh-cases';

function tonhCase(overrides: Partial<TonhCase>): TonhCase {
  return {
    nome: 'José da Silva',
    rol: '',
    area: '',
    hiringManager: '',
    panelEntrevistador: '',
    flags: '',
    motivoSalida: '',
    principaisMotivos: '',
    tiempoEnRol: '',
    tiempoEnRolMeses: null,
    comentarios: '',
    conclusoes: '',
    acuerdos: '',
    fileName: '',
    ...overrides,
  };
}

describe('TO NH case consolidation', () => {
  it('combines the structured base and Exit Discussion without counting the person twice', () => {
    const base = tonhCase({
      nome: 'JOSÉ DA SILVA',
      rol: 'Team Leader',
      area: 'SP',
      motivoSalida: 'Renúncia — Outro trabalho',
      principaisMotivos: 'Proposta externa',
      tiempoEnRol: '60 dias',
      tiempoEnRolMeses: 2,
      ta: 'Leticia Navarro Silva Marcon',
      dataSaida: '2026-03-01',
      anoSaida: 2026,
      origem: 'base',
      fileName: 'jornada.xlsx',
    });
    const discussion = tonhCase({
      nome: 'Jose da Silva',
      panelEntrevistador: 'Leticia Navarro (TA)',
      flags: 'Yellow flag de aderência',
      comentarios: 'Relato detalhado da conversa.',
      conclusoes: 'Conclusão detalhada.',
      acuerdos: 'Acompanhar o plano de ação.',
      hasExitDiscussion: true,
      anoSaida: 2026,
      origem: 'exit-discussion',
      fileName: 'exit-discussion.pdf',
    });

    for (const input of [[base, discussion], [discussion, base]]) {
      const merged = mergeTonhCases(input);

      expect(merged).toHaveLength(1);
      expect(merged[0]).toMatchObject({
        nome: 'JOSÉ DA SILVA',
        rol: 'Team Leader',
        motivoSalida: 'Renúncia — Outro trabalho',
        ta: 'Leticia Navarro Silva Marcon',
        dataSaida: '2026-03-01',
        flags: 'Yellow flag de aderência',
        comentarios: 'Relato detalhado da conversa.',
        conclusoes: 'Conclusão detalhada.',
        acuerdos: 'Acompanhar o plano de ação.',
      });
    }
  });

  it('keeps cases owned by former TAs for historical TO NH reporting', () => {
    const currentTeamCase = tonhCase({
      nome: 'Pessoa atual',
      ta: 'Isabella Nogueira Simas',
      anoSaida: 2026,
    });
    const historicalCase = tonhCase({
      nome: 'Pessoa histórica',
      ta: 'Neucielle Thamyla Goncalves de Faria',
      anoSaida: 2026,
    });

    expect(consolidateTonhCases([currentTeamCase, historicalCase]))
      .toEqual([currentTeamCase, historicalCase]);
  });
});
