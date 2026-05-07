import { useReducer, useState } from 'react';
import { TAB_IDS } from '../lib/constants';
import type { TabId, TabsState, TabsAction } from '../types';

const initialState: TabsState = Object.fromEntries(
  TAB_IDS.map(id => [id, { pdfs: [] }])
) as unknown as TabsState;

function tabsReducer(state: TabsState, action: TabsAction): TabsState {
  switch (action.type) {
    case 'ADD_PDF':
      return { ...state, [action.tabId]: { pdfs: [...state[action.tabId].pdfs, action.pdf] } };
    case 'REMOVE_PDF': {
      const pdfs = state[action.tabId].pdfs.filter((_, i) => i !== action.index);
      return { ...state, [action.tabId]: { pdfs } };
    }
    case 'RESET_TAB':
      return { ...state, [action.tabId]: { pdfs: [] } };
    case 'HYDRATE':
      return { ...state, ...action.state };
  }
}

export function useTabs() {
  const [tabsData, dispatch] = useReducer(tabsReducer, initialState);
  const [activeTab, setActiveTab] = useState<TabId>('external');
  return { tabsData, dispatch, activeTab, setActiveTab };
}
