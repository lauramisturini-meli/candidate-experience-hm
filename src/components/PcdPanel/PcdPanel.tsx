import { useMemo, useState } from 'react';
import type { TabMeta, PdfData, StatusMessage, PcdVaga, TabUiState, PcdHcData } from '../../types';
import { StatusBar } from '../StatusBar/StatusBar';
import { PdfPill } from '../PdfPill/PdfPill';
import s from './PcdPanel.module.css';

interface Props {
  meta: TabMeta;
  pdfs: PdfData[];
  ui?: TabUiState;
  status: StatusMessage | null | undefined;
  onUpload: () => void;
  onReset: () => void;
  onRemovePdf: (idx: number) => void;
  onShare: () => void;
  isShareLoading: boolean;
  onUiChange: (ui: Partial<TabUiState>) => void;
}

const SLA_THRESHOLD = 50;
const INSTANCIA_ORDER = ['Pending', 'Alinhamento de Perfil', 'Hunting', 'Entrevista TA', 'Entrevista HM', 'Entrevista L+L', 'BGC', 'Offer', 'Concluída'];

interface VagaActionTheme {
  pattern: RegExp;
  action: (v: PcdVaga) => string;
}

// Mapeia temas de dificuldade para ações específicas com roteamento correto de equipe.
// BGC omitido intencionalmente — reprovação não tem ação disponível para o time.
const PER_VAGA_ACTION_THEMES: VagaActionTheme[] = [
  {
    pattern: /perfil.{0,60}(exig|restr|espec[íi]f)|alta exig[êe]ncia/i,
    action: (_v) => 'Acionar BP em caso de dificuldade para realinhar os requisitos com HM para ampliar aderência de candidatos PCD',
  },
  {
    pattern: /laudo|valida[çc][aã]o de laudo|tempo de retorno.{0,30}laudo/i,
    action: (_v) => 'Acionar time de SHE para retorno de validação de laudo dentro do SLA',
  },
  {
    pattern: /pouco(s)? candidato|baixo volume|escasso|poucos perfis/i,
    action: (_v) => 'Ampliar sourcing: acionar parceiros PCD e expandir canais de divulgação',
  },
  {
    pattern: /desistiram?|desist[êe]ncia|declin(ou|aram?)|recusaram?/i,
    action: (_v) => 'Mapear motivos de desistência e reforçar proposta de valor no momento da oferta',
  },
];

interface DifficultyTheme {
  pattern: RegExp;
  label: string;
  action: string;
}

const DIFICULDADE_THEMES: DifficultyTheme[] = [
  {
    pattern: /pouco(s)? candidato|baixo volume|escasso|poucos perfis|falta de candidato|candidatos? insuficiente/i,
    label: 'baixo volume de candidatos',
    action: 'Ampliar sourcing e canais de divulgação para vagas com baixo volume de candidatos PCD',
  },
  {
    pattern: /perfil (muito |bastante )?espec[íi]fico|exig[êe]ncias|requisitos? (muito|alto|elevado|restr)|hard skill|t[ée]cnico|qualifica[çc][aã]o/i,
    label: 'perfil técnico restritivo',
    action: 'Revisar requisitos com HMs para ampliar o pool de candidatos PCD',
  },
  {
    pattern: /desistiram?|desist[êe]ncia|declin(ou|aram?)|recusaram?|recusa de oferta|n[aã]o aceitou/i,
    label: 'desistência de candidatos',
    action: 'Mapear motivos de desistência e fortalecer proposta de valor para candidatos PCD',
  },
  {
    pattern: /laudo|certificado|documenta[çc][aã]o|comprova[çc][aã]o|CID/i,
    label: 'pendência de documentação/laudo',
    action: 'Orientar candidatos sobre etapa de validação de laudos PCD com antecedência no processo',
  },
  {
    pattern: /agenda|disponibilidade|hor[áa]rio|agendar|conciliar/i,
    label: 'conflitos de agenda',
    action: 'Aumentar flexibilidade de horários nas entrevistas para candidatos PCD',
  },
  {
    pattern: /adapta[çc][aã]o|acessibilidade|acesso|locomoc|transporte/i,
    label: 'acessibilidade ou adaptações',
    action: 'Mapear necessidades de adaptação e acessibilidade antes de avançar candidatos PCD',
  },
];

function avg(arr: number[]): number {
  return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
}

