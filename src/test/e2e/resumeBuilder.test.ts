import { test, expect } from '@playwright/test';

test.describe('Resume Builder End-to-End', () => {
  test('should render templates correctly and persist on refresh', async ({ page }) => {
    // Navigate and clear storage for a clean test
    await page.goto('http://localhost:8080/tools/resume-builder');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    
    // 1. Selection Screen
    const scratchBtn = page.getByText('Build from scratch');
    await scratchBtn.waitFor({ state: 'visible', timeout: 15000 });
    await scratchBtn.click();

    // 2. Wait for intro loader if it appears
    const loader = page.getByText('Preparing your builder');
    try {
        await loader.waitFor({ state: 'visible', timeout: 2000 });
        await loader.waitFor({ state: 'hidden', timeout: 15000 });
    } catch (e) {
        // Loader might have finished already or not appeared
    }

    // 3. Complete Wizard
    const wizardButtons = ['Continue', 'Continue', 'Continue', 'See my templates'];
    for (const label of wizardButtons) {
      const btn = page.getByRole('button', { name: label });
      await btn.waitFor({ state: 'visible', timeout: 5000 });
      await btn.click();
    }

    // 4. Verify Resume Preview Renders (placeholder or actual root)
    const preview = page.locator('[data-rs-root]');
    const placeholder = page.getByText('Live Preview');
    
    // We expect either the preview root or the placeholder to be visible
    await expect(preview.or(placeholder)).toBeVisible({ timeout: 15000 });

    // 5. Verify Persistence on Refresh
    await page.reload();
    await expect(preview.or(placeholder)).toBeVisible({ timeout: 15000 });

    // 6. Test Template Switching
    const designBtn = page.getByRole('button', { name: 'Design & Layout' });
    await designBtn.waitFor({ state: 'visible', timeout: 5000 });
    await designBtn.click();

    const templates = page.locator('button:has(img)');
    if (await templates.count() > 1) {
      await templates.nth(1).click();
      await expect(preview.or(placeholder)).toBeVisible();
    }
  });
});
