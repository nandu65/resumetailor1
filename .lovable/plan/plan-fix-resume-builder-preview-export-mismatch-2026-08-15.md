# Plan: Fix Resume Builder Preview/Export Mismatch

Establish a canonical source of truth for resume data, resolve state hydration issues, and ensure visual consistency between the web preview and downloaded files (PDF/DOCX).

## User Review Required

> [!IMPORTANT]
> The "Compact" template currently truncates project bullets and "Minimal" omits certain sections in the preview. I will modify these templates to show all content in both preview and export to ensure consistency, as requested.

## Proposed Changes

### 1. Unified State Management
- Refactor `ResumeBuilder.tsx` to use a single `canonicalResume` state object instead of multiple local state variables (`basics`, `experience`, etc.).
- Remove the `syncSettingsToResume` effect and the stale hydration effect that copies `resume` back into local states.
- All form inputs, wizard actions, and AI generation results will update this one `canonicalResume` object directly.

### 2. Reliable Export Pipeline
- Update `downloadPdf` and `downloadDocx` to always use the current `canonicalResume` object.
- Remove the logic that merges stale `resume` objects with new settings.
- Implement a `resolveResumeData` helper to ensure the data passed to the exporters is fully populated and formatted.

### 3. Preview/Export Consistency
- Update the PDF/DOCX generation logic in `resumeTemplates.tsx` to use the same layout principles as the web preview components.
- Ensure all sections (Projects, Certifications, etc.) are rendered in all templates unless explicitly configured otherwise by the user.
- Remove silent truncation of bullets in "Compact" and "Photo Grid" templates.
- Sync typography settings (font family, size, per-section styles) between the browser renderer and the file exporters.

### 4. Regression Testing
- Add `src/test/resumeBuilder.test.tsx` using Vitest and React Testing Library to verify that:
    - Data entered in the form survives template/theme changes.
    - The preview contains the entered data.
    - The object passed to exporters contains all fields.
    - Exporters preserve multi-page content and correct labeling.

## Technical Details

- **File Modifications**:
    - `src/pages/tools/ResumeBuilder.tsx`: Major refactor of state logic.
    - `src/lib/resumeTemplates.tsx`: Sync export rendering with component rendering.
    - `src/components/SectionStyleControls.tsx`: Ensure it updates the canonical state.
- **State Pattern**:
    - Use a single `useState<ResumeData>` for the entire resume.
    - Use deep merges for updates to avoid losing data in nested arrays (experience/education).
- **Export Consistency**:
    - The current `downloadResumePdfFromData` uses a generic layout. I will update it to branch based on the selected `TemplateId` to match the `ModernPreview`, `ClassicPreview`, etc., as closely as possible using `jsPDF` and `docx` primitives.
