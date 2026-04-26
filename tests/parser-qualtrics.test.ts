import { describe, it, expect } from 'vitest';
import { parseQualtricsReport } from '../src/lib/parser-qualtrics';

const FIXTURE_FIRST_PAGE = `
Candidate Experience Survey
Filtros
País : Brasil División : Shipping (Shipping) Evaluación overall : 1 - 2
Cantidad de
Respuestas
42
Favorabilidad
96%
Desfavorabilidad
4%
Favorabilidad por sentencia
Comprensión de proceso
Descripción posición
Excelencia en entrevista
Ser yo mism@
Visibilidad proceso
92%
88%
95%
90%
87%
Desfavorabilidad por sentencia
Comprensión de proceso
Descripción posición
Excelencia en entrevista
Ser yo mism@
Visibilidad proceso
8%
12%
5%
10%
13%
`;

const FIXTURE_COMMENT_PAGE = `
1
Shipping (Shipping)
Ana Costa
O processo foi muito bem conduzido e transparente.
2
Logística (Log)
João Silva
Demorou muito tempo entre as etapas, fiquei sem retorno.
`;

describe('parseQualtricsReport', () => {
  it('extrai respostas corretamente', () => {
    const result = parseQualtricsReport(FIXTURE_FIRST_PAGE, [FIXTURE_FIRST_PAGE]);
    expect(result.respostas).toBe(42);
  });

  it('extrai favorabilidade e desfavorabilidade', () => {
    const result = parseQualtricsReport(FIXTURE_FIRST_PAGE, [FIXTURE_FIRST_PAGE]);
    expect(result.fav).toBe('96%');
    expect(result.desfav).toBe('4%');
  });

  it('extrai 5 dimensões', () => {
    const result = parseQualtricsReport(FIXTURE_FIRST_PAGE, [FIXTURE_FIRST_PAGE]);
    expect(result.dimensions).toHaveLength(5);
    expect(result.dimensions[0].name).toBe('Compreensão do processo');
    expect(result.dimensions[0].fav).toBe('92%');
    expect(result.dimensions[0].desfav).toBe('8%');
  });

  it('normaliza overallRange de filtro 1-2', () => {
    const result = parseQualtricsReport(FIXTURE_FIRST_PAGE, [FIXTURE_FIRST_PAGE]);
    expect(result.overallRange).toBe('1-2');
  });

  it('extrai comentários com score, divisão e nome', () => {
    const fullText = FIXTURE_FIRST_PAGE + FIXTURE_COMMENT_PAGE;
    const result = parseQualtricsReport(fullText, [FIXTURE_FIRST_PAGE]);
    expect(result.comments.length).toBeGreaterThanOrEqual(1);
    const first = result.comments[0];
    expect(first.score).toBe(1);
    expect(first.name).toBe('Ana Costa');
  });

  it('retorna overallRange ALL quando filtro é 1-5', () => {
    const page = FIXTURE_FIRST_PAGE.replace('1 - 2', '1 - 5');
    const result = parseQualtricsReport(page, [page]);
    expect(result.overallRange).toBe('ALL');
  });
});
