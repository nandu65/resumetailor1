# Plan: Forensic Audit and Architectural Fix for Resume Export Pipeline

Perform a root-cause fix for the mismatch between the resume preview and the exported PDF/DOCX files by unifying the rendering pipeline.

## 1. Trace and Audit (Verification of Analysis)
- Confirm that `ResumeBuilder.tsx` and `Results.tsx` use the `ResumeData` structure.
- Validate that `downloadResumePdfFromData` in `src/lib/resumeTemplates.tsx` is an imperative re-implementation of the preview templates.
- Identify missing style mappings (fontFamily, letterSpacing, section-specific margins) in the current export engine.

## 2. Architectural Fix: Canonical Rendering
- **Phase A: PDF Fidelity (DOM Capture)**
  - Update `downloadResumePdfFromData` to use `html2canvas` for PDF generation.
  - This ensures that whatever the user sees in the preview (Tailwind styles, rich text, drag-and-drop order, custom fonts) is exactly what is captured in the PDF.
  - Fix A4 scaling to match 210mm x 297mm exactly.
- **Phase B: DOCX Data Sync**
  - Update `downloadResumeDocxFromData` to strictly follow `data.settings.sectionOrder`.
  - Ensure `RichSegment` attributes (bold, italic, underline, font) are correctly mapped to `TextRun` properties in the DOCX generator.
- **Phase C: Unified Style Injection**
  - Move typography and layout constants into a shared configuration object used by both the React templates and the DOCX generator.

## 3. Implementation Steps
- **`src/lib/resumeTemplates.tsx`**: 
    - Replace `jsPDF` imperative drawing with `html2canvas` capture for `downloadResumePdfFromData`.
    - Refactor `downloadResumeDocxFromData` to handle all `ResumeData` fields and settings.
- **`src/pages/tools/ResumeBuilder.tsx`**:
    - Ensure the "hidden" export DOM matches the preview DOM exactly.
- **`src/lib/pdfExport.ts`**:
    - Mark legacy `downloadResumePdf` as deprecated or refactor it to use the new canonical engine if it's still needed for tailored results.

## 4. Verification
- Run Playwright E2E tests in `src/test/e2e/exportIntegrity.test.ts` (updated to actually compare visual output or structural parity).
- Manual verification of "Harsha Naidu" resume with multi-page entries, rich formatting, and reordered sections.

## Technical Details
- **Tech Stack:** `html2canvas`, `jsPDF`, `docx`.
- **Dimensions:** Standard A4 (595.28pt x 841.89pt).
- **Style Mapping:** HTML tags (`<b>`, `<i>`) -> `parseRichSegments` -> Canvas rendering / DOCX TextRuns.
