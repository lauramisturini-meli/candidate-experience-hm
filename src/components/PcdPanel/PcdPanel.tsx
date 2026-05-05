import type { TabMeta } from '../../types';
import s from './PcdPanel.module.css';

interface Props {
  meta: TabMeta;
}

type PcdStatus = 'Em processo' | 'Concluída com inclusão de PCD' | 'Concluída sem inclusão de PCD';

interface PcdVaga {
  numVaga: string;
  senioridade: string;
  localidade: string;
  hm: string;
  bp: string;
  status: PcdStatus;
  instancia: string;
  sla: number;
  pontosDificuldade?: string;
  candidatoAprovado?: string;
  mesFechamento?: string;
  anoFechamento?: number;
}

const SLA_THRESHOLD = 50;

const VAGAS: PcdVaga[] = [
  {
    numVaga: '52014458',
    senioridade: 'Analista',
    localidade: 'Ext - São Paulo Capital - Brazil',
    hm: 'Anderson Rodrigo do Nascimento Gomes',
    bp: 'Marcela de Souza Oliveira',
    status: 'Em processo',
    instancia: 'Entrevista HM',
    sla: 76,
    pontosDificuldade:
      'A principal dificuldade é a alta exigência do perfil, reduzindo o número de candidatos aderentes. Apesar de bom volume de entrevistas, houve perdas no processo, incluindo reprovação em BGC e atraso na validação de laudo. O tempo de retorno para laudos tem impactado negativamente a agilidade. Com isso, a vaga segue com SLA elevado e em mapeamento contínuo de novos perfis.',
  },
  {
    numVaga: '52018966',
    senioridade: 'Supervisor',
    localidade: 'SOC - Cajamar SOC2 - Brazil',
    hm: 'Gustavo Borssatto Parazzi',
    bp: 'Denise Keli Moreira Boconcelo',
    status: 'Concluída com inclusão de PCD',
    instancia: 'Concluída',
    sla: 82,
    candidatoAprovado: 'Lucas de Paula Vitoriano',
    mesFechamento: 'Abril',
    anoFechamento: 2026,
  },
  {
    numVaga: '52018878',
    senioridade: 'Analista',
    localidade: 'SOC - Cajamar SOC2 - Brazil',
    hm: 'Vinicius Alexandre Savoy',
    bp: 'Marcela de Souza Oliveira',
    status: 'Concluída sem inclusão de PCD',
    instancia: 'Concluída',
    sla: 82,
    candidatoAprovado: 'Mirian Cristina Luiz Pedro',
    mesFechamento: 'Abril',
    anoFechamento: 2026,
  },
  {
    numVaga: '52018753',
    senioridade: 'Assistente',
    localidade: 'Melicidade - Brazil',
    hm: 'Manuela Goes Ribeiro Coelho',
    bp: 'Celia Regina de Oliveira Arruda',
    status: 'Em processo',
    instancia: 'Alinhamento de Perfil',
    sla: 5,
  },
  {
    numVaga: '52018761',
    senioridade: 'Assistente',
    localidade: 'Melicidade - Brazil',
    hm: 'Ingrid Larissa Souza',
    bp: 'Celia Regina de Oliveira Arruda',
    status: 'Concluída sem inclusão de PCD',
    instancia: 'Concluída',
    sla: 42,
    candidatoAprovado: 'Isabella de Souza Farias Ribeiro',
    mesFechamento: 'Maio',
    anoFechamento: 2026,
  },
  {
    numVaga: '52018760',
    senioridade: 'Assistente',
    localidade: 'Melicidade - Brazil',
    hm: 'Yuri Gorentzvaig',
    bp: 'Celia Regina de Oliveira Arruda',
    status: 'Em processo',
    instancia: 'Entrevista TA',
    sla: 34,
  },
  {
    numVaga: '52018753',
    senioridade: 'Assistente',
    localidade: 'Melicidade - Brazil',
    hm: 'Manuela Goes Ribeiro Coelho',
    bp: 'Celia Regina de Oliveira Arruda',
    status: 'Em processo',
    instancia: 'Alinhamento de Perfil',
    sla: 5,
  },
  {
    numVaga: '52014561',
    senioridade: 'Analista',
    localidade: 'XD - Mega Cravinhos BRXSP15 - Brazil',
    hm: 'Andressa Pereira de Souza',
    bp: 'Mariana Netto de Carvalho',
    status: 'Em processo',
    instancia: 'Entrevista HM',
    sla: 11,
  },
  {
    numVaga: '52020718',
    senioridade: 'Team Leader - Shipping',
    localidade: 'SOC - Cajamar SOC1 - Brazil',
    hm: 'Vinicius Galassi',
    bp: 'Bruno A P Souza',
    status: 'Concluída com inclusão de PCD',
    instancia: 'Concluída',
    sla: 17,
    candidatoAprovado: 'Jean Carlos Ferreira',
    mesFechamento: 'Maio',
    anoFechamento: 2026,
  },
  {
    numVaga: '52018752',
    senioridade: 'Assistente',
    localidade: 'Melicidade - Brazil',
    hm: 'Milena Gonçalves Silva',
    bp: 'Celia Regina de Oliveira Arruda',
    status: 'Em processo',
    instancia: 'Alinhamento de Perfil',
    sla: 5,
  },
  {
    numVaga: '65063937',
    senioridade: 'Assistente',
    localidade: 'SC - Barueri CT SSP5 - Brazil',
    hm: 'Fernanda da Silva Fraga',
    bp: 'Mariana Netto de Carvalho',
    status: 'Em processo',
    instancia: 'Entrevista TA',
    sla: 15,
  },
  {
    numVaga: '65037389',
    senioridade: 'Analista',
    localidade: 'FBM - Cajamar BRSP04 - Brazil',
    hm: 'Aline Toshie Akiyama',
    bp: 'Mariana Netto de Carvalho',
    status: 'Em processo',
    instancia: 'Pending',
    sla: 0,
  },
];

