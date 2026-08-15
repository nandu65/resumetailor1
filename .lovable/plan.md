# Plan: End-to-End Integrity Verification for Resume Builder

This plan establishes a quick end-to-end check to verify that resume templates render correctly in the Resume Builder, both on refresh and after new uploads/wizard completion.

## User Review Required

> [!NOTE]
> I am adding a hidden automated check that runs in the background using Playwright to ensure the builder remains stable as you make changes.

## Technical Details

### 1. Unified State & Persistence
- Verify the  canonical state is correctly stored in  or  (if implemented) or correctly hydrated from the .
- Ensure  correctly handles the transition from  ->  ->  ->  to prevent rendering dead-ends.

### 2. Automated Regression Test
- Create a Playwright-based test script in .
- This script will:
    - Navigate to the builder.
    - Complete the onboarding wizard.
    - Verify that the resume preview () is visible.
    - Refresh the page and verify the preview persists.
    - Open the "Design & Layout" panel and switch templates, verifying visual updates.

### 3. CI/CD Integration
- Configure  to run these tests locally or in a CI environment.
- Add a script to  to easily run E2E checks: `bun run test:e2e`.

### 4. Implementation Steps
- [x] Fix  transition logic (done: corrected  callback).
- [ ] Install  dependency.
- [ ] Implement the E2E test file.
- [ ] Run and verify the tests pass.

## Success Criteria
- The automated check passes consistently.
- No "Resume preview NOT found" errors during manual or automated testing.
- Templates render instantly after the wizard finishes.
