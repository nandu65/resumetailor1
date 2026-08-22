import { test, expect } from '@playwright/test';

test.describe('Resume Builder Audit', () => {
  const sentinel = {
    name: "Arjun Sharma",
    title: "Senior Product Designer",
    summary: "SUMMARY_SENTINEL",
    company: "Razorpay_SENTINEL",
    bullet: "EXPERIENCE_BULLET_SENTINEL",
    school: "NID_SENTINEL",
    project: "PROJECT_SENTINEL"
  };

  test('canonical state and visual match', async ({ page }) => {
    await page.goto('http://localhost:8080/tools/resume-builder');
    
    // Start fresh
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const scratchBtn = page.getByText('Build from scratch');
    await scratchBtn.waitFor({ state: 'visible', timeout: 15000 });
    await scratchBtn.click();

    // Wizard
    const wizardButtons = ['Continue', 'Continue', 'Continue', 'See my templates'];
    for (const label of wizardButtons) {
      await page.getByRole('button', { name: label }).click();
    }

    // Input
    await page.fill('input[name="resume-name"]', sentinel.name);
    await page.fill('input[name="resume-title"]', sentinel.title);
    await page.fill('textarea[name="resume-summary"]', sentinel.summary);
    
    // Add Exp
    await page.getByRole('button', { name: 'ADD ROLE' }).click();
    await page.fill('input[placeholder="Company"]', sentinel.company);
    await page.fill('textarea[placeholder*="Bullet points"]', sentinel.bullet);

    // Verify Preview
    const preview = page.locator('[data-rs-root]');
    await expect(preview).toContainText(sentinel.name);
    await expect(preview).toContainText(sentinel.summary);
    await expect(preview).toContainText(sentinel.company);
    await expect(preview).toContainText(sentinel.bullet);

    // Persistence
    await page.reload();
    await expect(preview).toContainText(sentinel.name, { timeout: 10000 });
    
    // Export Trigger
    await page.getByRole('button', { name: 'Export' }).click();
    const pdfBtn = page.getByText('PDF Document');
    await expect(pdfBtn).toBeVisible();
  });
});
