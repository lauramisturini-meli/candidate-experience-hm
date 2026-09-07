import { useRef, useEffect, useState, useCallback, type Dispatch } from 'react';
import * as XLSX from 'xlsx';
import { extractPdfText } from '../lib/pdf-extractor';
import { isHpReport, parseHpReport } from '../lib/parser-hp';
import { getHpDashboardSource, isHpHtmlReport, parseHpHtmlReport } from '../lib/parser-hp-html';
import { isHmReport, parseHmReport } from '../lib/parser-hm';
import { isOutSlaReport, parseOutSlaReport } from '../lib/parser-outsla';
import { isOutSlaXlsxWorkbook, parseOutSlaXlsxReport } from '../lib/parser-outsla-xlsx';
import { isWfhPositionsWorkbook, parseWfhOutSlaReport, parseWfhPcdReport } from '../lib/parser-wfh-positions';
import { parseQualtricsReport } from '../lib/parser-qualtrics';
import { isPcdReport, parsePcdReport } from '../lib/parser-pcd';
import { isTonhReport, parseTonhReport } from '../lib/parser-tonh';
import { isTonhTrackingWorkbook, parseTonhTrackingReport } from '../lib/parser-tonh-xlsx';
import type { PdfData, TabId, TabsAction, StatusMessage } from '../types';

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });

const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
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
            const dashboardSource = getHpDashboardSource(html);
            if (dashboardSource) {
              throw new Error(
                'Este arquivo é o Dashboard Unificado, que apenas incorpora relatórios do Grid e não contém os dados das vagas. '
                + `Exporte e envie o relatório "Vagas Individuais" (${dashboardSource}) para calcular os KPIs de HP Completion.`,
              );
            }
            if (!isHpHtmlReport(html)) throw new Error('Arquivo HTML não reconhecido como relatório HP do Grid.');
            const parsed = parseHpHtmlReport(html, file.name);
            dispatch({ type: 'ADD_PDF', tabId, pdf: parsed });
            added++;
            continue;
          }

          // WFH general CSV/XLSX and legacy Out SLA spreadsheets — structured cells, no PDF extraction
          if (/\.(?:csv|xlsx?)$/i.test(file.name)) {
            const buffer = await readFileAsArrayBuffer(file);
            const wb = XLSX.read(buffer, { type: 'array' });
            if (isWfhPositionsWorkbook(wb)) {
              if (tabId === 'pcd') {
                const parsed = parseWfhPcdReport(wb, file.name);
                dispatch({ type: 'ADD_PDF', tabId, pdf: parsed });
                added++;
                continue;
              }
              if (tabId === 'outsla') {
                const parsed = parseWfhOutSlaReport(wb, file.name);
                dispatch({ type: 'ADD_PDF', tabId, pdf: parsed });
                added++;
                continue;
              }
              if (tabId === 'tonh') {
                throw new Error(
                  'O relatório geral do WFH registra a pessoa que originou uma vaga de reposição, não o desligamento do novo contratado. '
                  + 'Ainda não é seguro calcular TO NH com este arquivo.',
                );
              }
              throw new Error('O relatório geral do WFH deve ser enviado nas abas PCD ou Out SLA.');
            }
            if (isTonhTrackingWorkbook(wb)) {
              if (tabId !== 'tonh') throw new Error('A planilha de Jornada do TA deve ser enviada na aba TO NH.');
              const parsed = parseTonhTrackingReport(wb, file.name);
              dispatch({ type: 'ADD_PDF', tabId, pdf: parsed });
              added++;
              continue;
            }
            if (!isOutSlaXlsxWorkbook(wb)) throw new Error('Planilha não reconhecida como relatório Out SLA.');
            if (tabId !== 'outsla') throw new Error('Esta planilha individual deve ser enviada na aba Out SLA.');
            const parsed = parseOutSlaXlsxReport(wb, file.name);
            dispatch({ type: 'ADD_PDF', tabId, pdf: parsed });
            added++;
            continue;
          }

          const extracted = await extractPdfText(file);
          let parsed: PdfData;
          if (isPcdReport(extracted.fullText)) {
            parsed = parsePcdReport(extracted.pageTexts, file.name);
          } else if (isOutSlaReport(extracted.fullText)) {
            parsed = parseOutSlaReport(extracted.positionalFullText, file.name);
          } else if (isHpReport(extracted.fullText)) {
            parsed = parseHpReport(extracted.positionalFullText, extracted.fullText);
          } else if (isHmReport(extracted.fullText)) {
            parsed = parseHmReport(extracted.positionalFullText, extracted.positionalPages);
          } else if (isTonhReport(extracted.fullText)) {
            if (tabId !== 'tonh') throw new Error('O PDF de Exit Discussion deve ser enviado na aba TO NH.');
            const confirmed = window.confirm(
              'Confirmação de período — TO NH\n\n'
              + 'O PDF de Exit Discussion não informa a data de saída. Confirme que TODOS os casos deste arquivo são desligamentos ocorridos em 2026.\n\n'
              + 'OK = incluir na análise de 2026\nCancelar = não carregar o arquivo',
            );
            if (!confirmed) {
              throw new Error('Arquivo não carregado: o período de saída de 2026 não foi confirmado.');
            }
            parsed = parseTonhReport(extracted.fullText, extracted.pageTexts, file.name, 2026);
          } else {
            parsed = parseQualtricsReport(extracted.fullText, extracted.pageTexts);
          }
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

