import { expect, test } from '@playwright/test';

const scene = (page: import('@playwright/test').Page) =>
  page.locator('[data-scene]:visible');
const space = (page: import('@playwright/test').Page) =>
  page.locator('[data-scene="space"]');

async function enterSpace(page: import('@playwright/test').Page) {
  await page.goto('./');
  await scene(page).locator('[data-theme-choice="space"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'space');
  await expect(page.locator('.world-transition')).not.toBeVisible();
}

const translateY = (transform: string) => {
  const values = transform.match(/matrix(?:3d)?\(([^)]+)\)/)?.[1].split(',');
  if (!values) return 0;
  return Number(values.length === 16 ? values[13] : values[5]);
};

test('Space canopy art and display font are deferred until requested', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.waitForLoadState('networkidle');
  expect(
    requests.some((url) => /space\/starfield\.svg|space-grotesk/i.test(url)),
  ).toBeFalsy();
  await scene(page).locator('[data-theme-choice="space"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'space');
  await expect
    .poll(() => requests.some((url) => url.includes('space/starfield.svg')))
    .toBeTruthy();
  await expect
    .poll(() => requests.some((url) => /space-grotesk/i.test(url)))
    .toBeTruthy();
  expect(
    await space(page)
      .locator('.sp-layer-stars img')
      .evaluate((image) => (image as HTMLImageElement).naturalWidth),
  ).toBeGreaterThan(0);
});

test('Space depth planes descend with scroll, freeze when paused, and rest when the world changes', async ({
  page,
}) => {
  await enterSpace(page);
  const fore = space(page).locator('.sp-layer-fore');
  const canopy = space(page).locator('.sp-layer-stars');
  const transform = (layer: typeof fore) =>
    layer.evaluate((el) => getComputedStyle(el).transform);

  await page.evaluate(() => window.scrollTo({ top: 700, behavior: 'instant' }));
  await expect
    .poll(async () => translateY(await transform(fore)))
    .toBeLessThan(-30);
  const foreShift = translateY(await transform(fore));
  const canopyShift = translateY(await transform(canopy));
  expect(canopyShift).toBeLessThan(0);
  expect(Math.abs(canopyShift)).toBeLessThan(Math.abs(foreShift) / 3);
  await expect
    .poll(() =>
      space(page)
        .locator('.sp-layer-light')
        .evaluate((el) =>
          Number.parseFloat(el.style.getPropertyValue('--sp-descent')),
        ),
    )
    .toBeGreaterThan(0.05);

  await scene(page).locator('[data-motion-toggle]').click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  await page.waitForTimeout(300);
  const frozen = await transform(fore);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(400);
  expect(await transform(fore)).toBe(frozen);

  await scene(page).locator('[data-motion-toggle]').click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'running');
  await scene(page).locator('[data-theme-choice="medieval"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'medieval');
  await expect(page.locator('.world-transition')).not.toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'instant' }));
  await expect.poll(() => fore.evaluate((el) => el.style.transform)).toBe('');
  await expect
    .poll(() =>
      space(page)
        .locator('.sp-layer-light')
        .evaluate((el) => el.style.getPropertyValue('--sp-descent')),
    )
    .toBe('');
});

test('Space bodies pulse on direct hover, obey motion pause, and never cover the field content', async ({
  page,
}) => {
  await enterSpace(page);
  await page.waitForTimeout(600);

  for (const target of [
    space(page).getByRole('heading', { level: 1 }),
    space(page).getByRole('link', { name: 'Get in touch', exact: true }),
    space(page).getByRole('button', { name: /medieval/i }),
  ]) {
    const box = (await target.boundingBox())!;
    const hitsContent = await page.evaluate(
      ([x, y]) => {
        const hit = document.elementFromPoint(x, y);
        return Boolean(hit && !hit.closest('.sp-stage, .sp-constellation'));
      },
      [box.x + box.width / 2, box.y + box.height / 2],
    );
    expect(hitsContent).toBeTruthy();
  }

  const leaf = await page.evaluate(() => {
    const paths = document.querySelectorAll<SVGPathElement>(
      '[data-scene="space"] .sp-stage .sp-object path',
    );
    for (const path of paths) {
      const rect = path.getBoundingClientRect();
      if (rect.width < 24 || rect.height < 24) continue;
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
      const hit = document.elementFromPoint(x, y);
      if (hit && path.closest('.sp-object')!.contains(hit)) return { x, y };
    }
    return null;
  });
  expect(leaf).not.toBeNull();
  const rustling = space(page).locator('.sp-core.is-pulsing');
  await page.mouse.move(leaf!.x, leaf!.y);
  await expect(rustling).toHaveCount(1);
  await expect(rustling).toHaveCSS('animation-name', 'sp-pulse');
  await expect(rustling).toHaveCount(0, { timeout: 4000 });

  await scene(page).locator('[data-motion-toggle]').click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  await page.mouse.move(leaf!.x + 400, leaf!.y);
  await page.mouse.move(leaf!.x, leaf!.y);
  await page.waitForTimeout(250);
  await expect(rustling).toHaveCount(0);
  expect(
    await page.evaluate(
      ([x, y]) =>
        Boolean(document.elementFromPoint(x, y)?.closest('.sp-object')),
      [leaf!.x, leaf!.y],
    ),
  ).toBeFalsy();
});

test('Space is complete and still under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enterSpace(page);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  const cluster = space(page).locator('[data-ambient="drift"]').first();
  const before = await cluster.evaluate((el) => getComputedStyle(el).transform);
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'instant' }));
  await page.waitForTimeout(400);
  expect(await cluster.evaluate((el) => getComputedStyle(el).transform)).toBe(
    before,
  );
  await expect(space(page).locator('.sp-layer-fore')).toHaveCSS(
    'transform',
    'none',
  );
  expect(
    await space(page)
      .locator('.sp-dust')
      .evaluateAll((motes) =>
        motes.every((mote) => getComputedStyle(mote).opacity === '0'),
      ),
  ).toBeTruthy();
  await expect(space(page).getByRole('heading', { level: 1 })).toHaveCSS(
    'opacity',
    '1',
  );
  await expect(
    space(page).locator('.sp-stage-front .sp-body').first(),
  ).toBeVisible();
});

test('Space shutter covers the viewport when the scenes swap', async ({
  page,
}) => {
  await page.goto('./');
  const coverage = await page.evaluate(
    () =>
      new Promise<{ left: number; right: number; width: number }>((resolve) => {
        const observer = new MutationObserver(() => {
          if (document.documentElement.dataset.theme === 'space') {
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
            '[data-scene="medieval"] [data-theme-choice="space"]',
          )!
          .click();
      }),
  );
  expect(coverage.left).toBeLessThanOrEqual(1);
  expect(coverage.right).toBeGreaterThanOrEqual(coverage.width - 1);
  await expect(page.locator('.world-transition')).not.toBeVisible();
});
