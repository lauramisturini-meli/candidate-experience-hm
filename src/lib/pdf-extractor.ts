import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
import type { ExtractedPdf } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

interface TextItem {
  str: string;
  transform: number[];
}

export async function extractPdfText(file: File): Promise<ExtractedPdf> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageTexts: string[] = [];
  const positionalPages: string[] = [];
  let fullText = '';
  let positionalFullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();

    const pageText = (tc.items as Array<{ str?: string }>)
      .map(it => it.str ?? '')
      .join('\n');
    pageTexts.push(pageText);
    fullText += '\n' + pageText;

    const items = (tc.items as TextItem[]).filter(it => it.str && it.transform);
    items.sort((a, b) => {
      const yDiff = b.transform[5] - a.transform[5];
      if (Math.abs(yDiff) > 3) return yDiff;
      return a.transform[4] - b.transform[4];
    });

    let posText = '';
    let lastY: number | null = null;
    for (const it of items) {
      const y = it.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 3) posText += '\n';
      else if (posText && !/\s$/.test(posText)) posText += ' ';
      posText += it.str;
      lastY = y;
    }
    positionalPages.push(posText);
    positionalFullText += '\n' + posText;
  }

  return { fullText, pageTexts, positionalFullText, positionalPages };
}
