import type { TabId, TabMeta, StatusMessage } from '../../types';
import { StatusBar } from '../StatusBar/StatusBar';
import s from './SkeletonPanel.module.css';

interface Props {
  tabId: TabId;
  meta: TabMeta;
  status: StatusMessage | null | undefined;
  onUpload: () => void;
}

const TAB_GUIDES: Record<TabId, { file: string; analysis: string; individual?: string }> = {
  external: {
    file: 'PDF do Qualtrics — External Candidate Experience.',
    analysis: 'Favorabilidade, dimensões, comentários, highs, lows e ações.',
    individual: 'Exporte o PDF com o filtro TA Owner aplicado; múltiplos PDFs podem ser consolidados.',
  },
  internal: {
    file: 'PDF do Qualtrics — Internal Candidate Experience.',
    analysis: 'Experiência no processo interno, dimensões críticas, comentários e plano de ação.',
    individual: 'A análise segue o escopo e os filtros existentes no PDF exportado.',
  },
  hm: {
    file: 'PDF do Qualtrics - Hiring Manager Experience.',
    analysis: 'Percepção dos gestores, alinhamento de perfil, comunicação, agilidade e comentários.',
    individual: 'A análise segue o escopo e os filtros existentes no PDF exportado.',
  },
  tonh: {
    file: 'XLSX completo da Jornada do TA, CSV da aba-base ou PDFs de Exit Discussion. Base e PDF podem ser carregados juntos e se complementam sem duplicar o caso.',
    analysis: 'Base: somente Data de saída = 2026 e Gerou TO NH? = SIM.\nPDF: somente casos confirmados no upload como saídas de 2026.',
    individual: 'O arquivo geral mostra o time; selecione um TA nos filtros para a visão individual.',
  },
  pcd: {
    file: 'CSV ou XLSX geral de Positions baixado do WFH.',
    analysis: 'Vagas no nome de TAs de Transportes Brasil marcadas com tag PCD, pipeline, SLA e inclusão nas vagas concluídas.',
    individual: 'O arquivo geral mostra o time; selecione um TA nos filtros para a visão individual.',
  },
  hpc: {
    file: 'HTML de Vagas Individuais — Hiring Plan. Não use o arquivo Dashboard Unificado.',
    analysis: 'Conclusão do plano, posições abertas/fechadas, SLA, pipeline, quarters e senioridade.',
    individual: 'O relatório geral mostra o time; selecione um TA nos filtros para a visão individual.',
  },
  outsla: {
    file: 'CSV ou XLSX geral de Positions baixado do WFH; planilhas individuais continuam aceitas.',
    analysis: 'Posições do time acima de 75 dias, abertas ou concluídas, com etapa e motivo do atraso.',
    individual: 'O arquivo geral mostra o time; selecione um TA nos filtros para a visão individual.',
  },
};

export function SkeletonPanel({ tabId, meta, status, onUpload }: Props) {
  const guide = TAB_GUIDES[tabId];

  return (
    <>
      <StatusBar status={status} />
      <div className={s.sectionTag}>{meta.section}</div>
      <section className={s.guide} aria-labelledby={`guide-${tabId}`}>
        <div className={s.guideHeading}>
          <div>
            <div className={s.guideEyebrow}>Primeiros passos</div>
            <h2 className={s.guideTitle} id={`guide-${tabId}`}>Como usar esta aba</h2>
          </div>
          <p className={s.guideIntro}>Envie o arquivo indicado para gerar os indicadores e insights desta visão.</p>
        </div>
        <div className={`${s.guideGrid} ${guide.individual ? '' : s.guideGridTwo}`}>
          <article className={s.guideItem}>
            <div className={s.guideItemHeader}>
              <span className={s.guideStep}>01</span>
              <span className={s.guideLabel}>Arquivo para enviar</span>
            </div>
            <p>{guide.file}</p>
          </article>
          <article className={s.guideItem}>
            <div className={s.guideItemHeader}>
              <span className={s.guideStep}>02</span>
              <span className={s.guideLabel}>O que será analisado</span>
            </div>
            <p>{guide.analysis}</p>
          </article>
          {guide.individual && (
            <article className={s.guideItem}>
              <div className={s.guideItemHeader}>
                <span className={s.guideStep}>03</span>
                <span className={s.guideLabel}>Visão individual</span>
              </div>
              <p>{guide.individual}</p>
            </article>
          )}
        </div>
      </section>
      <div className={s.panel}>
        <div className={s.emptyIcon} aria-hidden="true">↑</div>
        <div className={s.emptyContent}>
          <div className={s.emptyTitle}>Pronto para analisar {meta.section}</div>
          <p>Adicione o arquivo indicado acima. Os indicadores e insights aparecerão aqui.</p>
        </div>
        <button className={s.emptyUploadBtn} onClick={onUpload}>Adicionar arquivo</button>
      </div>
      <div className={s.footer}>
        <div className={s.footerText}>{meta.section} · TA Transportes Brasil · Aguardando dados</div>
      </div>
    </>
  );
}

