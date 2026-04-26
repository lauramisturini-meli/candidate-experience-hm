import { TAB_IDS, TAB_META } from './lib/constants';
import { useTabs } from './hooks/useTabs';
import { useToast } from './hooks/useToast';
import { useShare } from './hooks/useShare';
import { useUpload } from './hooks/useUpload';
import { BrandHeader } from './components/BrandHeader/BrandHeader';
import { TabBar } from './components/TabBar/TabBar';
import { TabPanel } from './components/TabPanel/TabPanel';
import { Toast } from './components/Toast/Toast';
import s from './App.module.css';

const TABS = TAB_IDS.map(id => ({ id, meta: TAB_META[id] }));

export function App() {
  const { tabsData, dispatch, activeTab, setActiveTab } = useTabs();
  const { toasts, showToast } = useToast();
  const { copyShareableLink, isShareLoading } = useShare(tabsData, dispatch, showToast);
  const { inputRef, triggerUpload, status } = useUpload(dispatch);

  return (
    <div className={s.slide}>
      <BrandHeader />
      <TabBar tabs={TABS} activeTab={activeTab} tabsData={tabsData} onSelect={setActiveTab} />

      {TABS.map(({ id, meta }) => (
        <TabPanel
          key={id}
          tabId={id}
          meta={meta}
          pdfs={tabsData[id].pdfs}
          isActive={id === activeTab}
          status={status[id]}
          onUpload={() => triggerUpload(id)}
          onReset={() => dispatch({ type: 'RESET_TAB', tabId: id })}
          onRemovePdf={idx => dispatch({ type: 'REMOVE_PDF', tabId: id, index: idx })}
          onShare={copyShareableLink}
          isShareLoading={isShareLoading}
        />
      ))}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        style={{ display: 'none' }}
      />

      <Toast toasts={toasts} />
    </div>
  );
}
