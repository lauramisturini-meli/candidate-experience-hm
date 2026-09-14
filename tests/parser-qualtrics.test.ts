import { describe, expect, it } from 'vitest';
import { parseQualtricsReport } from '../src/lib/parser-qualtrics';

describe('parseQualtricsReport internal candidate', () => {
  it('reads percentages whose number and percent sign are split across lines', () => {
    const page = `Teniendo en cuenta las siguientes afirmaciones, indicanos tu nivel de favorabilidad:
Tuve visibilidad durante el proceso de cómo estaba avanzando
24
4
71 %

Siendo 1 malo y 5 excelente, ¿cómo viviste este proceso?
24
4
79
%

Recibí feedback constructivo y específico al final del proceso
24
4
58 %

Comprendí desde el inicio cómo iba a ser el proceso
24
4
79 %

Comprendí de manera clara y precisa los desafíos y el alcance del rol
24
5
92 %`;

    const parsed = parseQualtricsReport(page, [page]);

    expect(parsed.fav).toBe('79%');
    expect(parsed.dimensions.map(d => d.fav)).toEqual(['71%', '79%', '58%', '79%', '92%']);
  });
});
