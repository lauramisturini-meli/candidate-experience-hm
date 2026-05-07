import type { PdfData, PcdVaga, PcdStatus } from '../types';

export function isPcdReport(fullText: string): boolean {
  return (
    /VAGAS AFIRMATIVAS PCD/i.test(fullText) ||
    (/N[úu]mero\s*Vaga/i.test(fullText) && /Em\s*processo/i.test(fullText))
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function cleanLines(text: string): string[] {
  return text.split('\n').map(l => l.trim()).filter(Boolean);
}

const STATUSES: PcdStatus[] = [
  'Concluída com inclusão de PCD',
  'Concluída sem inclusão de PCD',
  'Em processo',
];

const SENIORITY_LIST = [
  'Team Leader - Shipping', 'Sr Team Leader', 'Team Leader',
  'Supervisor', 'Coordinator', 'Coordinador', 'Manager',
  'Analista Sor', 'Analista Sr', 'Analista',
  'Assistente', 'Asistente',
];

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// ── page extractors (each returns an ordered list matching the table rows) ────

/** Page 1 — Número Vaga, Senioridade, Localidade, HM */
function parseP1(lines: string[]): Array<{ numVaga: string; senioridade: string; localidade: string; hm: string }> {
  const out: Array<{ numVaga: string; senioridade: string; localidade: string; hm: string }> = [];

  const vagaIdxs: number[] = [];
  lines.forEach((l, i) => { if (/^\d{8}$/.test(l)) vagaIdxs.push(i); });

  for (let k = 0; k < vagaIdxs.length; k++) {
    const start = vagaIdxs[k];
    const end   = vagaIdxs[k + 1] ?? lines.length;
    const block = lines.slice(start, end);

    const numVaga = block[0];
    let senioridade = '';
    let localidade  = '';
    const hms: string[] = [];

    for (let j = 1; j < block.length; j++) {
      const l = block[j];
      if (!senioridade) {
        const hit = SENIORITY_LIST.find(s => l.toLowerCase() === s.toLowerCase()
          || l.toLowerCase().startsWith(s.toLowerCase()));
        if (hit) { senioridade = hit; continue; }
      }
      if (!localidade && /Brazil/i.test(l)) { localidade = l; continue; }
      if (localidade && /^[A-ZÀ-Ú][A-ZÀ-Ú\s]+$/.test(l) && l.length > 3) {
        hms.push(l);
      }
    }

    out.push({ numVaga, senioridade, localidade, hm: hms.join(' ') });
  }
  return out;
}

/** Page 2 — BP, TA (skipped), Status, Instância */
function parseP2(lines: string[]): Array<{ bp: string; status: PcdStatus; instancia: string }> {
  const out: Array<{ bp: string; status: PcdStatus; instancia: string }> = [];

  // Find header end (skip lines until we see a status keyword)
  let i = 0;
  while (i < lines.length && !STATUSES.some(s => lines[i].includes(s))) i++;

  while (i < lines.length) {
    const status = STATUSES.find(s => lines[i].includes(s));
    if (!status) { i++; continue; }

    // BP is the nearest all-caps name before the status
    let bp = '';
    for (let b = i - 1; b >= Math.max(0, i - 4); b--) {
      if (/^[A-ZÀ-Ú][A-ZÀ-Ú\s]+$/.test(lines[b]) && lines[b].length > 4
          && !['Concluída', 'Em processo', 'TA', 'BP', 'Status', 'Instância'].includes(lines[b])) {
        bp = lines[b]; break;
      }
    }

    // Instância is the next meaningful line after status
    const instancia = lines[i + 1]?.trim() ?? '';

    out.push({ bp, status, instancia });
    i += 2;
  }
  return out;
}

/** Page 3 — SLA, Pontos de Dificuldade, Candidato, Mês */
function parseP3(lines: string[]): Array<{ sla: number; pontosDificuldade?: string; candidatoAprovado?: string; mesFechamento?: string }> {
  const out: Array<{ sla: number; pontosDificuldade?: string; candidatoAprovado?: string; mesFechamento?: string }> = [];

  // A name line: 2+ words, no punctuation, every word starts with uppercase or is a known particle
  function isNameLine(l: string): boolean {
    if (l.length < 5 || l.length >= 80) return false;
    if (/[.,;:!?()/]/.test(l)) return false;
    const words = l.trim().split(/\s+/);
    if (words.length < 2) return false;
    return words.every(w => /^[A-ZÀ-Ú]/.test(w) || /^(de|da|do|dos|das|e)$/i.test(w));
  }

  let started = false;
  let i = 0;

  while (i < lines.length) {
    if (!started) {
      if (/^\d{1,3}$/.test(lines[i]) && lines[i - 1] !== 'SLA') {
        started = true;
      } else { i++; continue; }
    }

    const slaMatch = lines[i].match(/^(\d{1,3})$/);
    if (!slaMatch) { i++; continue; }

    const sla = parseInt(slaMatch[1], 10);
    const diffLines: string[] = [];
    let candidatoAprovado: string | undefined;
    let mesFechamento: string | undefined;

    let j = i + 1;
    while (j < lines.length && !/^\d{1,3}$/.test(lines[j])) {
      const l = lines[j];
      if (MESES.includes(l)) {
        mesFechamento = l;
      } else if (!candidatoAprovado && isNameLine(l)) {
        candidatoAprovado = l;
      } else if (!candidatoAprovado) {
        // Accumulate difficulty lines until we hit a candidate name — works for multi-line text
        diffLines.push(l);
      }
      j++;
    }

    const joined = diffLines.join(' ').trim();
    out.push({ sla, pontosDificuldade: joined || undefined, candidatoAprovado, mesFechamento });
    i = j;
  }
  return out;
}

/** Page 4 — Ano de Fechamento */
function parseP4(lines: string[]): Array<{ anoFechamento?: number }> {
  // Collect years in the order they appear (blank rows → undefined)
  const out: Array<{ anoFechamento?: number }> = [];
  // We expect as many rows as there are vagas; years appear for closed ones
  for (const l of lines) {
    if (/^20\d{2}$/.test(l)) out.push({ anoFechamento: parseInt(l, 10) });
  }
  return out;
}

// ── main ─────────────────────────────────────────────────────────────────────

export function parsePcdReport(pageTexts: string[], fileName: string): PdfData {
  const [p1 = '', p2 = '', p3 = '', p4 = ''] = pageTexts;

  const l1 = cleanLines(p1);
  const l2 = cleanLines(p2);
  const l3 = cleanLines(p3);
  const l4 = cleanLines(p4);

  console.log('[PCD parser] page1 lines:', l1);
  console.log('[PCD parser] page2 lines:', l2);
  console.log('[PCD parser] page3 lines:', l3);
  console.log('[PCD parser] page4 lines:', l4);

  const rows1 = parseP1(l1);
  const rows2 = parseP2(l2);
  const rows3 = parseP3(l3);
  const rows4 = parseP4(l4);

  console.log('[PCD parser] rows1:', rows1);
  console.log('[PCD parser] rows2:', rows2);
  console.log('[PCD parser] rows3:', rows3);
  console.log('[PCD parser] rows4:', rows4);

  // Correlate by index — rows appear in the same order on all pages
  const len = Math.max(rows1.length, rows2.length, rows3.length);
  if (len === 0) {
    console.warn('[PCD parser] Nenhuma vaga extraída — verifique o console acima.');
  }

  // Build a map from closed-vaga-index to anoFechamento
  // Page 4 only lists years for rows that have a closing year
  const closedRows2 = rows2.filter(r => r.status !== 'Em processo');
  const anoMap = new Map<number, number>();
  closedRows2.forEach((_, i) => {
    const ano = rows4[i]?.anoFechamento;
    if (ano) {
      // Find absolute index in rows2
      let seen = 0;
      for (let k = 0; k < rows2.length; k++) {
        if (rows2[k].status !== 'Em processo') {
          if (seen === i) { anoMap.set(k, ano); break; }
          seen++;
        }
      }
    }
  });

  const vagas: PcdVaga[] = [];
  for (let i = 0; i < len; i++) {
    const r1 = rows1[i] ?? { numVaga: `row_${i}`, senioridade: '', localidade: '', hm: '' };
    const r2 = rows2[i] ?? { bp: '', status: 'Em processo' as PcdStatus, instancia: '' };
    const r3 = rows3[i] ?? { sla: 0 };

    vagas.push({
      numVaga:           r1.numVaga,
      senioridade:       r1.senioridade,
      localidade:        r1.localidade,
      hm:                r1.hm,
      bp:                r2.bp,
      status:            r2.status,
      instancia:         r2.instancia,
      sla:               r3.sla,
      pontosDificuldade: r3.pontosDificuldade,
      candidatoAprovado: r3.candidatoAprovado,
      mesFechamento:     r3.mesFechamento,
      anoFechamento:     anoMap.get(i),
    });
  }

  console.log('[PCD parser] vagas finais:', vagas);

  return {
    respostas: null, fav: '', desfav: '',
    dimensions: [], comments: [], filters: {},
    overallRange: '', periodLabel: '', isHm: false,
    fileName,
    pcdVagas: vagas,
  };
}
