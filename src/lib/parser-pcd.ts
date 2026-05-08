import type { PdfData, PcdVaga, PcdStatus, PcdHcData, PcdHcSeniorityRow, PcdHcBuRow, PcdTipoRow } from '../types';

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

const INSTANCIA_ORDER = [
  'Pending', 'Alinhamento de Perfil', 'Hunting', 'Entrevista TA',
  'Entrevista HM', 'Entrevista L+L', 'BGC', 'Offer', 'Concluída',
];

function isAllCapsName(l: string): boolean {
  return /^[A-ZÀ-Ú][A-ZÀ-Ú\s]+$/.test(l) && l.includes(' ') && l.length > 4;
}

function isNameLine(l: string): boolean {
  if (l.length < 5 || l.length >= 80) return false;
  if (/[.,;:!?()/]/.test(l)) return false;
  const words = l.trim().split(/\s+/);
  if (words.length < 2) return false;
  return words.every(w => /^[A-ZÀ-Ú]/.test(w) || /^(de|da|do|dos|das|e)$/i.test(w));
}

// ── format detection ──────────────────────────────────────────────────────────

// New format: page 1 has all columns (status + vaga IDs on same page)
function isFullTableFormat(p1Lines: string[]): boolean {
  const hasVagaIds = p1Lines.some(l => /^\d{8}$/.test(l));
  const hasStatus  = STATUSES.some(s => p1Lines.some(l => l.includes(s)));
  return hasVagaIds && hasStatus;
}

// ── full-table single-page parser (new format, page 1 only) ──────────────────

function parseFullTable(lines: string[]): PcdVaga[] {
  const vagas: PcdVaga[] = [];

  const vagaIdxs: number[] = [];
  lines.forEach((l, i) => { if (/^\d{8}$/.test(l)) vagaIdxs.push(i); });

  for (let k = 0; k < vagaIdxs.length; k++) {
    const start = vagaIdxs[k];
    const end   = vagaIdxs[k + 1] ?? lines.length;
    const block = lines.slice(start, end);

    const numVaga = block[0];
    let senioridade = '';
    let localidade  = '';
    let hm          = '';
    let bp          = '';
    let status: PcdStatus = 'Em processo';
    let instancia   = '';
    let sla         = 0;
    let slaIdx      = -1;
    let statusFound = false;

    for (let j = 1; j < block.length; j++) {
      const l = block[j];

      if (!senioridade && !statusFound) {
        const hit = SENIORITY_LIST.find(s =>
          l.toLowerCase() === s.toLowerCase() || l.toLowerCase().startsWith(s.toLowerCase())
        );
        if (hit) { senioridade = hit; continue; }
      }

      if (!localidade && !statusFound && /Brazil/i.test(l)) { localidade = l; continue; }

      if (!statusFound && isAllCapsName(l)) {
        if (!hm) { hm = l; continue; }
        if (!bp) { bp = l; continue; }
        continue; // extra all-caps names ignored
      }

      if (!statusFound) {
        const found = STATUSES.find(s => l.includes(s));
        if (found) { status = found; statusFound = true; continue; }
      }

      if (statusFound && !instancia) {
        if (INSTANCIA_ORDER.includes(l)) { instancia = l; continue; }
      }

      if (statusFound && instancia && slaIdx === -1 && /^\d{1,3}$/.test(l)) {
        sla    = parseInt(l, 10);
        slaIdx = j;
        break; // rest is tail
      }
    }

    // tail: lines after SLA (anoFechamento, mesFechamento, candidatoAprovado, pontosDificuldade)
    const tailStart = slaIdx >= 0 ? slaIdx + 1 : block.length;
    const tail = block.slice(tailStart);

    let anoFechamento:    number | undefined;
    let mesFechamento:    string | undefined;
    let candidatoAprovado: string | undefined;
    const diffParts: string[] = [];

    for (let j = tail.length - 1; j >= 0; j--) {
      const l = tail[j];
      if (!anoFechamento && /^20\d{2}$/.test(l)) { anoFechamento = parseInt(l, 10); continue; }
      if (!mesFechamento && MESES.includes(l))    { mesFechamento = l; continue; }
      if (!candidatoAprovado && isNameLine(l))     { candidatoAprovado = l; continue; }
      diffParts.unshift(l);
    }

    vagas.push({
      numVaga, senioridade, localidade, hm, bp, status, instancia, sla,
      pontosDificuldade: diffParts.join(' ').trim() || undefined,
      candidatoAprovado, mesFechamento, anoFechamento,
    });
  }

  return vagas;
}

// ── page extractors (old format — columns split across pages 1-4) ─────────────

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
      if (localidade && isAllCapsName(l)) hms.push(l);
    }

    out.push({ numVaga, senioridade, localidade, hm: hms.join(' ') });
  }
  return out;
}

