import { describe, expect, it } from 'vitest';
import { tabsReducer } from '../src/hooks/useTabs';
import type { PdfData, TabsState, TonhCase } from '../src/types';

function tonhCase(nome: string, origem: TonhCase['origem']): TonhCase {
  return {
    nome, rol: '', area: '', hiringManager: '', panelEntrevistador: '', flags: '',
    motivoSalida: '', principaisMotivos: '', tiempoEnRol: '', tiempoEnRolMeses: null,
    comentarios: '', conclusoes: '', acuerdos: '', fileName: '', origem,
  };
}

function file(name: string, source: PdfData['tonhSource'], cases: TonhCase[]): PdfData {
  return {
    respostas: cases.length, fav: '', desfav: '', dimensions: [], comments: [], filters: {},
    overallRange: '', periodLabel: 'TO NH', isHm: false, fileName: name,
    isTonhExit: true, tonhSource: source, tonhCases: cases,
  };
}

describe('TO NH upload batches', () => {
  it('clears prior material before adding the files selected in the new batch', () => {
    const first = file('jornada-setembro.xlsx', 'tracking', [tonhCase('Caso antigo', 'base')]);
    const discussion = file('exit-discussion.pdf', 'exit-discussion', [tonhCase('Caso analisado', 'exit-discussion')]);
    const newer = file('jornada-outubro.xlsx', 'tracking', [tonhCase('RONE FIRMINO', 'base')]);
    const state = { tonh: { pdfs: [first, discussion] } } as TabsState;

    const cleared = tabsReducer(state, { type: 'CLEAR_TAB_DATA', tabId: 'tonh' });
    const afterDiscussion = tabsReducer(cleared, { type: 'ADD_PDF', tabId: 'tonh', pdf: discussion });
    const next = tabsReducer(afterDiscussion, { type: 'ADD_PDF', tabId: 'tonh', pdf: newer });

    expect(next.tonh.pdfs).toEqual([discussion, newer]);
  });
});
