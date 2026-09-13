import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const currentScene = (page: import('@playwright/test').Page) =>
  page.locator('[data-scene]:visible');

for (const theme of ['medieval', 'cyberpunk', 'metro', 'jungle']) {
  test(`${theme}: responsive, accessible, and complete`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('./');
    await currentScene(page)
      .getByRole('button', { name: new RegExp(theme, 'i') })
      .click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(
      currentScene(page).getByRole('link', { name: /get in touch/i }),
    ).toBeVisible();
    await expect(
      currentScene(page).getByRole('link', { name: /résumé/i }),
    ).toBeVisible();
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      // Chromium can report the new width before updating viewport media queries.
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `overflow at ${width}`,
      ).toBeTruthy();
      await expect(
        currentScene(page).getByRole('button', { name: /medieval/i }),
      ).toBeInViewport();
      await expect(
        currentScene(page).getByRole('button', { name: /cyberpunk/i }),
      ).toBeInViewport();
      await expect(
        currentScene(page).getByRole('button', { name: /metro/i }),
      ).toBeInViewport();
      await expect(
        currentScene(page).getByRole('button', { name: /jungle/i }),
      ).toBeInViewport();
    }
    await page.evaluate(() => document.fonts.ready);
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      audit.violations.map(({ id, nodes }) => ({
        id,
        targets: nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
    const brokenImages = await currentScene(page)
      .locator('img')
      .evaluateAll((images) =>
        images
          .filter(
            (img) =>
              !(img as HTMLImageElement).complete ||
              !(img as HTMLImageElement).naturalWidth,
          )
          .map((img) => img.getAttribute('src')),
      );
    expect(brokenImages).toEqual([]);
  });
}

test('switch preserves facts, keyboard focus and chosen theme across reload', async ({
  page,
}) => {
  await page.goto('./');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const cyber = currentScene(page).getByRole('button', { name: /cyberpunk/i });
  await cyber.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'cyberpunk');
  await expect(
    currentScene(page).getByRole('button', { name: /cyberpunk/i }),
  ).toBeFocused();
  await expect(page.locator('[data-theme-status]')).toHaveText(/cyberpunk/i);
  await expect(
    page.getByRole('heading', { name: 'Springworks', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Explore Kadha', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'cyberpunk');
  await expect(page.locator('.skip-link')).toHaveAttribute(
    'href',
    '#cyberpunk-home',
  );
  expect(errors).toEqual([]);
});

test('rapid switches settle to the latest request and leave no overlay or stuck styles', async ({
  page,
}) => {
  await page.goto('./');
  await page.evaluate(() => {
    document
      .querySelector<HTMLButtonElement>(
        '[data-scene="medieval"] [data-theme-choice="cyberpunk"]',
      )!
      .click();
    setTimeout(
      () =>
        document
          .querySelector<HTMLButtonElement>(
            '[data-scene="medieval"] [data-theme-choice="medieval"]',
          )!
          .click(),
      80,
    );
    setTimeout(
      () =>
        document
          .querySelector<HTMLButtonElement>(
            '[data-scene="medieval"] [data-theme-choice="cyberpunk"]',
          )!
          .click(),
      140,
    );
  });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'cyberpunk');
  await expect(page.locator('.world-transition')).not.toBeVisible();
  await expect(currentScene(page).getByRole('heading', { level: 1 })).toHaveCSS(
    'opacity',
    '1',
  );
  await currentScene(page)
    .getByRole('button', { name: /medieval/i })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'medieval');
  await expect(page.locator('.world-transition')).not.toBeVisible();
});

test('reduced motion and pause preference survive switches and reloads', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  await currentScene(page)
    .getByRole('button', { name: /cyberpunk/i })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'cyberpunk');
  await expect(page.locator('.world-transition')).not.toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'running');
  await currentScene(page)
    .getByRole('button', { name: /pause ambient motion/i })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  await currentScene(page)
    .getByRole('button', { name: /medieval/i })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'medieval');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
});

