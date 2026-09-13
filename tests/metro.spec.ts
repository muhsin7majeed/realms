import { expect, test } from '@playwright/test';

const worlds = ['medieval', 'cyberpunk', 'metro', 'jungle', 'space', 'sky'];
const scene = (page: import('@playwright/test').Page) =>
  page.locator('[data-scene]:visible');

for (const from of worlds)
  for (const to of worlds.filter((world) => world !== from)) {
    test(`${from} → ${to}: keyboard focus, reading region, persistence and exposure`, async ({
      page,
    }) => {
      await page.goto('./');
      await scene(page).locator(`[data-theme-choice="${from}"]`).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', from);
      await expect(page.locator('.world-transition')).not.toBeVisible();
      await page.waitForTimeout(800);
      const button = scene(page).locator(`[data-theme-choice="${to}"]`);
      await button.focus();
      await scene(page)
        .locator('main > section')
        .nth(1)
        .evaluate((el) =>
          window.scrollTo({
            top: window.scrollY + el.getBoundingClientRect().top,
            behavior: 'instant',
          }),
        );
      await page.keyboard.press('Enter');
      await expect(page.locator('html')).toHaveAttribute('data-theme', to);
      await expect(page.locator('.world-transition')).not.toBeVisible();
      await expect(
        scene(page).locator(`[data-theme-choice="${to}"]`),
      ).toBeFocused();
      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(scene(page).locator('main > section')).toHaveCount(3);
      expect(
        Math.abs(
          await scene(page)
            .locator('main > section')
            .nth(1)
            .evaluate((el) => el.getBoundingClientRect().top),
        ),
      ).toBeLessThan(5);
      await expect(page.locator('[data-theme-status]')).toHaveText(
        new RegExp(to, 'i'),
      );
      await expect(page.locator('.skip-link')).toHaveAttribute(
        'href',
        `#${to}-home`,
      );
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-theme', to);
    });
  }

test('Metro art and display font are deferred, repeated three-way requests await eager art', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (req) => requests.push(req.url()));
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/metro/workshop.svg', async (route) => {
    await delayed;
    await route.continue();
  });
  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('./');
    await page.waitForLoadState('networkidle');
    expect(
      requests.some((url) => /metro\/(workshop|lamp-)|russo-one/.test(url)),
    ).toBeFalsy();
    await scene(page).locator('[data-theme-choice="metro"]').click();
    await expect
      .poll(() => requests.some((url) => url.includes('metro/workshop.svg')))
      .toBeTruthy();
    await scene(page).locator('[data-theme-choice="cyberpunk"]').click();
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      'cyberpunk',
    );
    await scene(page).locator('[data-theme-choice="metro"]').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      'cyberpunk',
    );
    release();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'metro');
    expect(
      await scene(page)
        .locator('.workshop-background')
        .evaluate((el) => (el as HTMLImageElement).naturalWidth),
    ).toBeGreaterThan(0);
  } finally {
    release();
  }
});

for (const destination of ['medieval', 'metro'])
  test(`rapid three-way cancellation settles on ${destination}`, async ({
    page,
  }) => {
    await page.goto('./');
    await page.evaluate((destination) => {
      const click = (world: string) =>
        document
          .querySelector<HTMLButtonElement>(
            `[data-scene="medieval"] [data-theme-choice="${world}"]`,
          )!
          .click();
      click('metro');
      setTimeout(() => click('cyberpunk'), 70);
      setTimeout(() => click(destination), 140);
    }, destination);
    await page.waitForTimeout(1800);
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      destination,
    );
    await expect(page.locator('.world-transition')).not.toBeVisible();
    await expect(scene(page).getByRole('heading', { level: 1 })).toHaveCSS(
      'opacity',
      '1',
    );
  });

test('Metro bulkhead covers the swap without orbit artwork', async ({
  page,
}) => {
  await page.goto('./');
  const coverage = await page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const observer = new MutationObserver(() => {
          if (document.documentElement.dataset.theme !== 'metro') return;
          const panels = [
            ...document.querySelectorAll('.world-transition-bulkhead > div'),
          ].map((el) => el.getBoundingClientRect());
          observer.disconnect();
          resolve(
            panels.length === 2 &&
              panels[0].top <= 0 &&
              panels[0].bottom >= innerHeight / 2 &&
              panels[1].top <= innerHeight / 2 &&
              panels[1].bottom >= innerHeight,
          );
        });
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-theme'],
        });
        document
          .querySelector<HTMLButtonElement>(
            '[data-scene="medieval"] [data-theme-choice="metro"]',
          )!
          .click();
      }),
  );
  expect(coverage).toBeTruthy();
  await expect(page.locator('.world-transition svg')).not.toBeVisible();
});