function toTitleCase(s: string): string {
  return s.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

function shortName(fullName: string): string {
  const parts = toTitleCase(fullName).split(' ');
  if (parts.length <= 2) return parts.join(' ');
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export function PcdPanel({ meta, pdfs, ui, status, onUpload, onReset, onRemovePdf, onShare, isShareLoading, onUiChange }: Props) {
  const allVagas: PcdVaga[] = useMemo(
    () => pdfs.flatMap(p => p.pcdVagas ?? []),
    [pdfs],
  );

  // ── TA filter ──────────────────────────────────────────────────────────────
  const taList = useMemo(() => {
    const set = new Set<string>();
    allVagas.forEach(v => { if (v.ta) set.add(v.ta); });
    return Array.from(set).sort();
  }, [allVagas]);

  // When exactly 1 TA is in the data, auto-select (individual analysis mode)
  const isIndividual = taList.length === 1;

  const [selectedTa, setSelectedTa] = useState<string | null>(null);

  const activeTa = selectedTa ?? (isIndividual ? taList[0] : null);

  const vagas: PcdVaga[] = useMemo(
    () => activeTa ? allVagas.filter(v => v.ta === activeTa) : allVagas,
    [allVagas, activeTa],
  );

  const hcData: PcdHcData | undefined = useMemo(() => {
    const last = [...pdfs].reverse().find(p => p.pcdHcData);
    return last?.pcdHcData;
  }, [pdfs]);

  const abertas   = vagas.filter(v => v.status === 'Em processo');
  const fechadas  = vagas.filter(v => v.anoFechamento != null);
  const outSla    = vagas.filter(v => v.sla >= SLA_THRESHOLD);
  const comPcd    = fechadas.filter(v => v.status === 'Concluída com inclusão de PCD');
  const semPcd    = fechadas.filter(v => v.status === 'Concluída sem inclusão de PCD');
  const pctComPcd = fechadas.length ? Math.round((comPcd.length / fechadas.length) * 100) : 0;
  const criticals = outSla.filter(v => v.status === 'Em processo' && v.pontosDificuldade);

  const byInstancia = INSTANCIA_ORDER.map(inst => ({
    label: inst,
    count: abertas.filter(v => v.instancia === inst).length,
  })).filter(r => r.count > 0);

  const avgSlaAbertas  = avg(abertas.map(v => v.sla));
  const avgSlaFechadas = avg(fechadas.map(v => v.sla));
  const maxSla         = vagas.length ? Math.max(...vagas.map(v => v.sla)) : 0;

  const pctInput = ui?.metaInput ?? '';
  const pctAtual = pctInput.trim() ? (parseFloat(pctInput.replace(',', '.')) || null) : null;

  const highs: string[] = useMemo(() => {
    const items: string[] = [];

    if (hcData?.porBu.length) {
      const bu = hcData.porBu[0];
      const buPct = bu.hcTotal > 0 ? Math.round((bu.hcComDiscapacidad / bu.hcTotal) * 1000) / 10 : 0;
      if (buPct >= 3) items.push(`${bu.bu}: <strong>${buPct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</strong> de PCD no HC atual (${bu.hcComDiscapacidad} de ${bu.hcTotal.toLocaleString('pt-BR')} colaboradores)`);
    }

    if (hcData?.porSeniority.length) {
      const best = [...hcData.porSeniority].sort((a, b) => b.pct - a.pct)[0];
      if (best.pct >= 5) items.push(`Melhor representação PCD: <strong>${best.layer}</strong> com ${best.pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);
    }

    if (comPcd.length > 0) {
      const names = comPcd.map(v => v.candidatoAprovado).filter(Boolean).join(', ');
      const pctStr = fechadas.length > 1 ? ` — <strong>${pctComPcd}%</strong> das vagas fechadas` : '';
      items.push(`${comPcd.length} contratação(ões) com inclusão efetiva de PCD${pctStr}${names ? `: ${names}` : ''}`);
    }

    if (pctComPcd >= 60 && fechadas.length >= 2) {
      items.push(`Taxa de inclusão de <strong>${pctComPcd}%</strong> — maioria das vagas fechadas com candidato PCD`);
    }

    const hmStage = abertas.filter(v => ['Entrevista HM', 'Entrevista L+L', 'BGC', 'Offer'].includes(v.instancia));
    if (hmStage.length > 0) {
      items.push(`${hmStage.length} vaga(s) em estágio avançado (HM / L+L / BGC / Offer) — próximas de conversão`);
    } else if (abertas.length > 0) {
      items.push(`${abertas.length} vaga(s) afirmativa(s) em andamento`);
    }

    const dentroSlaFechadas = fechadas.filter(v => v.sla < SLA_THRESHOLD);
    if (dentroSlaFechadas.length > 0 && fechadas.length >= 2) {
      items.push(`${dentroSlaFechadas.length} de ${fechadas.length} vaga(s) fechada(s) dentro do SLA de ${SLA_THRESHOLD} dias`);
    }

    if (items.length === 0) items.push('Faça upload do PDF da planilha de acompanhamento para ver os destaques.');
    return items;
  }, [comPcd, fechadas, pctComPcd, abertas, hcData]);

  const lows: string[] = useMemo(() => {
    const items: string[] = [];

    if (fechadas.length > 0 && comPcd.length === 0) {
      items.push('Nenhuma vaga fechada com inclusão efetiva de PCD no período');
    } else if (pctComPcd > 0 && pctComPcd < 50 && fechadas.length >= 2) {
      items.push(`Baixa taxa de inclusão: apenas <strong>${pctComPcd}%</strong> das vagas fechadas com candidato PCD`);
    }

    if (semPcd.length > 0 && comPcd.length > 0) {
      items.push(`${semPcd.length} vaga(s) concluída(s) sem inclusão de PCD`);
    }

    const outSlaAbertas = outSla.filter(v => v.status === 'Em processo');
    const outSlaFechadas = outSla.filter(v => v.status !== 'Em processo');
    if (outSlaAbertas.length > 0) {
      items.push(`${outSlaAbertas.length} vaga(s) abertas com SLA ≥ ${SLA_THRESHOLD} dias — máximo de <strong>${maxSla} dias</strong>`);
    }
    if (outSlaFechadas.length > 0) {
      items.push(`${outSlaFechadas.length} vaga(s) fechada(s) fora do SLA de ${SLA_THRESHOLD} dias`);
    }

    if (criticals.length > 0) {
      const allTexts = criticals.map(v => v.pontosDificuldade ?? '').join(' ');
      const matchedLabels = DIFICULDADE_THEMES.filter(t => t.pattern.test(allTexts)).map(t => t.label);
      const themeSuffix = matchedLabels.length > 0
        ? ` — dificuldades: <em>${matchedLabels.join(', ')}</em>`
        : '';
      items.push(`${criticals.length} vaga(s) crítica(s) em aberto com justificativa de atraso${themeSuffix}`);
    }

    if (abertas.length === 0 && vagas.length > 0) {
      items.push('Nenhuma vaga afirmativa em andamento — risco de descontinuidade no pipeline PCD');
    }

    if (hcData?.porSeniority.length) {
      const worst = [...hcData.porSeniority].sort((a, b) => a.pct - b.pct)[0];
      if (worst.pct < 3) items.push(`Menor representação PCD: <strong>${worst.layer}</strong> com apenas ${worst.pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% — priorizar vagas afirmativas nessa camada`);
    }

    if (items.length === 0) items.push('Faça upload do PDF da planilha de acompanhamento para ver os pontos de atenção.');
    return items;
  }, [semPcd, outSla, maxSla, criticals, comPcd, fechadas, pctComPcd, abertas, vagas, hcData]);

  const actions: string[] = useMemo(() => {
    const items: string[] = [];

    criticals.forEach(v => {
      const matched = v.pontosDificuldade
        ? PER_VAGA_ACTION_THEMES.filter(t => t.pattern.test(v.pontosDificuldade!))
        : [];
      if (matched.length > 0) {
        matched.forEach(t => items.push(t.action(v)));
      } else {
        items.push('Acionar BP para acompanhar vaga crítica em aberto');
      }
    });

    const allDiffTexts = criticals.map(v => v.pontosDificuldade ?? '').join(' ');
    DIFICULDADE_THEMES.forEach(theme => {
      if (theme.pattern.test(allDiffTexts)) items.push(theme.action);
    });

    const outSlaAbertasSemJustificativa = outSla.filter(v => v.status === 'Em processo' && !v.pontosDificuldade);
    if (outSlaAbertasSemJustificativa.length > 0) {
      items.push(`Levantar justificativa de atraso para ${outSlaAbertasSemJustificativa.length} vaga(s) abertas out of SLA sem registro`);
    }

    if (comPcd.length === 0 && fechadas.length > 0) {
      items.push('Priorizar com urgência a inclusão de PCD — nenhuma efetivação registrada no período');
    } else if (pctComPcd < 50 && fechadas.length >= 2) {
      items.push('Revisar critérios de qualificação com HMs para aumentar a taxa de inclusão efetiva');
    }


    const earlyStage = abertas.filter(v => ['Pending', 'Alinhamento de Perfil', 'Hunting'].includes(v.instancia));
    if (earlyStage.length > 0 && abertas.length >= 3) {
      items.push(`Acelerar pipeline — ${earlyStage.length} vaga(s) ainda em estágio inicial (Alinhamento / Entrevista TA)`);
    }

    if (abertas.length === 0 && vagas.length > 0) {
      items.push('Abrir novas vagas afirmativas PCD para manter continuidade do pipeline');
    }

    return items;
  }, [criticals, abertas, semPcd, comPcd, fechadas, pctComPcd, outSla, vagas]);

  return (
    <>
      <StatusBar status={status} />
      <div className={s.sectionTag}>{meta.section}</div>
      <div className={s.toolbar}>
        <div className={s.pillList}>
          {pdfs.map((pdf, i) => (
            <PdfPill key={i} pdf={pdf} index={i} onRemove={onRemovePdf} />
          ))}
        </div>
        <div className={s.btnGroup}>
          <button className={`${s.uploadBtn} ${s.secondary}`} onClick={onReset}>↺ Resetar</button>
          <button className={`${s.uploadBtn} ${s.secondary}`} onClick={onShare} disabled={isShareLoading}>
            🔗 Copiar link
          </button>
          <button className={s.uploadBtn} onClick={onUpload}>⬆ Adicionar arquivo</button>
        </div>
      </div>

      {/* TA filter — individual badge OR team chips */}
      {isIndividual && taList[0] ? (
        <div className={s.taFilter}>
          <span className={s.taIndividualBadge}>
            Análise Individual · {toTitleCase(taList[0])}
          </span>
        </div>
      ) : taList.length > 1 ? (
        <div className={s.taFilter}>
          <span className={s.taFilterLabel}>Filtrar por TA</span>
          <button
            className={`${s.taChip} ${activeTa === null ? s.taChipActive : ''}`}
            onClick={() => setSelectedTa(null)}
          >
            Todos
          </button>
          {taList.map(ta => (
            <button
              key={ta}
              className={`${s.taChip} ${activeTa === ta ? s.taChipActive : ''}`}
              onClick={() => setSelectedTa(activeTa === ta ? null : ta)}
              title={toTitleCase(ta)}
            >
              {shortName(ta)}
            </button>
          ))}
        </div>
      ) : null}

      <div className={s.main}>
        <div className={s.colLeft}>

          <div className={s.kpiRow}>
            <div className={`${s.kpiBox} ${s.kpiTotal}`}>
              <div className={s.kpiVal}>{vagas.length}</div>
              <div className={s.kpiLabel}>Total de Vagas</div>
            </div>
            <div className={`${s.kpiBox} ${s.kpiAbertas}`}>
              <div className={s.kpiVal}>{abertas.length}</div>
              <div className={s.kpiLabel}>Abertas</div>
            </div>
            <div className={`${s.kpiBox} ${s.kpiFechadas}`}>
              <div className={s.kpiVal}>{fechadas.length}</div>
              <div className={s.kpiLabel}>Fechadas 2026</div>
            </div>
            <div className={`${s.kpiBox} ${s.kpiOutSla}`}>
              <div className={s.kpiVal}>{outSla.length}</div>
              <div className={s.kpiLabel}>Out SLA (≥{SLA_THRESHOLD}d)</div>
            </div>
          </div>

          {/* Meta 5% */}
          <div className={s.goalBlock}>
            <div className={s.goalTopRow}>
              <span className={s.goalTitle}>Meta Anual — Inclusão PCD</span>
              <span className={s.goalMetaTag}>Meta: 5%</span>
            </div>

            {pctAtual === null ? (
              /* ── empty state: big input ── */
              <div className={s.goalEmpty}>
                <span className={s.goalEmptyLabel}>% PCD atual (do dashboard Diversity)</span>
                <div className={s.goalEmptyRow}>
                  <input
                    className={s.goalInputBig}
                    type="text"
                    placeholder="ex: 3,8"
                    value={pctInput}
                    onChange={e => onUiChange({ metaInput: e.target.value })}
                    autoFocus={false}
                  />
                  <span className={s.goalEmptyUnit}>%</span>
                </div>
              </div>
            ) : (() => {
              /* ── filled state: bar + gap ── */
              const gap  = Math.max(0, 5 - pctAtual);
              const fill = Math.min((pctAtual / 5) * 100, 100);
              return (
                <div className={s.goalBody}>
                  <div className={s.goalLeft}>
                    <span className={s.goalBigNum}>{pctAtual.toLocaleString('pt-BR')}%</span>
                    <span className={s.goalBigLabel}>% PCD atual</span>
                    <input
                      className={s.goalInput}
                      type="text"
                      placeholder="ex: 3,8"
                      value={pctInput}
                      onChange={e => onUiChange({ metaInput: e.target.value })}
                    />
                  </div>
                  <div className={s.goalRight}>
                    <div className={s.goalBarWrap}>
                      <div className={s.goalBarTrack}>
                        <div className={s.goalFill} style={{ width: `${fill}%` }} />
                        <div className={s.goalMark} />
                      </div>
                      <div className={s.goalBarLabels}>
                        <span>0%</span><span>5%</span>
                      </div>
                    </div>
                    <div className={gap > 0 ? s.goalGapAlert : s.goalGapOk}>
                      {gap > 0
                        ? `Faltam ${gap.toFixed(1).replace('.', ',')}% para a meta`
                        : '✓ Meta de 5% atingida'}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {vagas.length === 0 && (
            <div className={s.emptyHint}>
              Faça upload do PDF da planilha de acompanhamento de vagas para ver as análises.
            </div>
          )}

          <div className={s.analyticsGrid}>
            <div className={s.card}>
              <div className={s.cardTitle}>Funil — Vagas Abertas</div>
              <div className={s.funnelList}>
                {byInstancia.map(({ label, count }) => (
                  <div key={label} className={s.funnelRow}>
                    <span className={s.funnelLabel}>{label}</span>
                    <div className={s.funnelBarWrap}>
                      <div className={s.funnelBar} style={{ width: `${(count / abertas.length) * 100}%` }} />
                    </div>
                    <span className={s.funnelCount}>{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={s.card}>
              <div className={s.cardTitle}>Taxa de Inclusão PCD</div>
              <div className={s.inclRow}>
                <span className={s.inclNum}>{pctComPcd}%</span>
                <span className={s.inclSub}>das vagas fechadas com inclusão efetiva</span>
              </div>
              <div className={s.inclBar}>
                <div className={s.inclBarCom} style={{ width: `${pctComPcd}%` }} />
                <div className={s.inclBarSem} style={{ width: `${100 - pctComPcd}%` }} />
              </div>
              <div className={s.inclLegend}>
                <span className={s.inclLegCom}>&#9632; Com inclusão ({comPcd.length})</span>
                <span className={s.inclLegSem}>&#9632; Sem inclusão ({semPcd.length})</span>
              </div>
            </div>
          </div>

          <div className={s.card}>
            <div className={s.cardTitle}>Panorama de SLA</div>
            <div className={s.slaStrip}>
              <div className={s.slaStat}>
                <span className={s.slaStatVal}>{avgSlaAbertas}d</span>
                <span className={s.slaStatLabel}>Média — Abertas</span>
              </div>
              <div className={s.slaStatDivider} />
              <div className={s.slaStat}>
                <span className={s.slaStatVal}>{avgSlaFechadas}d</span>
                <span className={s.slaStatLabel}>Média — Fechadas</span>
              </div>
              <div className={s.slaStatDivider} />
              <div className={`${s.slaStat} ${s.slaStatAlert}`}>
                <span className={s.slaStatVal}>{maxSla}d</span>
                <span className={s.slaStatLabel}>SLA Máximo</span>
              </div>
              <div className={s.slaStatDivider} />
              <div className={`${s.slaStat} ${s.slaStatAlert}`}>
                <span className={s.slaStatVal}>{outSla.length}</span>
                <span className={s.slaStatLabel}>Out SLA (≥{SLA_THRESHOLD}d)</span>
              </div>
            </div>
          </div>

          {hcData && (
            <>
              {hcData.porSeniority.length > 0 && (
                <div className={s.card}>
                  <div className={s.cardTitle}>HC Atual — % PCD por Senioridade</div>
                  <div className={s.hcList}>
                    {hcData.porSeniority.map(row => (
                      <div key={row.layer} className={s.hcRow}>
                        <div className={s.hcRowTop}>
                          <span className={s.hcLayer}>{row.layer}</span>
                          <span className={s.hcPct}>
                            {row.pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                          </span>
                        </div>
                        <div className={s.hcBarWrap}>
                          <div className={s.hcBar} style={{ width: `${Math.min(row.pct / 10 * 100, 100)}%` }} />
                        </div>
                        <div className={s.hcAbsRow}>
                          <span className={s.hcAbsPcd}>{row.hcComDiscapacidad} PCD</span>
                          <span className={s.hcAbsTotal}>{row.hcTotal.toLocaleString('pt-BR')} total</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </>
          )}

        </div>

        <div className={s.colRight}>
          {activeTa && !isIndividual && (
            <div className={s.taActiveTag}>
              Análise: <strong>{toTitleCase(activeTa)}</strong>
            </div>
          )}
          <div>
            <div className={`${s.insightTitle} ${s.highs}`}>Highs</div>
            <ul className={`${s.insightList} ${s.highsList}`}>
              {highs.map((h, i) => <li key={i} dangerouslySetInnerHTML={{ __html: h }} />)}
            </ul>
          </div>
          <div>
            <div className={`${s.insightTitle} ${s.lows}`}>Lows</div>
            <ul className={`${s.insightList} ${s.lowsList}`}>
              {lows.map((l, i) => <li key={i} dangerouslySetInnerHTML={{ __html: l }} />)}
            </ul>
          </div>
          <div>
            <div className={`${s.insightTitle} ${s.actions}`}>Actions</div>
            <ul className={`${s.insightList} ${s.actionsList}`}>
              {actions.map((a, i) => <li key={i} dangerouslySetInnerHTML={{ __html: a }} />)}
            </ul>
          </div>

          {hcData && (hcData.porBu.length > 0 || hcData.tiposDistribucion.length > 0) && (
            <div className={s.analyticsGrid}>
              {hcData.porBu.length > 0 && (
                <div className={s.card}>
                  <div className={s.cardTitle}>HC por BU</div>
                  {hcData.porBu.map(row => {
                    const pctCalc = row.hcTotal > 0
                      ? Math.round((row.hcComDiscapacidad / row.hcTotal) * 1000) / 10
                      : 0;
                    const fillPct = Math.min(pctCalc, 100);
                    return (
                      <div key={row.bu} className={s.buCard}>
                        <div className={s.buHeader}>
                          <span className={s.buName}>{row.bu}</span>
                          <span className={s.buPct}>
                            {pctCalc.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                          </span>
                        </div>
                        <div className={s.buBar}>
                          <div className={s.buBarFill} style={{ width: `${fillPct}%` }} />
                        </div>
                        <div className={s.buStats}>
                          <div className={s.buStat}>
                            <span className={s.buStatVal}>{row.hcComDiscapacidad}</span>
                            <span className={s.buStatLabel}>PCD</span>
                          </div>
                          <div className={s.buStatDivider} />
                          <div className={s.buStat}>
                            <span className={s.buStatVal}>{row.hcTotal.toLocaleString('pt-BR')}</span>
                            <span className={s.buStatLabel}>HC Total</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {hcData.tiposDistribucion.length > 0 && (
                <div className={s.card}>
                  <div className={s.cardTitle}>Tipos de PCD</div>
                  <div className={s.tiposList}>
                    {hcData.tiposDistribucion.map(row => (
                      <div key={row.tipo} className={s.tipoRow}>
                        <span className={s.tipoLabel}>{row.tipo}</span>
                        <div className={s.tipoBarWrap}>
                          <div className={s.tipoBar} style={{ width: `${row.pct}%` }} />
                        </div>
                        <span className={s.tipoPct}>{row.pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={s.footer}>
        <div className={s.footerText}>{meta.section} · TA Transportes Brasil · 2026</div>
      </div>
    </>
  );
}
