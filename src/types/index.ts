export interface Dimension {
  name: string;
  fav: string;
  desfav: string;
}

export interface Comment {
  score: number;
  division: string;
  name: string;
  text: string;
}

export interface HpLayerRow {
  equipo: string;
  agrupLayer: string;
  cerradas: number;
  sinActivar: number;
  onGoing: number;
  reemplazosProyectados: number;
  rotacionesProyectadas: number;
}

export interface HpSlaStats {
  ativasFora: number;
  ativasTotal: number;
  ativasPct: number;
  ativasAvgAging: number;
  fechadasFora: number;
  fechadasTotal: number;
  fechadasPct: number;
  fechadasAvgTto: number;
}

export interface HpPipelineStep {
  step: string;
  count: number;
}

export interface HpQuarter {
  q: string;
  previstas: number;
  fechadas: number;
}

export interface HpPayload {
  title: string;
  year: string;
  posicionesTotal: number;
  cerradas: number;
  onGoing: number;
  sinActivar: number;
  reemplazosProyectados: number;
  operadoresProyectados: number;
  totalRotations: number;
  porcentajeAvance: number;
  rows: HpLayerRow[];
  // HTML-sourced rich data (optional)
  sla?: HpSlaStats;
  pipeline?: HpPipelineStep[];
  quarters?: HpQuarter[];
  highs?: string[];
  lows?: string[];
  actions?: string[];
}

export interface PdfData {
  respostas: number | null;
  fav: string;
  desfav: string;
  dimensions: Dimension[];
  comments: Comment[];
  filters: Record<string, string>;
  overallRange: string;
  periodLabel: string;
  isHm: boolean;
  fileName: string;
  isHp?: boolean;
  hpPayload?: HpPayload;
  isOutSla?: boolean;
  pcdVagas?: PcdVaga[];
  pcdHcData?: PcdHcData;
  outSlaPayload?: OutSlaPayload;
  isTonhExit?: boolean;
  tonhCases?: TonhCase[];
  tonhDashboard?: TonhLayerDashboard;
}

export type TabId = 'external' | 'internal' | 'hm' | 'tonh' | 'pcd' | 'hpc' | 'outsla';

export interface TabMeta {
  label: string;
  section: string;
  sectionColor: 'black' | 'gray';
}

export type DimOverrides = Record<number, { fav?: string; neutros?: string; desfav?: string }>;

export interface TabUiState {
  kpiDesfav?: string;
  kpiNeutros?: string;
  dimOverrides?: DimOverrides;
  metaInput?: string;
  metaTl?: string;
  metaDemais?: string;
}

export type TabsState = Record<TabId, { pdfs: PdfData[]; ui?: TabUiState }>;

export type TabsAction =
  | { type: 'ADD_PDF'; tabId: TabId; pdf: PdfData }
  | { type: 'REMOVE_PDF'; tabId: TabId; index: number }
  | { type: 'RESET_TAB'; tabId: TabId }
  | { type: 'HYDRATE'; state: TabsState }
  | { type: 'SET_UI'; tabId: TabId; ui: Partial<TabUiState> };

export interface Kpis {
  respostas: number;
  favorabilidade: string;
  neutros: string;
  neutrosSub: string;
  desfavorabilidade: string;
}

export interface HpSummary {
  paragraph1: string;
  paragraph2: string;
}

export interface OutSlaRow {
  idInternal: string;
  positionCode: string;
  qExpectation: string;
  timeToOffer: number;
  origin: string;
  stage: string;
  seniority: string;
  site: string;
  offTimeReason: string;
}

export interface OutSlaPayload {
  rows: OutSlaRow[];
}

export type TonhLayerGroup = 'team-leader' | 'outros';

export interface TonhCase {
  nome: string;
  rol: string;
  area: string;
  hiringManager: string;
  panelEntrevistador: string;
  flags: string;
  motivoSalida: string;
  principaisMotivos: string;
  tiempoEnRol: string;
  tiempoEnRolMeses: number | null;
  comentarios: string;
  conclusoes: string;
  acuerdos: string;
  fileName: string;
}

export interface TonhMonthlyPoint {
  mes: string;
  pct: number;
}

export interface TonhSeniorityPoint {
  seniority: string;
  pct: number;
}

export interface TonhLayerDashboard {
  layerGroup: TonhLayerGroup;
  meta: number;
  toOverallYtdPct: number | null;
  overallYtd: number | null;
  hcPromedioYtd: number | null;
  toOverall12mPct: number | null;
  overall12m: number | null;
  hcPromedio12m: number | null;
  monthlyTrend: TonhMonthlyPoint[];
  porSeniority: TonhSeniorityPoint[];
}

export interface MergedView {
  periodLabel: string;
  kpis: Kpis;
  dimensions: Dimension[];
  worstDimensionName: string | null;
  detractorHtml: string;
  highs: string[];
  lows: string[];
  actions: string[];
  hpPayload?: HpPayload;
  hpSummary?: HpSummary;
}

export type PcdStatus = 'Em processo' | 'Concluída com inclusão de PCD' | 'Concluída sem inclusão de PCD';

export interface PcdHcSeniorityRow {
  layer: string;
  hcComDiscapacidad: number;
  hcTotal: number;
  pct: number;
}

export interface PcdHcBuRow {
  bu: string;
  hcComDiscapacidad: number;
  hcTotal: number;
  pct: number;
}

export interface PcdTipoRow {
  tipo: string;
  pct: number;
}

export interface PcdHcData {
  porSeniority: PcdHcSeniorityRow[];
  porBu: PcdHcBuRow[];
  tiposDistribucion: PcdTipoRow[];
}

export interface PcdVaga {
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

export interface ExtractedPdf {
  fullText: string;
  pageTexts: string[];
  positionalFullText: string;
  positionalPages: string[];
}

export type StatusType = 'loading' | 'success' | 'error';

export interface StatusMessage {
  type: StatusType;
  msg: string;
}

export type ToastKind = 'success' | 'error';

export interface Toast {
  id: string;
  msg: string;
  kind: ToastKind;
}
