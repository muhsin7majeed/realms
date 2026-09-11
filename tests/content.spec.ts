import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import profile from '../src/data/profile.json' with { type: 'json' };
import type { ThemeCopy } from '../src/data/theme-copy';

const readCopy = (world: string): ThemeCopy =>
  JSON.parse(
    readFileSync(
      new URL(`../src/themes/${world}/copy.json`, import.meta.url),
      'utf8',
    ),
  );

test('worlds have distinct voices while preserving identity and contact', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.folio-lede')).toHaveText(
    'Interfaces forged with care. Old code put to rights. Work that holds when the easy fixes fail.',
  );
  await expect(
    page
      .locator('[data-scene="medieval"]')
      .getByRole('link', { name: /send word.*get in touch/i }),
  ).toHaveAttribute('href', `mailto:${profile.email}`);
  const medievalDescription = await page
    .locator('.folio-project > p')
    .first()
    .textContent();
  await page
    .locator('[data-scene="medieval"] [data-theme-choice="cyberpunk"]')
    .click();
  await expect(page.locator('.signal-lede')).toHaveText(
    'I build the interface, wire the systems, and keep the signal clean. React, TypeScript, and no black boxes.',
  );
  await expect(
    page
      .locator('[data-scene="cyberpunk"]')
      .getByRole('link', { name: /open a channel.*get in touch/i }),
  ).toHaveAttribute('href', `mailto:${profile.email}`);
  expect(
    await page.locator('.signal-project-body > p').first().textContent(),
  ).not.toBe(medievalDescription);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    profile.name,
  );
  for (const job of profile.experience)
    await expect(
      page.getByRole('heading', { name: job.company, exact: true }),
    ).toBeVisible();
});

for (const world of ['medieval', 'cyberpunk']) {
  test(`${world}: rendered narratives and UI labels come from its copy file`, async ({
    page,
  }) => {
    const copy = readCopy(world);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page
      .locator(`[data-scene]:visible [data-theme-choice="${world}"]`)
      .click();
    const scene = page.locator(`[data-scene="${world}"]`);
    await expect(scene).toHaveAttribute('aria-label', copy.world.title);
    await expect(
      scene.getByText(copy.hero.intro, { exact: true }),
    ).toBeVisible();
    await expect(
      scene.getByText(copy.about.body, { exact: true }),
    ).toBeVisible();
    for (const job of profile.experience)
      await expect(
        scene.getByText(copy.experience[job.id].summary, { exact: true }),
      ).toBeVisible();
    for (const project of profile.projects)
      await expect(
        scene.getByText(copy.projects[project.id].description, { exact: true }),
      ).toBeVisible();
    for (const capability of profile.capabilities)
      await expect(
        scene.getByText(copy.capabilities[capability.id], { exact: false }),
      ).toBeVisible();
    await expect(scene.locator('.world-picker legend')).toHaveText(
      copy.controls.legend,
    );
    const motion = scene.locator('[data-motion-toggle]');
    await expect(motion.locator('.motion-label')).toHaveText(
      copy.controls.motion.paused,
    );
    await expect(motion).toHaveAccessibleName(
      `${copy.controls.motion.paused} — Ambient motion disabled by reduced-motion preference`,
    );
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(motion.locator('.motion-label')).toHaveText(
      copy.controls.motion.running,
    );
    await motion.click();
    await expect(motion.locator('.motion-label')).toHaveText(
      copy.controls.motion.paused,
    );
    await page.reload();
    await expect(motion.locator('.motion-label')).toHaveText(
      copy.controls.motion.paused,
    );
    await expect(
      scene.getByText(copy.hero.intro, { exact: true }),
    ).toBeVisible();
  });
  test(`${world}: copy covers every factual record with its own narrative`, () => {
    const copy = readCopy(world);
    expect(Object.keys(copy.projects).sort()).toEqual(
      profile.projects.map((project) => project.id).sort(),
    );
    expect(Object.keys(copy.experience).sort()).toEqual(
      profile.experience.map((job) => job.id).sort(),
    );
    expect(Object.keys(copy.capabilities).sort()).toEqual(
      profile.capabilities.map((capability) => capability.id).sort(),
    );
    expect(copy.actions.resume.toLowerCase()).toContain('résumé');
    for (const project of profile.projects) {
      expect(copy.projects[project.id].description.trim()).not.toBe('');
      expect(copy.projects[project.id].category.trim()).not.toBe('');
    }
    for (const job of profile.experience)
      expect(copy.experience[job.id].summary.trim()).not.toBe('');
  });
}

test('transition copy follows the destination while metadata remains neutral', async ({
  page,
}) => {
  await page.goto('/');
  for (const world of ['cyberpunk', 'medieval']) {
    const copy = readCopy(world);
    await page
      .locator(`[data-scene]:visible [data-theme-choice="${world}"]`)
      .click();
    await expect(page.locator('[data-world-label]')).toHaveText(
      copy.world.title,
    );
    await expect(page.locator('[data-world-caption]')).toHaveText(
      copy.world.transition,
    );
    await expect(page.locator('html')).toHaveAttribute('data-theme', world);
    await expect(page.locator('.world-transition')).not.toBeVisible();
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      `${profile.role} from ${profile.location}. ${profile.metadataDescription}`,
    );
    await expect(
      page.locator('meta[property="og:description"]'),
    ).toHaveAttribute('content', profile.metadataDescription);
  }
});

test('project and experience voices do not silently reuse the other world', () => {
  const medieval = readCopy('medieval');
  const cyberpunk = readCopy('cyberpunk');
  expect(medieval.hero.intro).not.toBe(cyberpunk.hero.intro);
  expect(medieval.about.body).not.toBe(cyberpunk.about.body);
  for (const project of profile.projects)
    expect(medieval.projects[project.id].description).not.toBe(
      cyberpunk.projects[project.id].description,
    );
  for (const job of profile.experience)
    expect(medieval.experience[job.id].summary).not.toBe(
      cyberpunk.experience[job.id].summary,
    );
});
