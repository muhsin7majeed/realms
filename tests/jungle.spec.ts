import { expect, test } from '@playwright/test';

const scene = (page: import('@playwright/test').Page) =>
  page.locator('[data-scene]:visible');
const jungle = (page: import('@playwright/test').Page) =>
  page.locator('[data-scene="jungle"]');

async function enterJungle(page: import('@playwright/test').Page) {
  await page.goto('./');
  await scene(page).locator('[data-theme-choice="jungle"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'jungle');
  await expect(page.locator('.world-transition')).not.toBeVisible();
}

const translateY = (transform: string) => {
  const values = transform.match(/matrix(?:3d)?\(([^)]+)\)/)?.[1].split(',');
  if (!values) return 0;
  return Number(values.length === 16 ? values[13] : values[5]);
};

test('Jungle canopy art and display font are deferred until requested', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.waitForLoadState('networkidle');
  expect(
    requests.some((url) => /jungle\/canopy\.svg|fraunces/i.test(url)),
  ).toBeFalsy();
  await scene(page).locator('[data-theme-choice="jungle"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'jungle');
  await expect
    .poll(() => requests.some((url) => url.includes('jungle/canopy.svg')))
    .toBeTruthy();
  await expect
    .poll(() => requests.some((url) => /fraunces/i.test(url)))
    .toBeTruthy();
  expect(
    await jungle(page)
      .locator('.jg-layer-canopy img')
      .evaluate((image) => (image as HTMLImageElement).naturalWidth),
  ).toBeGreaterThan(0);
});

test('Jungle depth planes descend with scroll, freeze when paused, and rest when the world changes', async ({
  page,
}) => {
  await enterJungle(page);
  const fore = jungle(page).locator('.jg-layer-fore');
  const canopy = jungle(page).locator('.jg-layer-canopy');
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
      jungle(page).evaluate((el) =>
        Number.parseFloat(el.style.getPropertyValue('--jg-descent')),
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
      jungle(page).evaluate((el) => el.style.getPropertyValue('--jg-descent')),
    )
    .toBe('');
});

test('Jungle leaves rustle on direct hover, obey motion pause, and never cover the glade content', async ({
  page,
}) => {
  await enterJungle(page);
  await page.waitForTimeout(600);

  for (const target of [
    jungle(page).getByRole('heading', { level: 1 }),
    jungle(page).getByRole('link', { name: 'Get in touch', exact: true }),
    jungle(page).getByRole('button', { name: /medieval/i }),
  ]) {
    const box = (await target.boundingBox())!;
    const hitsContent = await page.evaluate(
      ([x, y]) => {
        const hit = document.elementFromPoint(x, y);
        return Boolean(hit && !hit.closest('.jg-stage, .jg-sprig'));
      },
      [box.x + box.width / 2, box.y + box.height / 2],
    );
    expect(hitsContent).toBeTruthy();
  }

  const leaf = await page.evaluate(() => {
    const paths = document.querySelectorAll<SVGPathElement>(
      '[data-scene="jungle"] .jg-stage-front .jg-leaf path',
    );
    for (const path of paths) {
      const rect = path.getBoundingClientRect();
      if (rect.width < 40 || rect.height < 40) continue;
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
      const hit = document.elementFromPoint(x, y);
      if (hit && path.closest('.jg-leaf')!.contains(hit)) return { x, y };
    }
    return null;
  });
  expect(leaf).not.toBeNull();
  const rustling = jungle(page).locator('.jg-blade.is-rustling');
  await page.mouse.move(leaf!.x, leaf!.y);
  await expect(rustling).toHaveCount(1);
  await expect(rustling).toHaveCSS('animation-name', 'jg-rustle');
  await expect(
    jungle(page).locator('.jg-blade.is-rustling-soft'),
  ).not.toHaveCount(0);
  await expect(rustling).toHaveCount(0, { timeout: 4000 });
  await expect(jungle(page).locator('.jg-blade.is-rustling-soft')).toHaveCount(
    0,
  );

  await scene(page).locator('[data-motion-toggle]').click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  await page.mouse.move(leaf!.x + 400, leaf!.y);
  await page.mouse.move(leaf!.x, leaf!.y);
  await page.waitForTimeout(250);
  await expect(rustling).toHaveCount(0);
  expect(
    await page.evaluate(
      ([x, y]) => Boolean(document.elementFromPoint(x, y)?.closest('.jg-leaf')),
      [leaf!.x, leaf!.y],
    ),
  ).toBeFalsy();
});

test('Jungle is complete and still under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enterJungle(page);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  const cluster = jungle(page).locator('[data-ambient="sway"]').first();
  const before = await cluster.evaluate((el) => getComputedStyle(el).transform);
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'instant' }));
  await page.waitForTimeout(400);
  expect(await cluster.evaluate((el) => getComputedStyle(el).transform)).toBe(
    before,
  );
  await expect(jungle(page).locator('.jg-layer-fore')).toHaveCSS(
    'transform',
    'none',
  );
  expect(
    await jungle(page)
      .locator('.jg-mote')
      .evaluateAll((motes) =>
        motes.every((mote) => getComputedStyle(mote).opacity === '0'),
      ),
  ).toBeTruthy();
  await expect(jungle(page).getByRole('heading', { level: 1 })).toHaveCSS(
    'opacity',
    '1',
  );
  await expect(
    jungle(page).locator('.jg-stage-front .jg-cluster').first(),
  ).toBeVisible();
});

test('Jungle shutter covers the viewport when the scenes swap', async ({
  page,
}) => {
  await page.goto('./');
  const coverage = await page.evaluate(
    () =>
      new Promise<{ left: number; right: number; width: number }>((resolve) => {
        const observer = new MutationObserver(() => {
          if (document.documentElement.dataset.theme === 'jungle') {
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
            '[data-scene="medieval"] [data-theme-choice="jungle"]',
          )!
          .click();
      }),
  );
  expect(coverage.left).toBeLessThanOrEqual(1);
  expect(coverage.right).toBeGreaterThanOrEqual(coverage.width - 1);
  await expect(page.locator('.world-transition')).not.toBeVisible();
});
