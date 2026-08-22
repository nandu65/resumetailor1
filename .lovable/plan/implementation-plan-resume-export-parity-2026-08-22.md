# Implementation Plan - Resume Export Parity

Fix the root cause of the visual mismatch between the frontend Resume Builder/Preview and the exported PDF/DOCX by unifying the renderer.

## User Review Required

> [!IMPORTANT]
> The PDF export will now use direct DOM capture to ensure 100% visual parity with what you see in the builder. The DOCX export will remain a structured "Editable" document but will follow the template's layout logic (columns, order) much more closely than before.

## Proposed Changes

### 1. Unified Renderer Architecture
- Ensure `ResumePreview` (used in the builder) and the `downloadResumePdfFromData` function use the exact same React components and CSS.
- Identify that `Results.tsx` was using a separate "ghost render portal" which might have been using stale or incomplete data mapping.

### 2. Export Pipeline Fixes
#### `src/lib/resumeTemplates.tsx`
- Refactor `downloadResumePdfFromData` to ensure it captures the *currently visible* template DOM.
- Update `downloadResumeDocxFromData` to support multi-column layouts using Word tables, matching the selected template's structure (e.g., if "Modern" is selected, the DOCX will have a sidebar table).
- Ensure `html2canvas` captures the full content even if it spans multiple pages by temporarily removing height constraints during capture.

#### `src/pages/tools/ResumeBuilder.tsx`
- Ensure the `resumeData` object passed to export functions is always the absolute latest state from the form.
- Add a specific `data-rs-template` attribute to the preview root to help the exporter identify template-specific styles.

#### `src/pages/Results.tsx`
- Update `buildResumeDataFromOptimization` to include ALL fields (Projects, Education, etc.) that might have been lost in the mapping.
- Ensure the "Ghost Render Portal" is a perfect mirror of the `ResumeBuilder` preview.

## Technical Details
- **PDF Parity:** Use `html2canvas` with `scale: 2` and `useCORS: true`. Fix the `width: 794` constraint to ensure it doesn't clip content that might be wider in the preview.
- **DOCX Parity:** Implement a `TemplateDocxRenderer` map that returns different `docx` library configurations based on the `TemplateId`.
- **State Flow:** Centralize the `normalizeResumeSkills` call so that both preview and export see the same deduplicated skill groups.

## Verification Plan
1. **Manual Check:**
   - Open Resume Builder.
   - Select "Modern" template (two-column).
   - Export PDF. Verify it has two columns and emerald colors.
   - Export DOCX. Verify it contains all text in a structured layout.
2. **Automated Test:**
   - Run `npx playwright test src/test/e2e/exportIntegrity.test.ts` to verify sentinel values and visual structure markers.
