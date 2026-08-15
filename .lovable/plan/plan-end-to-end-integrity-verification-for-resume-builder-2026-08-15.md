# Plan: End-to-End Integrity Verification for Resume Builder

This plan establishes a quick end-to-end check to verify that resume templates render correctly in the Resume Builder, both on refresh and after new uploads/wizard completion.

## User Review Required

> [!NOTE]
> I am adding an automated check that runs in the background to ensure the builder remains stable as you make changes.

## Technical Details

### 1. Unified State & Persistence
- Ensure `ResumeBuilder.tsx` correctly handles the transition from intro -> choice -> wizard -> editor to prevent rendering dead-ends.
- Verify hydration logic so that a refresh doesn't drop the user back to the starting screen if they have progress.

### 2. Automated Regression Test
- Create a Playwright-based test script in `src/test/e2e/resumeBuilder.test.ts`.
- This script will:
    - Navigate to the builder.
    - Complete the onboarding wizard.
    - Verify that the resume preview (`[data-rs-root]`) is visible.
    - Refresh the page and verify the preview persists.
    - Open the "Design & Layout" panel and switch templates, verifying visual updates.

### 3. Implementation Steps
- Correct `ResumeBuilder.tsx` transition logic.
- Install `@playwright/test` dependency.
- Implement the E2E test file and configuration.
- Run and verify the tests pass.

## Success Criteria
- The automated check passes consistently.
- No "Resume preview NOT found" errors during testing.
- Templates render correctly immediately after the wizard finishes.