function parseP2(lines: string[]): Array<{ bp: string; status: PcdStatus; instancia: string }> {
  const out: Array<{ bp: string; status: PcdStatus; instancia: string }> = [];

  let i = 0;
  while (i < lines.length && !STATUSES.some(s => lines[i].includes(s))) i++;

  while (i < lines.length) {
    const status = STATUSES.find(s => lines[i].includes(s));
    if (!status) { i++; continue; }

    let bp = '';
    for (let b = i - 1; b >= Math.max(0, i - 4); b--) {
      if (isAllCapsName(lines[b])
          && !['Concluída', 'Em processo', 'TA', 'BP', 'Status', 'Instância'].includes(lines[b])) {
        bp = lines[b]; break;
      }
    }

    const instancia = lines[i + 1]?.trim() ?? '';
    out.push({ bp, status, instancia });
    i += 2;
  }
  return out;
}

function parseP3(lines: string[]): Array<{ sla: number; pontosDificuldade?: string; candidatoAprovado?: string; mesFechamento?: string }> {
  const out: Array<{ sla: number; pontosDificuldade?: string; candidatoAprovado?: string; mesFechamento?: string }> = [];

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
        diffLines.push(l);
      }
      j++;
    }

    out.push({ sla, pontosDificuldade: diffLines.join(' ').trim() || undefined, candidatoAprovado, mesFechamento });
    i = j;
  }
  return out;
}

function parseP4(lines: string[]): Array<{ anoFechamento?: number }> {
  const out: Array<{ anoFechamento?: number }> = [];
  for (const l of lines) {
    if (/^20\d{2}$/.test(l)) out.push({ anoFechamento: parseInt(l, 10) });
  }
  return out;
}

// ── HC data parsers (new pages 2-5) ───────────────────────────────────────────

function parseHcSeniority(text: string): PcdHcSeniorityRow[] {
  const lines = cleanLines(text);
  const rows: PcdHcSeniorityRow[] = [];

  let layer    = '';
  let hcCon    = 0;
  let hcTotal  = 0;
  let pct      = 0;
  let hasTotal = false;

  function flush() {
    if (layer && hasTotal) {
      rows.push({ layer, hcComDiscapacidad: hcCon, hcTotal, pct });
    }
    layer = ''; hcCon = 0; hcTotal = 0; pct = 0; hasTotal = false;
  }

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    // "Layer" alone or "Layer Assistente" inline
    if (/^Layer$/i.test(l)) {
      flush();
      const next = lines[i + 1] ?? '';
      if (next && !/^HC/i.test(next) && next !== '%') { layer = next; i++; }
      continue;
    }
    const layerMatch = l.match(/^Layer\s+(.+)$/i);
    if (layerMatch) { flush(); layer = layerMatch[1].trim(); continue; }

    // HC con discapacidad
    if (/HC con discapacidad/i.test(l)) {
      const inline = l.match(/\d+/);
      if (inline) { hcCon = parseInt(inline[0], 10); }
      else {
        const num = parseInt(lines[i + 1] ?? '', 10);
        if (!isNaN(num)) { hcCon = num; i++; }
      }
      continue;
    }

    // HC TOTAL
    if (/HC TOTAL/i.test(l)) {
      const inline = l.match(/[\d.,]+/);
      const raw = inline ? inline[0] : (lines[i + 1] ?? '');
      hcTotal  = parseInt(raw.replace(/[.,]/g, ''), 10) || 0;
      hasTotal = true;
      if (!inline) i++;
      continue;
    }

    // % value
    if (/^%$/.test(l)) {
      const pctRaw = lines[i + 1] ?? '';
      pct = parseFloat(pctRaw.replace(',', '.').replace('%', '')) || 0;
      i++;
      continue;
    }
    const pctInline = l.match(/^%\s+([\d,\.]+%?)$/);
    if (pctInline) {
      pct = parseFloat(pctInline[1].replace(',', '.').replace('%', '')) || 0;
      continue;
    }
  }

  flush();
  return rows;
}