test('Metro lamp visibly flickers, swings only on direct hover, and obeys motion pause', async ({
  page,
}) => {
  await page.goto('./');
  await scene(page).locator('[data-theme-choice="metro"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'metro');
  await expect(page.locator('.world-transition')).not.toBeVisible();

  const fixture = scene(page).locator('[data-lamp-fixture]');
  const glows = scene(page).locator('[data-ambient="lamp-glow"]');
  const glow = glows.first();
  const hitTarget = scene(page).locator('[data-lamp-hit]');
  const visual = scene(page).locator('[data-lamp-visual]');
  const foreground = scene(page).locator('.workshop-foreground');
  await expect(fixture).toHaveCount(1);
  await expect(glows).toHaveCount(2);
  await expect(hitTarget).toHaveCount(1);
  await expect(foreground).toHaveCount(1);
  expect(
    await foreground.evaluate((element) =>
      element.previousElementSibling?.hasAttribute('data-lamp-visual'),
    ),
  ).toBeTruthy();
  expect(
    await fixture.evaluate(
      (element) =>
        element.previousElementSibling?.classList.contains('lamp-pool') &&
        element.nextElementSibling?.classList.contains('lamp-glow'),
    ),
  ).toBeTruthy();
  const hitBox = await hitTarget.boundingBox();
  expect(hitBox).not.toBeNull();

  const opacities: number[] = [];
  for (let index = 0; index < 25; index += 1) {
    opacities.push(
      await glow.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).opacity),
      ),
    );
    await page.waitForTimeout(80);
  }
  expect(Math.max(...opacities) - Math.min(...opacities)).toBeGreaterThan(0.45);
  expect(
    opacities.some(
      (opacity, index) => index > 0 && opacity < opacities[index - 1] - 0.1,
    ),
  ).toBeTruthy();
  expect(
    opacities.some(
      (opacity, index) => index > 0 && opacity > opacities[index - 1] + 0.1,
    ),
  ).toBeTruthy();

  await hitTarget.hover();
  await page.waitForTimeout(250);
  await expect(visual).not.toHaveCSS('transform', 'none');
  await page.mouse.move(
    hitBox!.x + hitBox!.width + 20,
    hitBox!.y + hitBox!.height / 2,
  );
  await expect(visual).not.toHaveCSS('transform', 'none');
  await expect(visual).toHaveCSS('transform', 'none');

  await hitTarget.hover();
  await page.waitForTimeout(250);
  await expect(visual).toHaveCSS('animation-name', 'metro-lamp-swing');
  await scene(page).locator('[data-motion-toggle]').click();
  await expect(visual).not.toHaveClass(/is-swinging/);
  await expect(visual).toHaveCSS('animation-name', 'none');
  await scene(page).locator('[data-motion-toggle]').click();
  await expect(visual).toHaveCSS('animation-name', 'none');

  // The flicker repeats every 13.5s and its dips last ~100ms, so watch for
  // one inside the page and pause from there; runner round-trips would miss it.
  const pausedDuringDip = await glow.evaluate(
    (element) =>
      new Promise<boolean>((resolve) => {
        const toggle = element
          .closest('[data-scene]')!
          .querySelector<HTMLButtonElement>('[data-motion-toggle]')!;
        const deadline = performance.now() + 14000;
        const watch = () => {
          if (Number.parseFloat(getComputedStyle(element).opacity) < 0.4) {
            toggle.click();
            resolve(true);
          } else if (performance.now() > deadline) resolve(false);
          else requestAnimationFrame(watch);
        };
        watch();
      }),
  );
  expect(pausedDuringDip).toBeTruthy();
  await expect
    .poll(() =>
      glows.evaluateAll((elements) =>
        elements.every((element) => getComputedStyle(element).opacity === '1'),
      ),
    )
    .toBeTruthy();
  await page.mouse.move(
    hitBox!.x + hitBox!.width / 2,
    hitBox!.y + hitBox!.height / 2,
  );
  await expect(visual).toHaveCSS('transform', 'none');
});

