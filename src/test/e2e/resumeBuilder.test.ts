import { test, expect } from '@playwright/test';

test.describe('Resume Builder End-to-End', () => {
  test('should render templates correctly and persist on refresh', async ({ page }) => {
    await page.goto('http://localhost:8080/tools/resume-builder');
    
    // 1. Selection Screen
    const scratchBtn = page.getByText('Build from scratch');
    await expect(scratchBtn).toBeVisible({ timeout: 10000 });
    await scratchBtn.click();

    // 2. Complete Wizard
    const wizardButtons = ['Continue', 'Continue', 'Continue', 'See my templates'];
    for (const label of wizardButtons) {
      const btn = page.getByRole('button', { name: label });
      await expect(btn).toBeVisible();
      await btn.click();
    }

    // 3. Verify Resume Preview Renders
    const preview = page.locator('[data-rs-root]');
    await expect(preview).toBeVisible({ timeout: 10000 });

    // 4. Verify Persistence on Refresh
    await page.reload();
    await expect(preview).toBeVisible({ timeout: 10000 });

    // 5. Test Template Switching
    const designBtn = page.getByRole('button', { name: 'Design & Layout' });
    await expect(designBtn).toBeVisible();
    await designBtn.click();

    const templates = page.locator('button:has(img)');
    if (await templates.count() > 1) {
      await templates.nth(1).click();
      // Ensure preview still exists after switch
      await expect(preview).toBeVisible();
    }
  });
});