const HIGHS = [
  '4 vagas afirmativas concluídas em 2026 (Abril e Maio)',
  '2 contratações com inclusão efetiva de PCD: <strong>Jean Carlos Ferreira</strong> e <strong>Lucas de Paula Vitoriano</strong>',
  'SLA mínimo de 17 dias em vaga fechada (52020718 — Team Leader SOC1)',
];

const LOWS = [
  '3 vagas ultrapassaram o SLA de 50 dias — máximo de <strong>82 dias</strong>',
  'Vaga <strong>52014458</strong> (Analista Ext SP) com 76 dias em Entrevista HM — SLA crítico',
  'Demora na validação de laudos médicos impacta negativamente a agilidade dos processos',
];

const ACTIONS = [
  'Acionar BP para priorizar retorno de laudos na vaga <strong>52014458</strong>',
  'Mapear continuamente novos perfis PCD para vagas com SLA elevado',
  'Alinhar exigências de perfil com HMs para reduzir perdas no processo seletivo',
];

function instanciaClass(inst: string): string {
  if (inst === 'Alinhamento de Perfil') return s.instAlinhamento;
  if (inst === 'Entrevista HM') return s.instHM;
  if (inst === 'Entrevista TA') return s.instTA;
  return s.instDefault;
}

export function PcdPanel({ meta }: Props) {
  const abertas = VAGAS.filter(v => v.status === 'Em processo');
  const fechadas2026 = VAGAS.filter(v => v.anoFechamento === 2026);
  const outSla = VAGAS.filter(v => v.sla >= SLA_THRESHOLD);

  return (
    <>
      <div className={s.sectionTag}>{meta.section}</div>

      <div className={s.main}>
        <div className={s.colLeft}>
          <div className={s.kpiRow}>
            <div className={`${s.kpiBox} ${s.kpiTotal}`}>
              <div className={s.kpiVal}>{VAGAS.length}</div>
              <div className={s.kpiLabel}>Total de Vagas</div>
            </div>
            <div className={`${s.kpiBox} ${s.kpiAbertas}`}>
              <div className={s.kpiVal}>{abertas.length}</div>
              <div className={s.kpiLabel}>Abertas</div>
            </div>
            <div className={`${s.kpiBox} ${s.kpiFechadas}`}>
              <div className={s.kpiVal}>{fechadas2026.length}</div>
              <div className={s.kpiLabel}>Fechadas em 2026</div>
            </div>
            <div className={`${s.kpiBox} ${s.kpiOutSla}`}>
              <div className={s.kpiVal}>{outSla.length}</div>
              <div className={s.kpiLabel}>Out SLA (≥{SLA_THRESHOLD} dias)</div>
            </div>
          </div>

          <div className={s.sections}>
            <section className={s.section}>
              <div className={s.sectionHeader}>
                <span className={s.sectionTitle}>Vagas Afirmativas Abertas</span>
                <span className={s.badge}>{abertas.length}</span>
              </div>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Nº Vaga</th>
                    <th>Senioridade</th>
                    <th>Localidade</th>
                    <th>HM</th>
                    <th>Instância</th>
                    <th>SLA (dias)</th>
                  </tr>
                </thead>
                <tbody>
                  {abertas.map((v, i) => (
                    <tr key={i} className={v.sla >= SLA_THRESHOLD ? s.rowAlert : ''}>
                      <td className={s.vagaNum}>{v.numVaga}</td>
                      <td>{v.senioridade}</td>
                      <td className={s.localidade}>{v.localidade}</td>
                      <td>{v.hm}</td>
                      <td>
                        <span className={`${s.instBadge} ${instanciaClass(v.instancia)}`}>
                          {v.instancia}
                        </span>
                      </td>
                      <td className={v.sla >= SLA_THRESHOLD ? s.slaAlert : ''}>
                        <strong>{v.sla}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className={s.section}>
              <div className={s.sectionHeader}>
                <span className={s.sectionTitle}>Vagas Fechadas em 2026</span>
                <span className={s.badge}>{fechadas2026.length}</span>
              </div>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Nº Vaga</th>
                    <th>Senioridade</th>
                    <th>HM</th>
                    <th>Status</th>
                    <th>Candidato(a) Aprovado(a)</th>
                    <th>Mês</th>
                    <th>SLA (dias)</th>
                  </tr>
                </thead>
                <tbody>
                  {fechadas2026.map((v, i) => (
                    <tr key={i}>
                      <td className={s.vagaNum}>{v.numVaga}</td>
                      <td>{v.senioridade}</td>
                      <td>{v.hm}</td>
                      <td>
                        <span
                          className={`${s.statusBadge} ${
                            v.status === 'Concluída com inclusão de PCD'
                              ? s.statusComPcd
                              : s.statusSemPcd
                          }`}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td className={s.candidato}>{v.candidatoAprovado ?? '—'}</td>
                      <td>{v.mesFechamento}</td>
                      <td>{v.sla}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className={s.section}>
              <div className={s.sectionHeader}>
                <span className={s.sectionTitle}>
                  Vagas com SLA ≥ {SLA_THRESHOLD} dias — Justificativa
                </span>
                <span className={`${s.badge} ${s.badgeAlert}`}>{outSla.length}</span>
              </div>
              <div className={s.slaCards}>
                {outSla.map((v, i) => (
                  <div key={i} className={s.slaCard}>
                    <div className={s.slaCardHeader}>
                      <span className={s.vagaNum}>{v.numVaga}</span>
                      <span className={s.slaDays}>{v.sla} dias</span>
                      <span
                        className={`${s.statusBadge} ${
                          v.status === 'Concluída com inclusão de PCD'
                            ? s.statusComPcd
                            : v.status === 'Concluída sem inclusão de PCD'
                            ? s.statusSemPcd
                            : s.statusAberta
                        }`}
                      >
                        {v.status}
                      </span>
                    </div>
                    <div className={s.slaCardMeta}>
                      {v.senioridade} · HM: {v.hm}
                    </div>
                    {v.pontosDificuldade ? (
                      <div className={s.slaCardText}>{v.pontosDificuldade}</div>
                    ) : (
                      <div className={s.slaCardEmpty}>Vaga concluída — sem justificativa pendente.</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <div className={s.colRight}>
          <div>
            <div className={`${s.insightTitle} ${s.highs}`}>Highs</div>
            <ul className={`${s.insightList} ${s.highsList}`}>
              {HIGHS.map((h, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: h }} />
              ))}
            </ul>
          </div>
          <div>
            <div className={`${s.insightTitle} ${s.lows}`}>Lows</div>
            <ul className={`${s.insightList} ${s.lowsList}`}>
              {LOWS.map((l, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: l }} />
              ))}
            </ul>
          </div>
          <div>
            <div className={`${s.insightTitle} ${s.actions}`}>Actions</div>
            <ul className={`${s.insightList} ${s.actionsList}`}>
              {ACTIONS.map((a, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: a }} />
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className={s.footer}>
        <div className={s.footerText}>{meta.section} · TA Transportes Brasil · 2026</div>
      </div>
    </>
  );
}
