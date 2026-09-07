import { describe, expect, it } from 'vitest';
import { canonicalizeTa, TEAM_TAS } from '../src/lib/ta-team';
import { buildHighs } from '../src/lib/insights';

describe('TA team', () => {
  it('includes the incoming team members', () => {
    expect(TEAM_TAS).toEqual(expect.arrayContaining([
      'Isabella Nogueira Simas',
      'Elaine Beltrani',
      'Fabio Aparecido dos Santos',
      'Rafaela Bortolotti Moris',
    ]));
  });

  it('canonicalizes their names from the uppercase Hiring Plan format', () => {
    expect(canonicalizeTa('ISABELLA NOGUEIRA SIMAS')).toBe('Isabella Nogueira Simas');
    expect(canonicalizeTa('ELAINE BELTRANI')).toBe('Elaine Beltrani');
    expect(canonicalizeTa('FABIO APARECIDO DOS SANTOS')).toBe('Fabio Aparecido dos Santos');
    expect(canonicalizeTa('RAFAELA BORTOLOTTI MORIS')).toBe('Rafaela Bortolotti Moris');
  });

  it('uses the canonical team list when recognizing TAs in candidate comments', () => {
    const comments = [
      { score: 5, division: 'Shipping', name: 'Candidato 1', text: 'A Isabella conduziu muito bem o processo.' },
      { score: 5, division: 'Shipping', name: 'Candidato 2', text: 'Fabio Aparecido dos Santos foi muito atencioso.' },
      { score: 5, division: 'Shipping', name: 'Candidato 3', text: 'Ótima comunicação da Rafaela Bortolotti Moris.' },
    ];

    const result = buildHighs(comments, comments);
    expect(result.join(' ')).toContain('Isabella');
    expect(result.join(' ')).toContain('Fabio');
    expect(result.join(' ')).toContain('Rafaela');
  });
});
