# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # TypeScript check + Vite production build
npm run typecheck  # Run tsc --noEmit without building
npm run test       # Run all tests with Vitest (watch mode)
npm run preview    # Preview production build
```

To run a single test file:
```bash
npx vitest run tests/parser-qualtrics.test.ts
```

## Environment

The app requires a `.env` file with Supabase credentials for the share/link feature:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON=...
```

Without these, the share feature is disabled but the rest of the app functions normally.

## Architecture

This is a React 18 + TypeScript + Vite SPA. It is a **client-side-only** PDF/HTML report parsing and analysis tool for the TA (Talent Acquisition) Transportes Brasil team. There is no backend beyond Supabase (used only for shareable links).

### Data Flow

The core data flow is: file upload → parser detection → PDF text extraction → parse to `PdfData` → `useTabs` reducer → `buildMergedView` → component rendering.

1. **Upload** (`src/hooks/useUpload.ts`): A hidden `<input type="file">` accepts PDFs and HTML files. It detects the report type using `is*Report()` probes in order: PCD → OutSLA → HP (PDF) → HM → TONH → HP HTML → Qualtrics (default). Each report type has its own parser in `src/lib/`.

2. **PDF extraction** (`src/lib/pdf-extractor.ts`): Uses `pdfjs-dist` to extract text in two representations: `fullText` (content-stream order, raw) and `positionalFullText` (sorted by Y/X coordinates to reconstruct reading order). Different parsers use different representations depending on which is more reliable for their PDF format.

3. **Parsers** (`src/lib/parser-*.ts`): Each parser exposes `is*Report(text)` (detection) and `parse*Report(...)` (parsing). All return a `PdfData` object. The `PdfData` type is a union-like struct — most fields are set to empty/null for parsers that don't use them (e.g. HP reports return `respostas: null`, `fav: '—'`, but populate `hpPayload`).

4. **State** (`src/hooks/useTabs.ts`): A single `useReducer` holds `TabsState`, a record keyed by `TabId`. Each tab holds an array of uploaded `PdfData` (multiple PDFs can be stacked per tab) and an optional `TabUiState` for user overrides.

5. **Merging** (`src/lib/merger.ts`): `buildMergedView(pdfs, tabId)` aggregates multiple PDFs in a tab into a single `MergedView`. It handles HP reports separately (uses `hpPayload`), selects the "primary" PDF (prefers `overallRange === 'ALL'`), deduplicates comments, and computes KPI values.

6. **Insights** (`src/lib/insights.ts`, `src/lib/insights-outsla.ts`, `src/lib/insights-tonh.ts`): Pure functions that scan comments via regex patterns (`Theme[]`) to generate `highs`, `lows`, and `actions` bullet points. Each tab type has its own theme sets and action maps.

7. **Share** (`src/lib/share.ts`, `src/hooks/useShare.ts`): Serializes `TabsState` to a Supabase `shares` table, generates a short ID, and appends `?s=<id>` to the URL. On load, if `?s=` is present, it hydrates state from Supabase via `HYDRATE` action.

### Tab Structure

Tabs are defined in `src/lib/constants.ts` with IDs: `external`, `internal`, `hm`, `tonh`, `pcd`, `hpc`, `outsla`.

`TabPanel` dispatches to a specific panel component based on `tabId` and the parsed data type:
- `pcd` + PCD data → `PcdPanel`
- `outsla` + OutSLA data → `OutSlaPanel`
- `tonh` + TONH data → `TonhPanel`
- `internal` + any data → `InternalPanel`
- everything else → `DataPanel`

`DataPanel` handles `external`, `hm`, and `hpc` (HP Completion) tabs. When `hpPayload` is present in the merged view, it renders an HP-specific layout (KPI grid, SLA cards, pipeline chart, quarter table); otherwise it renders the standard survey layout (favorabilidade/desfavorabilidade KPIs, dimension table, detractor callout).

### Parser Notes

- **Qualtrics** (`parser-qualtrics.ts`): Handles both external candidate (ES/PT Qualtrics template) and internal candidate (different question set). Detection: `isInternalSurveyFormat()` checks for ≥3 matching question patterns. Dimensions are in fixed order for external; internal dimensions are remapped by position in `merger.ts` to Portuguese names.

- **HM** (`parser-hm.ts`): Spanish-language Hiring Manager Experience report. Uses positional text. Extracts favorabilidade from percentages after keyword anchors; extracts comments from email-delimited blocks in the "Que aspectos positivos" section.

- **HP PDF** (`parser-hp.ts`): Hiring Plan PDF report. Uses `fullText` for KPI card values and `positionalText` for table row extraction. Spanish-language numeric format (e.g. `"1.799"` for 1799).

- **HP HTML** (`parser-hp-html.ts`): Weekly HP report exported as HTML from Grid. Detected by presence of `Relatorio Semanal.*Hiring Plan` and `const A=[`. Parses embedded JSON arrays (`A` = active vagas, `CL` = closed, `P` = pending, `SB` = standby) and computes SLA, pipeline, quarter, and insight data directly.

- **PCD** (`parser-pcd.ts`): Affirmative vacancies report. Two formats: "full table" (new, all vagas on page 1 with status) and "split" (old, vagas split across pages 1-4). HC demographic data (by seniority, BU, disability type) parsed from pages 2-5.

- **OutSLA** (`parser-outsla.ts`): Uses positional text and a single large regex (`ROW_RE`) to match structured table rows. Normalizes exit reasons via `normalizeReason()`.

- **TONH** (`parser-tonh.ts`): Turn Over New Hire exit discussion PDFs. Each page (or sub-section) is one person's exit case. Fields extracted via `extractAfter()`/`extractBlock()` with anchor patterns. Some PDF pages contain two cases side-by-side, handled by `splitCaseSections()`.

### Key Type: `PdfData`

`PdfData` is the universal output of all parsers. The following flags indicate which parser produced it:
- `isHm: true` → HM parser
- `isHp: true` → HP PDF or HTML parser (check `hpPayload` for the full data)
- `isOutSla: true` → OutSLA parser
- `isTonhExit: true` → TONH parser
- PCD is detected by presence of `pcdVagas`
- Qualtrics (default) has none of these flags set

### CSS Modules

All styles use CSS Modules (`.module.css`), imported as `import s from './Component.module.css'` with class references like `s.className`.

### Tests

Tests live in `tests/` and use Vitest with fixture strings. The parsers are tested with inline text fixtures simulating extracted PDF content, not actual PDF files.
