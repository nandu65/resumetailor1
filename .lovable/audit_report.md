### Forensic Audit Report: Resume Preview vs. Export Mismatch

#### ROOT CAUSE
The **Export** system in `Results.tsx` was using a localized data transformation function `buildResumeDataFromOptimization` which was severely stripped down. It lacked critical sections (Education, Projects, Certifications) and, most importantly, **ignored the user's selected Template ID**, defaulting to "modern" regardless of what was chosen or visible in the UI. 

Furthermore, `downloadResumePdfFromData` relies on `document.querySelector('[data-rs-root]')`. In the `Results.tsx` page, the preview component was not being rendered, causing the PDF generator to fail to find the DOM element needed for `html2canvas` capture, or falling back to a different active preview if one existed in another tab/hidden state.

#### PREVIEW RENDERER
- **File:** `src/lib/resumeTemplates.tsx`
- **Component:** `ResumePreview` (which dynamically switches between `ModernPreview`, `CreativePreview`, `ExecutivePreview`, etc., based on the `template` prop).

#### EXPORT RENDERER
- **File:** `src/lib/resumeTemplates.tsx`
- **Function:** `downloadResumePdfFromData`
- **Mechanism:** DOM Capture via `html2canvas` of the `[data-rs-root]` element.

#### DATA DIVERGENCE
**YES.** `Results.tsx` was creating a "dummy" `ResumeData` object that only contained `summary`, `experience` (mapped from AI bullets), and `skills`. It explicitly excluded `education`, `projects`, and `links`. It also hardcoded `sectionOrder`.

#### FIX
1.  **Unified Data Mapping:** Updated `buildResumeDataFromOptimization` in `Results.tsx` to include all resume fields (Education, Projects, Links, Certifications) by extracting them from the original `resume_text` stored in the optimization record.
2.  **Canonical Template Propagation:** Ensured the `rewrite_level` (which stores the template preference) is correctly passed to the export functions instead of being ignored.
3.  **Invisible Rendering for Export:** Implemented a hidden `ResumePreview` in `Results.tsx` that only mounts during the export process. This ensures `html2canvas` has a valid, correctly-styled DOM element to capture that matches the data exactly, even if the user hasn't toggled a visible preview.
4.  **A4 Persistence:** Guaranteed that the captured DOM reflects the A4 layout used in the builder.

#### FILES CHANGED
- `src/pages/Results.tsx`
- `src/lib/resumeTemplates.tsx`
- `src/lib/pdfExport.ts`

#### VERIFICATION
The export process now triggers a "ghost" render of the canonical `ResumePreview` component using the same data and template ID as the visual preview. `html2canvas` captures this render, ensuring the purple gradient headers, two-column layouts, and individual skill chips are preserved exactly as seen in the UI.
