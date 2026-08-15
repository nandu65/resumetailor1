---
title: Autosave Drafts Implementation Plan
---

# Autosave Drafts Implementation Plan

Implement a robust autosave mechanism for the Resume Builder that persists user edits and settings across refreshes and sessions by leveraging both LocalStorage and Supabase.

## User Review Required

> [!IMPORTANT]
> A new database table `resume_drafts` has already been provisioned to store your data securely.

- The app will now automatically save your progress every 2 seconds after you stop typing.
- When you sign in, any local unsaved changes will be synchronized to your account.
- You will see a "Cloud Sync" indicator in the editor toolbar confirming your data is safe.

## Technical Details

### 1. Database Schema
- Already executed: `public.resume_drafts` table with `user_id`, `resume_data` (JSONB), and `template_id`.
- RLS policies ensure users can only access their own drafts.

### 2. Frontend Logic (`ResumeBuilder.tsx`)
- **Initial Load**:
    1. Check `localStorage` for quick recovery.
    2. If authenticated, fetch the latest draft from Supabase.
    3. Merge logic: If `localStorage` data is newer than the database (based on a local timestamp), prefer local data and trigger a sync.
- **Autosave Engine**:
    - Use a debounced effect (2 seconds) to sync state changes.
    - If authenticated: Update Supabase.
    - Always: Update `localStorage`.
- **UI Feedback**:
    - Add a `saveStatus` state: `idle`, `saving`, `saved`, `error`.
    - Display a subtle icon indicator in the sticky toolbar.

### 3. Edge Cases
- **Offline Mode**: Continue saving to `localStorage`; queue sync for when connection returns.
- **Multiple Tabs**: LocalStorage events will keep tabs in sync, though database sync might conflict (last-write-wins approach for simplicity).

## Verification Plan

### Automated Tests
- New Vitest file `src/test/autosave.test.ts` to verify state merging and debouncing logic.

### Manual Verification
1. Open Builder, edit name.
2. Verify "Saving..." indicator appears.
3. Refresh page -> Data should persist.
4. Sign in -> Data should sync to cloud.
5. Sign in on another device/browser -> Data should load from cloud.
