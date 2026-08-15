# Plan: Enhanced Editable Preview and Section Reordering

Implement interactive editing features directly on the resume preview, including context-aware formatting and drag-and-drop section reordering.

## User Improvements
- **Interactive Formatting**: Select text in the preview to immediately see formatting options (Bold, Italic, Font +/-) via a floating toolbar.
- **Direct Editing**: Click any field in the preview to edit it inline, with changes reflecting in both preview and form.
- **Section Reordering**: Drag and drop entire sections (Experience, Education, etc.) to change their position in the layout.
- **Section Styling**: Dynamic controls for font size, style, and layout per section.

## Technical Details

### 1. Direct Preview Editing & Formatting
- **Floating Formatting Toolbar**: Create a new `FormattingToolbar` component that appears near the text selection using `window.getSelection()`.
- **Inline Editing**: Enhance the `Editable` component in `src/lib/resumeTemplates.tsx` to handle more complex types and ensure synchronization with the parent state.
- **Selection State**: Track `selectionRect` to position the toolbar.

### 2. Section Drag and Drop
- **`DragDropContext`**: Wrap the resume preview in `react-beautiful-dnd` (already installed).
- **Draggable Sections**: Map the `ResumeData` sections to a draggable list.
- **State Synchronization**: Update a new `sectionOrder` field in `ResumeData.settings` to persist the chosen layout.

### 3. State Management
- **Canonical Update**: Ensure all direct edits in the preview call the same `setResumeData` logic as the form inputs.
- **Style Persistence**: Capture custom styles applied via the toolbar into the `ResumeData.settings.sections` object.

## Impacted Files
- `src/lib/resumeTemplates.tsx`: Main changes to `Editable`, `BulletsEditor`, and individual template components to support DnD and direct editing.
- `src/pages/tools/ResumeBuilder.tsx`: Integration of DnD context and the new floating toolbar.
- `src/components/SectionStyleControls.tsx`: Slight updates to support granular font control overrides.