test('Metro lamp hover target tracks the visible fixture at each responsive crop', async ({
  page,
}) => {
  await page.goto('./');
  await scene(page).locator('[data-theme-choice="metro"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'metro');
  await expect(page.locator('.world-transition')).not.toBeVisible();

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 768, height: 900 },
    { width: 390, height: 844 },
    { width: 360, height: 740 },
  ]) {
    await page.setViewportSize(viewport);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    const hitTarget = scene(page).locator('[data-lamp-hit]');
    await hitTarget.scrollIntoViewIfNeeded();
    const lamp = await page.evaluate(() => {
      const art = document.querySelector<HTMLElement>(
        '[data-scene="metro"] .workshop-art',
      )!;
      const image = document.querySelector<HTMLImageElement>(
        '[data-scene="metro"] .workshop-background',
      )!;
      const hit = document.querySelector<HTMLElement>(
        '[data-scene="metro"] [data-lamp-hit]',
      )!;
      const artRect = art.getBoundingClientRect();
      const hitRect = hit.getBoundingClientRect();
      const style = getComputedStyle(image);
      const scale = Math.max(artRect.width / 1440, artRect.height / 760);
      const renderedWidth = 1440 * scale;
      const renderedHeight = 760 * scale;
      const [xPosition, yPosition] = style.objectPosition
        .split(' ')
        .map((value) => Number.parseFloat(value) / 100);
      const x =
        artRect.left +
        884 * scale +
        (artRect.width - renderedWidth) * xPosition;
      const y =
        artRect.top +
        220 * scale +
        (artRect.height - renderedHeight) * yPosition;
      return {
        x,
        y,
        nearX: hitRect.right + 15,
        nearY: hitRect.top + hitRect.height / 2,
        contains:
          x >= hitRect.left &&
          x <= hitRect.right &&
          y >= hitRect.top &&
          y <= hitRect.bottom,
      };
    });
    expect(lamp.contains).toBeTruthy();
    const visual = scene(page).locator('[data-lamp-visual]');
    await page.mouse.move(lamp.nearX, lamp.nearY);
    await expect(visual).toHaveCSS('animation-name', 'none');
    await page.mouse.move(lamp.x, lamp.y);
    await expect(visual).toHaveCSS('animation-name', 'metro-lamp-swing');
    await page.mouse.move(lamp.nearX, lamp.nearY);
    await page.waitForTimeout(200);
    await expect(visual).toHaveCSS('animation-name', 'metro-lamp-swing');
    await expect(visual).toHaveCSS('animation-name', 'none');
  }
});

test('Metro reduced motion, pause mid-transition, visibility and blocked storage', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error('Storage blocked');
    };
    Storage.prototype.setItem = () => {
      throw new Error('Storage blocked');
    };
  });
  await page.goto('./');
  await scene(page).locator('[data-theme-choice="metro"]').click();
  await expect(page.locator('.world-transition')).toBeVisible();
  await scene(page).locator('[data-motion-toggle]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'metro');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  await expect(page.locator('.world-transition')).not.toBeVisible();
  await scene(page).locator('[data-motion-toggle]').click();
  const lights = scene(page).locator('[data-ambient="lamp-glow"]');
  const light = lights.first();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const opacity = await light.evaluate((el) => getComputedStyle(el).opacity);
  await page.waitForTimeout(200);
  expect(await light.evaluate((el) => getComputedStyle(el).opacity)).toBe(
    opacity,
  );
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await scene(page).locator('[data-theme-choice="cyberpunk"]').click();
  await expect(page.locator('.world-transition')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'cyberpunk');
  await expect(page.locator('.world-transition')).not.toBeVisible();
  await scene(page).locator('[data-theme-choice="metro"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'metro');
  await expect(page.locator('.world-transition')).not.toBeVisible();
  await expect
    .poll(() =>
      lights.evaluateAll((elements) =>
        elements.every((element) => getComputedStyle(element).opacity === '1'),
      ),
    )
    .toBeTruthy();
  const reducedHit = await scene(page).locator('[data-lamp-hit]').boundingBox();
  expect(reducedHit).not.toBeNull();
  await page.mouse.move(
    reducedHit!.x + reducedHit!.width / 2,
    reducedHit!.y + reducedHit!.height / 2,
  );
  await expect(scene(page).locator('[data-lamp-visual]')).toHaveCSS(
    'animation-name',
    'none',
  );
});

test('all scenes have unique IDs and base-safe local assets without failed requests', async ({
  page,
  request,
  baseURL,
}) => {
  const failures: string[] = [];
  const external: string[] = [];
  page.on('response', (response) => {
    if (response.status() >= 400)
      failures.push(`${response.status()} ${response.url()}`);
  });
  page.on('request', (req) => {
    if (
      !req.url().startsWith(new URL(baseURL!).origin) &&
      !req.url().startsWith('data:')
    )
      external.push(req.url());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  expect(
    await page
      .locator('[id]')
      .evaluateAll((elements) =>
        elements
          .map((el) => el.id)
          .filter((id, index, ids) => ids.indexOf(id) !== index),
      ),
  ).toEqual([]);
  for (const world of worlds) {
    await scene(page).locator(`[data-theme-choice="${world}"]`).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', world);
    const resume = await scene(page)
      .getByRole('link', { name: /résumé/i })
      .getAttribute('href');
    expect(resume).toBe(`${new URL(baseURL!).pathname}resume.pdf`);
    expect((await request.get(resume!)).status()).toBe(200);
    for (const image of await scene(page).locator('img').all()) {
      await image.scrollIntoViewIfNeeded();
      // Six worlds of lazy images under a parallel run need more than 5s.
      await expect
        .poll(
          () => image.evaluate((el) => (el as HTMLImageElement).naturalWidth),
          { timeout: 10000 },
        )
        .toBeGreaterThan(0);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  }
  await page.waitForLoadState('networkidle');
  expect(failures).toEqual([]);
  expect(external).toEqual([]);
});
