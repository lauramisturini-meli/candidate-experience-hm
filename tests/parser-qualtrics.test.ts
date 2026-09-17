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

describe('parseQualtricsReport external candidate', () => {
  it('reads individual-export NPS values instead of nearby chart-axis percentages', () => {
    const page = `Siendo 1 malo y 5 excelente, ¿cómo viviste este proceso?
97%
Recuento
0%
30%
70%
100%
Siendo 1 malo y 5 excelente, ¿cómo viviste este proceso?
3%
Recuento
0%
20%
50%
100%
Favorabilidad por sentencia
Descripción posición
Recuento
95%
100%
93%
98%
Desfavorabilidad por sentencia
Descripción posición
Recuento
2%
0%
0%
0%
Filters
Datos embebidos - Candidate TA Owner
:
Beatriz Amorim Da Silva
Fecha inicio encuesta
:
This Year`;

    const parsed = parseQualtricsReport(page, [page]);

    expect(parsed.fav).toBe('97%');
    expect(parsed.desfav).toBe('3%');
    expect(parsed.filters['TA Owner']).toBe('Beatriz Amorim Da Silva');
  });
});
