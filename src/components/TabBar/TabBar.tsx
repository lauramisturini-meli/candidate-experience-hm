import type { TabId, TabMeta, TabsState } from '../../types';
import s from './TabBar.module.css';

interface Props {
  tabs: Array<{ id: TabId; meta: TabMeta }>;
  activeTab: TabId;
  tabsData: TabsState;
  onSelect: (id: TabId) => void;
}

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
            {meta.label}
            <span className={s.dot} />
          </button>
        );
      })}
    </div>
  );
}
