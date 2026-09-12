import { expect, test } from '@playwright/test';
import profile from '../src/data/profile.json' with { type: 'json' };

// Literal wording from main at 4bc9a43, independent of the editable profile.
const original = {
  intro:
    'I build thoughtful interfaces, dependable products, and the occasional little experiment.',
  about:
    'From owning long-lived React applications to building independent products from scratch. I care about how things work, how they feel, and the details in between.',
  capabilities: [
    'Product interfaces',
    'Frontend architecture',
    'Creative development',
  ],
  experience: [
    'Building and modernizing product frontends. React, TypeScript, testing, and mentoring.',
    'Web and mobile interfaces, built from the ground up. React, Angular, and Ionic.',
  ],
  projects: [
    'Your films. Your shows. Your data. A privacy-first movie and TV tracker, built end to end.',
    'A little chaos, a lot of pixels. An arcade shooter exploring the playful side of the web.',
    'A webcam, reimagined in characters.',
    'Find your genre. No noise attached.',
  ],
};
const worlds = {
  medieval: {
    title: 'The cartographer’s folio',
    legend: 'Turn the page',
    resume: 'The résumé',
    transition: 'ENTERING ANOTHER WORLD',
  },
  cyberpunk: {
    title: 'The independent signal',
    legend: 'Switch frequency',
    resume: 'Access résumé',
    transition: 'ENTERING ANOTHER WORLD',
  },
  metro: {
    title: 'The Last Workshop',
    legend: 'Choose a world',
    resume: 'The résumé',
    transition: 'Through the bulkhead. Back to the work.',
  },
};

for (const [world, labels] of Object.entries(worlds)) {
  test(`${world}: renders main's original shared personal copy and plain controls`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('./');
    await page
      .locator(`[data-scene]:visible [data-theme-choice="${world}"]`)
      .click();
    const scene = page.locator(`[data-scene="${world}"]`);
    await expect(scene).toHaveAttribute('aria-label', labels.title);
    for (const text of [
      original.intro,
      original.about,
      ...original.experience,
      ...original.projects,
    ])
      await expect(scene.getByText(text, { exact: true })).toBeVisible();
    for (const text of original.capabilities)
      await expect(scene.getByText(text, { exact: false })).toBeVisible();
    for (const job of profile.experience) {
      await expect(
        scene.getByRole('heading', { name: job.company, exact: true }),
      ).toBeVisible();
      await expect(scene.getByText(job.role, { exact: true })).toBeVisible();
      await expect(scene.getByText(job.period, { exact: true })).toBeVisible();
    }
    await expect(scene.getByRole('heading', { level: 1 })).toContainText(
      'Muhsin',
    );
    await expect(
      scene.getByRole('link', { name: 'Get in touch', exact: true }),
    ).toHaveAttribute('href', 'mailto:me@muhsi.in');
    await expect(
      scene.getByRole('link', { name: new RegExp(labels.resume) }),
    ).toHaveAttribute('href', /resume\.pdf$/);
    await expect(scene.locator('.world-picker legend')).toHaveText(
      labels.legend,
    );
    const motion = scene.locator('[data-motion-toggle]');
    await expect(motion.locator('.motion-label')).toHaveText('Motion off');
    await expect(motion).toHaveAccessibleName(
      'Motion off — Ambient motion disabled by reduced-motion preference',
    );
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(motion.locator('.motion-label')).toHaveText('Motion on');
    await expect(motion).toHaveAccessibleName(
      'Motion on — Pause ambient motion',
    );
    await motion.click();
    await expect(motion.locator('.motion-label')).toHaveText('Motion off');
    await expect(motion).toHaveAccessibleName(
      'Motion off — Resume ambient motion',
    );
    await page.reload();
    await expect(motion.locator('.motion-label')).toHaveText('Motion off');
    await expect(
      scene.getByText(original.intro, { exact: true }),
    ).toBeVisible();
  });
}

