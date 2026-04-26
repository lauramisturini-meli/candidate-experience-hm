import type { TabId, TabMeta } from '../types';

export const TAB_IDS: TabId[] = ['ytd', 'actual', 'internal', 'hm', 'tonh', 'pcd', 'hpc'];

export const TAB_META: Record<TabId, TabMeta> = {
  ytd:      { label: 'YTD',               section: 'External Candidate Experience', sectionColor: 'black' },
  actual:   { label: 'Actual Date',        section: 'External Candidate Experience', sectionColor: 'black' },
  internal: { label: 'Internal Candidate', section: 'Internal Candidate Experience', sectionColor: 'gray'  },
  hm:       { label: 'Hiring Manager',     section: 'Hiring Manager Experience',     sectionColor: 'gray'  },
  tonh:     { label: 'TO NH',              section: 'Turn Over New Hire',            sectionColor: 'gray'  },
  pcd:      { label: 'PCD',               section: 'PCD',                           sectionColor: 'gray'  },
  hpc:      { label: 'HP Completion',      section: 'Hiring Plan Completion',        sectionColor: 'gray'  },
};
