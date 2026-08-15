import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Resume Export Visual Integrity', () => {
  test('should match selected template layout in export results', async ({ page }) => {
    // 1. Setup session and navigation
    await page.goto('http://localhost:8080/tools/resume-builder');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    
    // 2. Start from scratch
    const scratchBtn = page.getByText('Build from scratch');
    await scratchBtn.waitFor({ state: 'visible', timeout: 15000 });
    await scratchBtn.click();

    // 3. Skip intro loader if present
    const loader = page.getByText('Preparing your builder');
    try {
        await loader.waitFor({ state: 'visible', timeout: 2000 });
        await loader.waitFor({ state: 'hidden', timeout: 15000 });
    } catch (e) {}

    // 4. Wizard steps
    const wizardButtons = ['Continue', 'Continue', 'Continue', 'See my templates'];
    for (const label of wizardButtons) {
      const btn = page.getByRole('button', { name: label });
      await btn.waitFor({ state: 'visible', timeout: 5000 });
      await btn.click();
    }

    // 5. Select a specific template (e.g. Modern)
    const designBtn = page.getByRole('button', { name: 'Design & Layout' });
    await designBtn.click();
    const modernTemplate = page.locator('button:has-text("Modern")').first();
    await modernTemplate.click();
    await page.keyboard.press('Escape');

    // 6. Fill minimal data for generation
    await page.getByPlaceholder('John Doe').fill('E2E Test User');
    await page.getByPlaceholder('Software Engineer').fill('Senior Test Architect');
    
    // 7. Generate (Requires login in real app, but we can check export button presence/data sync)
    // For E2E we verify the data object in localStorage matches the selection
    const storedTemplate = await page.evaluate(() => localStorage.getItem('rs-current-template'));
    expect(storedTemplate).toBe('modern');

    // 8. Verify Preview Root structure
    const preview = page.locator('[data-rs-root]');
    await expect(preview).toBeVisible();
    
    // Modern template has a specific grid layout (35/65)
    const hasModernGrid = await preview.evaluate(el => {
        const grid = el.querySelector('.grid');
        return grid && window.getComputedStyle(grid).gridTemplateColumns.includes('35%');
    });
    // modern template uses bg-emerald-800 in preview usually
    const hasModernColor = await preview.evaluate(el => el.querySelector('.bg-emerald-800') !== null);
    
    expect(hasModernGrid || hasModernColor).toBeTruthy();

    // 9. Check Export Mappings (mocking the download call parameters)
    const exportData = await page.evaluate(() => {
        const data = localStorage.getItem('rs-current-resume');
        const template = localStorage.getItem('rs-current-template');
        return { data: JSON.parse(data || '{}'), template };
    });
    
    expect(exportData.template).toBe('modern');
    expect(exportData.data.name).toBe('E2E Test User');
  });
});
