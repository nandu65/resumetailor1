import { test, expect } from '@playwright/test';

test.describe('Resume Builder Audit Tests', () => {
  const sentinel = {
    name: "Arjun Sharma",
    title: "Senior Product Designer",
    email: "arjun@example.com",
    phone: "+91 9000000000",
    location: "Bengaluru",
    summary: "SUMMARY_SENTINEL — Senior Product Designer with six years of fintech product experience.",
    company: "Razorpay_SENTINEL",
    role: "Product Designer_SENTINEL",
    location_exp: "Bengaluru_SENTINEL",
    dates: "2021_SENTINEL – Present_SENTINEL",
    bullet: "EXPERIENCE_BULLET_SENTINEL — Improved merchant activation by 18%.",
    school: "NID_SENTINEL",
    degree: "B.Des Product Design_SENTINEL",
    edu_details: "EDUCATION_DETAILS_SENTINEL",
    project: "PROJECT_SENTINEL",
    tech: "Figma_SENTINEL, Prototyping_SENTINEL",
    p_bullet1: "PROJECT_BULLET_SENTINEL",
    p_bullet2: "PROJECT_BULLET_TWO_SENTINEL",
    skills: "SKILLS_SENTINEL — Product Design, Figma, UX Research, Design Systems",
    cert: "CERT_SENTINEL — Google UX Design Certificate"
  };

  test('canonical state integrity and visual match', async ({ page }) => {
    await page.goto('http://localhost:8080/tools/resume-builder');
    
    // 1. Choose Scratch
    const scratchBtn = page.getByText('Build from scratch');
    await scratchBtn.waitFor({ state: 'visible', timeout: 15000 });
    await scratchBtn.click();

    // 2. Complete Wizard with specific settings
    // Preferences: Modern (Index 0), Emerald (Index 0), Two Columns
    // The wizard components might be simple buttons or radio groups
    const wizardButtons = ['Continue', 'Continue', 'Continue', 'See my templates'];
    for (const label of wizardButtons) {
      await page.getByRole('button', { name: label }).click();
    }

    // 3. Verify intro loader is gone
    await expect(page.getByText('Preparing your builder')).not.toBeVisible({ timeout: 20000 });

    // 4. Input Sentinel Values
    // We'll use the form fields. Based on ResumeBuilder.tsx, these are Inputs/Textareas.
    // Note: Some might be inside the preview if inline editing is used, but for this test
    // we use the form to ensure state updates preview.
    
    await page.fill('input[placeholder*="Name"]', sentinel.name);
    await page.fill('input[placeholder*="Role"]', sentinel.title);
    await page.fill('input[placeholder*="Email"]', sentinel.email);
    await page.fill('textarea[placeholder*="Professional summary"]', sentinel.summary);
    
    // Add Experience
    await page.getByRole('button', { name: 'Add Experience' }).click();
    await page.fill('input[placeholder="Company"]', sentinel.company);
    await page.fill('input[placeholder="Role"]', sentinel.role);
    await page.fill('textarea[placeholder*="Bullet points"]', sentinel.bullet);

    // Add Education
    await page.getByRole('button', { name: 'Add Education' }).click();
    await page.fill('input[placeholder="School"]', sentinel.school);
    await page.fill('input[placeholder="Degree"]', sentinel.degree);
    
    // 5. Verify Preview matches
    const preview = page.locator('[data-rs-root]');
    await expect(preview).toContainText(sentinel.name);
    await expect(preview).toContainText(sentinel.summary);
    await expect(preview).toContainText(sentinel.company);
    await expect(preview).toContainText(sentinel.bullet);

    // 6. Test persistence
    await page.reload();
    await expect(preview).toContainText(sentinel.name, { timeout: 10000 });
    
    // 7. Test Export parity (Check if PDF contains sentinels)
    // We can't easily read PDF content in standard Playwright, 
    // but we can trigger the download and verify no errors.
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download' }).click();
    await page.getByText('PDF (Match Preview)').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('wizard completion does not reset to start', async ({ page }) => {
    await page.goto('http://localhost:8080/tools/resume-builder');
    await page.getByText('Build from scratch').click();
    
    const wizardButtons = ['Continue', 'Continue', 'Continue', 'See my templates'];
    for (const label of wizardButtons) {
      await page.getByRole('button', { name: label }).click();
    }

    await expect(page.getByText('Build from scratch')).not.toBeVisible();
    await expect(page.locator('[data-rs-root]')).toBeVisible();
  });
});
