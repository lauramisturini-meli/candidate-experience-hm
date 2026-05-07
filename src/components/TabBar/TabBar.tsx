import type { TabId, TabMeta, TabsState } from '../../types';
import s from './TabBar.module.css';

interface Props {
  tabs: Array<{ id: TabId; meta: TabMeta }>;
  activeTab: TabId;
  tabsData: TabsState;
  onSelect: (id: TabId) => void;
}

function Icon({ d }: { d: string | string[] }) {
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg className={s.tabIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {paths.map((path, i) => <path key={i} d={path} />)}
    </svg>
  );
}

const ICONS: Record<TabId, string | string[]> = {
  external: 'M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z',
  internal: 'M16 11c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3zm-8 0c1.7 0 3-1.3 3-3S9.7 5 8 5 5 6.3 5 8s1.3 3 3 3zm0 2c-2.3 0-7 1.2-7 3.5V18h14v-1.5c0-2.3-4.7-3.5-7-3.5zm8 0c-.3 0-.6 0-1 .1 1.2.8 2 2 2 3.4V18h6v-1.5c0-2.3-4.7-3.5-7-3.5z',
  hm: [
    'M14 8c0-2.21-1.79-4-4-4S6 5.79 6 8s1.79 4 4 4 4-1.79 4-4z',
    'M2 18c0 2.21 3.58 4 8 4s8-1.79 8-4v-2H2v2z',
    'M15 11l-1.8 1.8 2.7 2.7L21 10l-1.8-1.8-4.5 4.5L15 11z',
  ],
  tonh:    'M16 6l2.3 2.3-6.3 6.3-4-4L2 16.6 3.4 18l4.6-4.6 4 4 7.6-7.6L22 12V6h-6z',
  pcd:     'M15.5 14h-.8l-.3-.3C15.4 12.6 16 11.4 16 10c0-3.3-2.7-6-6-6S4 6.7 4 10s2.7 6 6 6c1.4 0 2.6-.5 3.5-1.5l.3.3v.8l5 5 1.5-1.5-5-5zm-5.5 0C7.5 14 5 11.5 5 8.5S7.5 3 10 3s5 2.5 5 5.5-2.5 5.5-5 5.5z',
  hpc:     'M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z',
  outsla:  'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z',
};

export function TabBar({ tabs, activeTab, tabsData, onSelect }: Props) {
  return (
    <div className={s.tabBar}>
      {tabs.map(({ id, meta }) => {
        const hasData = tabsData[id].pdfs.length > 0;
        return (
          <button
            key={id}
            className={[s.tabBtn, id === activeTab ? s.active : '', hasData ? s.hasData : ''].join(' ')}
            onClick={() => onSelect(id)}
          >
            <Icon d={ICONS[id]} />
            {meta.label}
            <span className={s.dot} />
          </button>
        );
      })}
    </div>
  );
}
