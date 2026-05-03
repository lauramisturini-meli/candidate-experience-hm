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

export interface HpPayload {
  title: string;
  year: string;
  posicionesTotal: number;
  cerradas: number;
  onGoing: number;
  sinActivar: number;
  reemplazosProyectados: number;
  operadoresProyectados: number;
  porcentajeAvance: number;
  rows: HpLayerRow[];
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
}

export type TabId = 'external' | 'internal' | 'hm' | 'tonh' | 'pcd' | 'hpc' | 'outsla';

export interface TabMeta {
  label: string;
  section: string;
  sectionColor: 'black' | 'gray';
}

export type TabsState = Record<TabId, { pdfs: PdfData[] }>;

export type TabsAction =
  | { type: 'ADD_PDF'; tabId: TabId; pdf: PdfData }
  | { type: 'REMOVE_PDF'; tabId: TabId; index: number }
  | { type: 'RESET_TAB'; tabId: TabId }
  | { type: 'HYDRATE'; state: TabsState };

export interface Kpis {
  respostas: number;
  favorabilidade: string;
  neutros: string;
  neutrosSub: string;
  desfavorabilidade: string;
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
