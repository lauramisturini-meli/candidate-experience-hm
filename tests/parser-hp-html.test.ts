import { describe, expect, it } from 'vitest';
import { getHpDashboardSource, isHpHtmlReport, parseHpHtmlReport } from '../src/lib/parser-hp-html';

describe('parser-hp-html', () => {
  it('parses a Grid report when the data arrays use whitespace or let declarations', () => {
    const html = `
      <h1>Relatório Semanal - Hiring Plan</h1>
      Atualizado em 31/08/2026
      const A = [{"seniority":"Team Leader","step":"Sourcing","aging":80,"fora_sla":true,"q":"Q3","ta":"Marianne Fernandes"}],
        CL = [{"seniority":"Analista","tto":40,"fora_sla":false,"q":"Q3","ta":"Marianne Fernandes"}],
        P = [{"seniority":"Supervisor","q":"Q4"}],
        SB = [];
      const a = [], p = []; // names used by inlined chart libraries
    `;

    expect(isHpHtmlReport(html)).toBe(true);

    const parsed = parseHpHtmlReport(html, 'hiring-plan.html');
    expect(parsed.hpPayload).toMatchObject({
      year: '2026',
      posicionesTotal: 3,
      cerradas: 1,
      onGoing: 1,
      sinActivar: 1,
    });
    expect(parsed.hpPayload?.sla?.ativasFora).toBe(1);
    expect(parsed.hpPayload?.hpRawRows).toHaveLength(3);
  });

  it('identifies the new unified dashboard as an iframe shell, not source data', () => {
    const dashboard = `
      <title>Vagas Transportes Brasil - Dashboard Unificado</title>
      <iframe title="Vagas Individuais - Hiring Plan" src="https://grid.adminml.com/d/01M1CWT8MEQGTN6TEGC2PX2TA5/raw"></iframe>
    `;

    expect(getHpDashboardSource(dashboard))
      .toBe('https://grid.adminml.com/d/01M1CWT8MEQGTN6TEGC2PX2TA5/raw');
    expect(isHpHtmlReport(dashboard)).toBe(false);
  });
});
