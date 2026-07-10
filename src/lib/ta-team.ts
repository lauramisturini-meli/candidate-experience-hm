// Canonical TA team list — source of truth for display names in filter chips.
// Used to normalize PDF-extracted names (which may be ALL_CAPS, abbreviated, or
// contain outdated last names) back to the correct person.
export const TEAM_TAS: string[] = [
  'Aline Alves da Silva',
  'Aline Nagel',
  'Beatriz Amorim da Silva',
  'Bruna de Oliveira Tavares',
  'Bruna Mercedes dos Santos',
  'Cardoso Bitencourt Xavier Junior',
  'Carolina de Oliveira Zanotti David',
  'Edneia Pereira da Silva',
  'Gabriela Aparecida Ferreira Garajau',
  'Gabriela Nascimento',
  'Glauciane Santos Andrade',
  'Kaio da Rocha do Carmo',
  'Katia Silene Ferreira Alves',
  'Kitty Borborema',
  'Laura Misturini',
  'Leticia Navarro Silva Marcon',
  'Maria Beatriz Marques Guariglia',
  'Marianne Fernandes',
  'Nadia Aline Miranda',
  'Nayara Dias dos Santos Oliveira',
  'Neucielle Thamyla Goncalves de Faria',
  'Samantha Oliveira',
  'Thais Helena Carvalho dos Santos',
  'Thamires Sousa',
  'Vanessa Cristina Duarte Ferreira',
];

const PREPS = new Set(['da', 'de', 'do', 'dos', 'das', 'e', 'della', 'di', 'del']);

function sig(name: string): string[] {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1 && !PREPS.has(w));
}

// Pre-compute canonical signatures once
const CANONICAL_SIGS = TEAM_TAS.map(name => ({ name, words: sig(name) }));

/**
 * Maps a PDF-extracted TA name (ALL_CAPS, abbreviated, or stale) to the
 * canonical team member name.  Returns the canonical name when word overlap
 * covers ≥ 67 % of the shorter name, otherwise returns the input unchanged.
 */
export function canonicalizeTa(extracted: string): string {
  if (!extracted.trim()) return extracted;

  const extWords = sig(extracted);
  let bestName  = '';
  let bestScore = 0;

  for (const { name, words } of CANONICAL_SIGS) {
    const overlap = extWords.filter(w => words.includes(w)).length;
    const minLen  = Math.min(extWords.length, words.length);
    if (minLen === 0) continue;
    const score = overlap / minLen;
    if (score > bestScore && score >= 0.67) {
      bestScore = score;
      bestName  = name;
    }
  }

  return bestName || extracted;
}