test('default world does not request inactive scene imagery', async ({
  page,
}) => {
  const images: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'image') images.push(request.url());
  });
  await page.goto('./');
  await page.waitForLoadState('networkidle');
  expect(images.some((url) => url.includes('/cyberpunk/city.svg'))).toBeFalsy();
  await currentScene(page)
    .getByRole('button', { name: /cyberpunk/i })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'cyberpunk');
  await expect
    .poll(() => images.some((url) => url.includes('/cyberpunk/city.svg')))
    .toBeTruthy();
});

test('transition shutter covers the viewport when the scenes swap', async ({
  page,
}) => {
  await page.goto('./');
  const coverage = await page.evaluate(
    () =>
      new Promise<{ left: number; right: number; width: number }>((resolve) => {
        const observer = new MutationObserver(() => {
          if (document.documentElement.dataset.theme === 'cyberpunk') {
            const rect = document
              .querySelector('.world-transition-shutter')!
              .getBoundingClientRect();
            observer.disconnect();
            resolve({ left: rect.left, right: rect.right, width: innerWidth });
          }
        });
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-theme'],
        });
        document
          .querySelector<HTMLButtonElement>(
            '[data-scene="medieval"] [data-theme-choice="cyberpunk"]',
          )!
          .click();
      }),
  );
  expect(coverage.left).toBeLessThanOrEqual(1);
  expect(coverage.right).toBeGreaterThanOrEqual(coverage.width - 1);
});

test('selecting the initial world while fonts load still starts ambient motion', async ({
  page,
}) => {
  await page.route('**/*.woff2', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await currentScene(page)
    .getByRole('button', { name: /medieval/i })
    .click();
  await expect
    .poll(() =>
      currentScene(page)
        .locator('[data-ambient="orbit"]')
        .evaluate((el) => getComputedStyle(el).transform),
    )
    .not.toBe('none');
});

test('ambient animation pauses while the document is hidden', async ({
  page,
}) => {
  await page.goto('./');
  const orbit = currentScene(page).locator('[data-ambient="orbit"]');
  await expect
    .poll(() => orbit.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe('none');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  const pausedTransform = await orbit.evaluate(
    (el) => getComputedStyle(el).transform,
  );
  await page.waitForTimeout(150);
  expect(await orbit.evaluate((el) => getComputedStyle(el).transform)).toBe(
    pausedTransform,
  );
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'running');
  await expect
    .poll(() => orbit.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe(pausedTransform);
});

test('selected cyberpunk control paints a focus indicator inside its clipped shape', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await currentScene(page)
    .getByRole('button', { name: /cyberpunk/i })
    .click();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  const selected = currentScene(page).getByRole('button', {
    name: /cyberpunk/i,
  });
  await expect(selected).toBeFocused();
  expect(
    await selected.evaluate((el) => el.matches(':focus-visible')),
  ).toBeTruthy();
  await expect(selected).toHaveCSS('box-shadow', /inset/);
});

test('rapid requests still wait for in-flight scene artwork', async ({
  page,
}) => {
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  let imageRequested = false;
  await page.route('**/cyberpunk/city.svg', async (route) => {
    imageRequested = true;
    await delayed;
    await route.continue();
  });
  try {
    await page.goto('./');
    await page.evaluate(() =>
      Promise.all(
        [
          '700 32px "Barlow Condensed"',
          '600 24px "Barlow Condensed"',
          '400 12px "IBM Plex Mono"',
          '400 16px "DM Sans"',
        ].map((font) => document.fonts.load(font)),
      ),
    );
    await currentScene(page)
      .getByRole('button', { name: /cyberpunk/i })
      .click();
    await expect.poll(() => imageRequested).toBeTruthy();
    await currentScene(page)
      .getByRole('button', { name: /medieval/i })
      .click();
    await currentScene(page)
      .getByRole('button', { name: /cyberpunk/i })
      .click();
    await page.waitForTimeout(1200);
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      'medieval',
    );
    release();
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      'cyberpunk',
    );
    expect(
      await currentScene(page)
        .locator('.signal-art img')
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    ).toBeGreaterThan(0);
  } finally {
    release();
  }
});

test('storage failure does not prevent changing worlds', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error('Storage blocked');
    };
    Storage.prototype.setItem = () => {
      throw new Error('Storage blocked');
    };
  });
  await page.goto('./');
  await currentScene(page)
    .getByRole('button', { name: /cyberpunk/i })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'cyberpunk');
});
