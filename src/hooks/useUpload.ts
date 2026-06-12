import { useRef, useEffect, useState, useCallback, type Dispatch } from 'react';
import { extractPdfText } from '../lib/pdf-extractor';
import { isHpReport, parseHpReport } from '../lib/parser-hp';
import { isHpHtmlReport, parseHpHtmlReport } from '../lib/parser-hp-html';
import { isHmReport, parseHmReport } from '../lib/parser-hm';
import { isOutSlaReport, parseOutSlaReport } from '../lib/parser-outsla';
import { parseQualtricsReport } from '../lib/parser-qualtrics';
import { isPcdReport, parsePcdReport } from '../lib/parser-pcd';
import { isTonhReport, parseTonhReport } from '../lib/parser-tonh';
import type { TabId, TabsAction, StatusMessage } from '../types';

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });

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
          // HTML files from Grid — read as text, bypass PDF extractor
          if (/\.html?$/i.test(file.name)) {
            const html = await readFileAsText(file);
            if (!isHpHtmlReport(html)) throw new Error('Arquivo HTML não reconhecido como relatório HP do Grid.');
            const parsed = parseHpHtmlReport(html, file.name);
            dispatch({ type: 'ADD_PDF', tabId, pdf: parsed });
            added++;
            continue;
          }

          const extracted = await extractPdfText(file);
          const parsed = isPcdReport(extracted.fullText)
            ? parsePcdReport(extracted.pageTexts, file.name)
            : isOutSlaReport(extracted.fullText)
              ? parseOutSlaReport(extracted.positionalFullText, file.name)
              : isHpReport(extracted.fullText)
                ? parseHpReport(extracted.positionalFullText, extracted.fullText)
                : isHmReport(extracted.fullText)
                  ? parseHmReport(extracted.positionalFullText, extracted.positionalPages)
                  : isTonhReport(extracted.fullText)
                    ? parseTonhReport(extracted.fullText, extracted.pageTexts, file.name)
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
        msg: totalComments > 0
          ? `✓ ${added} PDF(s) processado(s) — ${totalComments} comentários somados.`
          : `✓ ${added} arquivo(s) processado(s).`,
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
      inputRef.current.accept = 'application/pdf,.csv,.xlsx,.htm,.html';
      inputRef.current.click();
    }
  }, []);

  return { inputRef, triggerUpload, status };
}
