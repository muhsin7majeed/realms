import { expect, test } from '@playwright/test';

test('Metro motion control retains its visible icon and touch target on compact layouts', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page
    .locator('[data-scene]:visible [data-theme-choice="metro"]')
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'metro');
  for (const width of [360, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    const control = page.locator('[data-scene="metro"] [data-motion-toggle]');
    await expect(control.locator('span').first()).toBeVisible();
    const bounds = await control.boundingBox();
    expect(bounds!.width).toBeGreaterThanOrEqual(36);
    expect(bounds!.height).toBeGreaterThanOrEqual(36);
  }
});
