import { describe, it, expect } from 'vitest';
import { isHmReport, parseHmReport } from '../src/lib/parser-hm';

const HM_FIXTURE = `
Hiring Manager Experience
Respuestas acumuladas
150
Tuve visibilidad sobre el avance del proceso
78%
Los perfiles evaluados estaban alineados al perfil definido
72%
recomendaciones de valor del equipo de TA
80%
El equipo de TA contribuyó activamente en la identificación del mejor talento
85%
¿Que aspectos positivos y qué áreas de oportunidad destacas?
Shipping
ana.costa@empresa.com
El proceso fue ágil y el equipo de TA fue muy profesional.
Shipping
joao.silva@empresa.com
Falta comunicación durante el proceso, me sentí desinformado.
`;

describe('isHmReport', () => {
  it('detecta relatório HM pela palavra Respuestas acumuladas', () => {
    expect(isHmReport(HM_FIXTURE)).toBe(true);
  });

  it('detecta relatório HM pelo texto El equipo de TA contribuy', () => {
    expect(isHmReport('El equipo de TA contribuyó activamente')).toBe(true);
  });

  it('retorna false para texto não-HM', () => {
    expect(isHmReport('Candidate Experience Survey Favorabilidad 96%')).toBe(false);
  });
});

describe('parseHmReport', () => {
  it('extrai respostas', () => {
    const result = parseHmReport(HM_FIXTURE, []);
    expect(result.respostas).toBe(150);
    expect(result.isHm).toBe(true);
  });

  it('extrai dimensões', () => {
    const result = parseHmReport(HM_FIXTURE, []);
    expect(result.dimensions.length).toBeGreaterThanOrEqual(1);
  });

  it('a dimensão overall (isOverall: true) define fav geral', () => {
    const result = parseHmReport(HM_FIXTURE, []);
    expect(result.fav).toBe('85%');
  });

  it('extrai comentários por email', () => {
    const result = parseHmReport(HM_FIXTURE, []);
    expect(result.comments.length).toBeGreaterThanOrEqual(1);
  });

  it('overallRange é sempre ALL para HM', () => {
    const result = parseHmReport(HM_FIXTURE, []);
    expect(result.overallRange).toBe('ALL');
  });
});
