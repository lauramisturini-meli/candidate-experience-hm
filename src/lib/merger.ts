import { escapeHtml } from './utils';
import { TAB_META } from './constants';
import { buildHighs, buildLows, buildActions, HM_HIGH_THEMES, HM_LOW_THEMES, HM_ACTION_MAP } from './insights';
import type { PdfData, MergedView, TabId } from '../types';

function deriveTabPeriod(filters: Record<string, string>, tabId: TabId): string {
  if (tabId === 'ytd') return String(new Date().getFullYear());
  const fecha = filters['Fecha inicio encuesta'] || '';
  if (fecha) {
    const map: Record<string, string> = {
      'Este año':         String(new Date().getFullYear()),
      'El año pasado':    'Ano passado',
      'Este mes':         'Mês atual',
      'Últimos 7 días':   'Últimos 7 dias',
      'Últimos 30 días':  'Últimos 30 dias',
      'Últimas 4 semanas':'Últimas 4 semanas',
    };
    let label = (map[fecha] || fecha).replace(/\bHoy\b/gi, 'Hoje');
    label = label.replace(/[^A-Za-zÀ-ÿ0-9\s\-–—.,()/:]+/g, ' ').replace(/\s+/g, ' ').trim();
    return label;
  }
  return TAB_META[tabId].label;
}

export function buildMergedView(pdfs: PdfData[], tabId: TabId): MergedView {
  let primary = pdfs.find(p => p.overallRange === 'ALL') ?? null;
  if (!primary) {
    primary = pdfs.reduce<PdfData | null>((a, b) =>
      ((a?.respostas) ?? 0) >= ((b?.respostas) ?? 0) ? a : b, null);
  }

  const seen = new Set<string>();
  const allComments: PdfData['comments'] = [];
  for (const pdf of pdfs) {
    for (const c of pdf.comments) {
      const key = `${c.score}|${(c.name || '').trim()}|${(c.text || '').slice(0, 80)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      allComments.push(c);
    }
  }

  let fav = (primary && primary.overallRange === 'ALL') ? primary.fav : '—';
  let desfav = (primary && primary.overallRange === 'ALL') ? primary.desfav : '—';

  if (fav === '—' || fav == null) {
    const promo = pdfs.find(p => /-5$/.test(p.overallRange) && p.fav && p.fav !== '—')
               ?? pdfs.find(p => p.fav && p.fav !== '—');
    if (promo) fav = promo.fav;
  }
  if (desfav === '—' || desfav == null) {
    const detr = pdfs.find(p => /^1-/.test(p.overallRange) && p.desfav && p.desfav !== '—')
              ?? pdfs.find(p => p.desfav && p.desfav !== '—');
    if (detr) desfav = detr.desfav;
  }

  const totalResp = (primary?.respostas) ?? allComments.length ?? 0;

  let neutrosPct = '—';
  let neutrosSub = '';
  const favNum = parseInt((fav || '').replace('%', ''), 10);
  const desfavNum = parseInt((desfav || '').replace('%', ''), 10);
  const neutrals = allComments.filter(c => c.score === 3);
  if (!isNaN(favNum) && !isNaN(desfavNum)) {
    const n = Math.max(0, 100 - favNum - desfavNum);
    neutrosPct = n + '%';
    neutrosSub = neutrals.length ? `Nota 3 · ~${neutrals.length} candidatos` : 'Nota 3';
  } else if (allComments.length > 0) {
    neutrosPct = Math.round((neutrals.length / allComments.length) * 100) + '%';
    neutrosSub = `Nota 3 · ~${neutrals.length} candidatos`;
  }

  const dimensions = (primary?.dimensions?.length ? primary.dimensions
    : pdfs.find(p => p.dimensions?.length)?.dimensions) ?? [];

  const detractors = allComments.filter(c => c.score <= 2);
  const positives  = allComments.filter(c => c.score >= 4);

  let worstName: string | null = null;
  let worstDesfav = -1;
  for (const d of dimensions) {
    const v = parseInt((d.desfav || '').replace('%', ''), 10);
    if (!isNaN(v) && v > worstDesfav) { worstDesfav = v; worstName = d.name; }
  }

  const topNegDims = [...dimensions]
    .filter(d => /\d/.test(d.desfav))
    .sort((a, b) => parseInt(b.desfav) - parseInt(a.desfav))
    .slice(0, 3);

  let detractorHtml = `<strong>${detractors.length} respostas</strong> de nota 1–2`;
  if (topNegDims.length > 0) {
    detractorHtml += '<br>Piores dimensões:<br>';
    detractorHtml += topNegDims
      .map(d => `${escapeHtml(d.name)}: <strong>${escapeHtml(d.desfav)} de desfavorabilidade</strong>`)
      .join('<br>');
  }

  const isHm = !!(primary?.isHm);
  const highs = isHm
    ? buildHighs(allComments, allComments, { themes: HM_HIGH_THEMES, minMatches: 1, skipTaMentions: true })
    : buildHighs(positives, allComments);
  const lows = isHm
    ? buildLows(allComments, { themes: HM_LOW_THEMES, skipScoreFilter: true })
    : buildLows(allComments);
  const actions = isHm
    ? buildActions(lows, { map: HM_ACTION_MAP })
    : buildActions(lows);

  const refFilters = primary?.filters ?? pdfs[0]?.filters ?? {};
  const periodLabel = isHm
    ? (primary?.periodLabel || '2026')
    : deriveTabPeriod(refFilters, tabId);

  return {
    periodLabel,
    kpis: {
      respostas: totalResp,
      favorabilidade: fav || '—',
      neutros: neutrosPct,
      neutrosSub,
      desfavorabilidade: desfav || '—',
    },
    dimensions,
    worstDimensionName: worstName,
    detractorHtml,
    highs,
    lows,
    actions,
  };
}
