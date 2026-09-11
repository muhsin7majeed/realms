import { expect, test } from '@playwright/test';
import profile from '../src/data/profile.json' with { type: 'json' };

test('static portfolio exposes identity, proof, experience and contact without JavaScript', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL!);
  const scene = page.locator('[data-scene="medieval"]');
  await expect(scene.getByRole('heading', { level: 1 })).toContainText(
    profile.name,
  );
  await expect(scene.getByText(profile.role, { exact: true })).toBeVisible();
  for (const job of profile.experience)
    await expect(scene.getByText(job.company, { exact: true })).toBeVisible();
  for (const project of profile.projects)
    await expect(
      scene
        .getByRole('link', {
          name: new RegExp(project.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        })
        .first(),
    ).toBeVisible();
  await expect(
    scene.getByRole('link', { name: /résumé/i }).first(),
  ).toHaveAttribute('href', /resume\.pdf$/);
  await expect(
    scene.getByRole('link', { name: /get in touch/i }),
  ).toHaveAttribute('href', `mailto:${profile.email}`);
  await expect(page.locator('[data-scene="cyberpunk"]')).not.toBeVisible();
  await expect(page.locator('[data-scene="metro"]')).not.toBeVisible();
  await expect(scene.locator('.world-controls')).not.toBeVisible();
  await context.close();
});