function parseHcBu(text: string): PcdHcBuRow[] {
  const lines = cleanLines(text);
  const rows: PcdHcBuRow[] = [];

  let bu      = '';
  let hcCon   = 0;
  let hcTotal = 0;
  let pct     = 0;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    if (/^BU$/i.test(l)) { bu = lines[i + 1] ?? ''; i++; continue; }
    const buMatch = l.match(/^BU\s+(.+)$/i);
    if (buMatch) { bu = buMatch[1].trim(); continue; }

    if (/HC con discapacidad/i.test(l)) {
      const inline = l.match(/\d+/);
      if (inline) { hcCon = parseInt(inline[0], 10); }
      else { const n = parseInt(lines[i + 1] ?? '', 10); if (!isNaN(n)) { hcCon = n; i++; } }
      continue;
    }

    if (/HC TOTAL/i.test(l)) {
      const inline = l.match(/[\d.,]+/);
      const raw = inline ? inline[0] : (lines[i + 1] ?? '');
      hcTotal = parseInt(raw.replace(/[.,]/g, ''), 10) || 0;
      if (!inline) i++;
      continue;
    }

    if (/^%$/.test(l)) {
      const pctRaw = lines[i + 1] ?? '';
      pct = parseFloat(pctRaw.replace(',', '.').replace('%', '')) || 0;
      i++;
      continue;
    }
    const pctInline = l.match(/^%\s+([\d,\.]+%?)$/);
    if (pctInline) {
      pct = parseFloat(pctInline[1].replace(',', '.').replace('%', '')) || 0;
    }
  }

  if (bu && hcTotal > 0) rows.push({ bu, hcComDiscapacidad: hcCon, hcTotal, pct });
  return rows;
}

function parseTiposPcd(text: string): PcdTipoRow[] {
  const lines = cleanLines(text);
  const rows: PcdTipoRow[] = [];

  const TIPO_KEYS = ['Fisica', 'Auditiva', 'Visual', 'Mental', 'Intelectual', 'Rehabilitado'];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/Distribucion Tipos|ALL Meli/i.test(l)) continue;

    const isTipo = TIPO_KEYS.some(t => l.toLowerCase().startsWith(t.toLowerCase()));
    if (!isTipo) continue;

    // inline: "Fisica(motriz) 62,70%"
    const inlineMatch = l.match(/^(.+?)\s+([\d,\.]+%?)$/);
    if (inlineMatch) {
      const p = parseFloat(inlineMatch[2].replace(',', '.').replace('%', '')) || 0;
      if (p > 0) { rows.push({ tipo: inlineMatch[1].trim(), pct: p }); continue; }
    }

    // next line is percentage
    const next = lines[i + 1] ?? '';
    const pctMatch = next.match(/^([\d,\.]+%?)$/);
    if (pctMatch) {
      const p = parseFloat(pctMatch[1].replace(',', '.').replace('%', '')) || 0;
      if (p > 0) { rows.push({ tipo: l, pct: p }); i++; }
    }
  }

  return rows;
}

// ── main ─────────────────────────────────────────────────────────────────────

export function parsePcdReport(pageTexts: string[], fileName: string): PdfData {
  const [p1 = '', p2 = '', p3 = '', p4 = '', p5 = ''] = pageTexts;

  const l1 = cleanLines(p1);

  console.log('[PCD parser] pages:', pageTexts.length, '| fullTable format:', isFullTableFormat(l1));

  let vagas: PcdVaga[];

  if (isFullTableFormat(l1)) {
    // New format: all vagas on page 1, HC data on pages 2-5
    vagas = parseFullTable(l1);
    console.log('[PCD parser] fullTable vagas:', vagas);
  } else {
    // Old format: vagas split across pages 1-4
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

    const len = Math.max(rows1.length, rows2.length, rows3.length);
    if (len === 0) console.warn('[PCD parser] Nenhuma vaga extraída — verifique o console acima.');

    const closedRows2 = rows2.filter(r => r.status !== 'Em processo');
    const anoMap = new Map<number, number>();
    closedRows2.forEach((_, i) => {
      const ano = rows4[i]?.anoFechamento;
      if (ano) {
        let seen = 0;
        for (let k = 0; k < rows2.length; k++) {
          if (rows2[k].status !== 'Em processo') {
            if (seen === i) { anoMap.set(k, ano); break; }
            seen++;
          }
        }
      }
    });

    vagas = [];
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
  }

  // HC data: present on pages 2-5 in new format (pages may overlap with old format — detect by content)
  const hcSeniorityText = [p2, p3].join('\n');
  const hcBuText        = p4;
  const tiposText       = p5;

  const seniorityRows = /HC Actual|Distribución por Seniority/i.test(hcSeniorityText)
    ? parseHcSeniority(hcSeniorityText) : [];
  const buRows = /HC Actual|Distribución por BU/i.test(hcBuText)
    ? parseHcBu(hcBuText) : [];
  const tiposRows = /Distribucion Tipos|ALL Meli/i.test(tiposText)
    ? parseTiposPcd(tiposText) : [];

  const pcdHcData: PcdHcData | undefined =
    (seniorityRows.length > 0 || buRows.length > 0 || tiposRows.length > 0)
      ? { porSeniority: seniorityRows, porBu: buRows, tiposDistribucion: tiposRows }
      : undefined;

  console.log('[PCD parser] pcdHcData:', pcdHcData);

  return {
    respostas: null, fav: '', desfav: '',
    dimensions: [], comments: [], filters: {},
    overallRange: '', periodLabel: '', isHm: false,
    fileName,
    pcdVagas: vagas,
    pcdHcData,
  };
}