test('existing worlds retain main decorative wording, categories and project controls', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  const medieval = page.locator('[data-scene="medieval"]');
  await expect(medieval.locator('.folio-eyebrow')).toContainText(
    'Engineer by trade. Curious by nature.',
  );
  await expect(medieval.locator('.folio-edition')).toContainText(
    'A personal folio',
  );
  await expect(medieval.locator('.folio-craft h2')).toHaveText(
    /Thoughtful by design\.\s*Dependable by nature\./,
  );
  await expect(medieval.locator('.folio-work-heading h2')).toHaveText(
    'Selected works.',
  );
  await expect(medieval.locator('.folio-project-title > span')).toHaveText([
    'Independent product',
    'Creative experiment',
  ]);
  await expect(
    medieval.getByRole('link', { name: 'Explore Kadha', exact: true }),
  ).toBeVisible();
  await medieval.locator('[data-theme-choice="cyberpunk"]').click();
  const cyberpunk = page.locator('[data-scene="cyberpunk"]');
  await expect(cyberpunk.locator('.signal-manifesto')).toHaveText(
    /BUILD WITH INTENT\.\s*BREAK THE ORDINARY\./,
  );
  await expect(cyberpunk.locator('.signal-record-label h2')).toHaveText(
    /More than\s*the interface\./,
  );
  await expect(cyberpunk.locator('.signal-work-heading h2')).toHaveText(
    'BUILT.SHIPPED.',
  );
  await expect(
    cyberpunk.locator('.signal-project-top > span:first-child'),
  ).toHaveText(['01 / Independent product', '02 / Creative experiment']);
  await expect(
    cyberpunk.getByRole('link', { name: 'Explore Kadha', exact: true }),
  ).toBeVisible();
});

test('social links sit by the contact action and footers offer the repository', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');

  for (const world of ['medieval', 'cyberpunk', 'metro'] as const) {
    await page
      .locator(`[data-scene]:visible [data-theme-choice="${world}"]`)
      .click();
    const scene = page.locator(`[data-scene="${world}"]`);
    const socials = scene.locator('.hero-socials');

    await expect(socials.getByRole('link')).toHaveText([
      'GitHub ↗',
      'LinkedIn ↗',
      'Mastodon ↗',
    ]);
    await expect(
      socials.getByRole('link', { name: 'GitHub ↗' }),
    ).toHaveAttribute('href', 'https://github.com/muhsin7majeed/');
    await expect(
      socials.getByRole('link', { name: 'LinkedIn ↗' }),
    ).toHaveAttribute('href', 'https://www.linkedin.com/in/muhsin7majeed/');
    await expect(
      socials.getByRole('link', { name: 'Mastodon ↗' }),
    ).toHaveAttribute('href', 'https://mastodon.social/@unbaked_potato');

    const footer = scene.locator('footer');
    await expect(
      footer.getByRole('link', { name: 'Fork this ↗' }),
    ).toHaveAttribute('href', 'https://github.com/muhsin7majeed/realms');
    await expect(footer.getByRole('link', { name: /Email/ })).toHaveAttribute(
      'href',
      'mailto:me@muhsi.in',
    );
    await expect(
      footer.getByRole('link', { name: /top|beginning/i }),
    ).toHaveAttribute('href', `#${world}-home`);
  }
});

test('destination transition labels and neutral metadata retain main wording', async ({
  page,
}) => {
  await page.goto('./');
  for (const world of ['cyberpunk', 'metro', 'medieval'] as const) {
    await page
      .locator(`[data-scene]:visible [data-theme-choice="${world}"]`)
      .click();
    await expect(page.locator('[data-world-label]')).toHaveText(
      worlds[world].title.toUpperCase(),
    );
    await expect(page.locator('[data-world-caption]')).toHaveText(
      worlds[world].transition,
    );
    await expect(page.locator('html')).toHaveAttribute('data-theme', world);
    await expect(page.locator('.world-transition')).not.toBeVisible();
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      `Frontend engineer from Kerala, India. ${original.intro}`,
    );
    await expect(
      page.locator('meta[property="og:description"]'),
    ).toHaveAttribute('content', original.intro);
  }
});
