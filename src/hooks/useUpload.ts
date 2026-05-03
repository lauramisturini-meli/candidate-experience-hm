import { useRef, useEffect, useState, useCallback, type Dispatch } from 'react';
import { extractPdfText } from '../lib/pdf-extractor';
import { isHpReport, parseHpReport } from '../lib/parser-hp';
import { isHmReport, parseHmReport } from '../lib/parser-hm';
import { parseQualtricsReport } from '../lib/parser-qualtrics';
import type { TabId, TabsAction, StatusMessage } from '../types';

export function useUpload(dispatch: Dispatch<TabsAction>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const currentTabRef = useRef<TabId | null>(null);
  const [status, setStatus] = useState<Partial<Record<TabId, StatusMessage | null>>>({});

  const setTabStatus = (tabId: TabId, s: StatusMessage | null) =>
    setStatus(prev => ({ ...prev, [tabId]: s }));

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handler = async (ev: Event) => {
      const files = Array.from((ev.target as HTMLInputElement).files ?? []);
      if (!files.length || !currentTabRef.current) return;
      const tabId = currentTabRef.current;

      let added = 0;
      let totalComments = 0;

      for (const file of files) {
        setTabStatus(tabId, { type: 'loading', msg: `Processando "${file.name}"… (${added + 1}/${files.length})` });
        try {
          const extracted = await extractPdfText(file);
          const parsed = isHpReport(extracted.fullText)
            ? parseHpReport(extracted.positionalFullText, extracted.fullText)
            : isHmReport(extracted.fullText)
              ? parseHmReport(extracted.positionalFullText, extracted.positionalPages)
              : parseQualtricsReport(extracted.fullText, extracted.pageTexts);
          parsed.fileName = file.name;
          dispatch({ type: 'ADD_PDF', tabId, pdf: parsed });
          added++;
          totalComments += parsed.comments.length;
        } catch (err) {
          console.error(err);
          const msg = err instanceof Error ? err.message : String(err);
          setTabStatus(tabId, { type: 'error', msg: `Erro em "${file.name}": ${msg}` });
          return;
        }
      }

      setTabStatus(tabId, {
        type: 'success',
        msg: `✓ ${added} PDF(s) processado(s) — ${totalComments} comentários somados.`,
      });
      setTimeout(() => setTabStatus(tabId, null), 4500);
    };

    input.addEventListener('change', handler as EventListener);
    return () => input.removeEventListener('change', handler as EventListener);
  }, [dispatch]);

  const triggerUpload = useCallback((tabId: TabId) => {
    currentTabRef.current = tabId;
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  }, []);

  return { inputRef, triggerUpload, status };
}
