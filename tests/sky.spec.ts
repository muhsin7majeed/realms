import { expect, test } from '@playwright/test';

const scene = (page: import('@playwright/test').Page) =>
  page.locator('[data-scene]:visible');
const sky = (page: import('@playwright/test').Page) =>
  page.locator('[data-scene="sky"]');

async function enterSky(page: import('@playwright/test').Page) {
  await page.goto('./');
  await scene(page).locator('[data-theme-choice="sky"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'sky');
  await expect(page.locator('.world-transition')).not.toBeVisible();
}

const frames = (page: import('@playwright/test').Page) =>
  sky(page)
    .locator('.sk-canvas')
    .evaluate((el) => Number((el as HTMLElement).dataset.frames ?? 0));

test('Sky display font is deferred and the shader or its fallback is chosen', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.waitForLoadState('networkidle');
  expect(requests.some((url) => /outfit/i.test(url))).toBeFalsy();
  await scene(page).locator('[data-theme-choice="sky"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'sky');
  await expect
    .poll(() => requests.some((url) => /outfit/i.test(url)))
    .toBeTruthy();
  await expect(sky(page)).toHaveAttribute('data-sky', /webgl|css/);
  const mode = await sky(page).getAttribute('data-sky');
  if (mode === 'webgl') {
    await expect.poll(() => frames(page)).toBeGreaterThan(0);
    await expect(sky(page).locator('.sk-canvas')).toBeVisible();
  } else {
    await expect(sky(page).locator('.sk-fallback')).toBeVisible();
  }
});

test('Sky altitude follows scroll, the deck flashes on break-through, and the loop rests when paused or left', async ({
  page,
}) => {
  await enterSky(page);
  const altitude = () =>
    sky(page).evaluate((el) =>
      Number.parseFloat(el.style.getPropertyValue('--sk-alt') || '0'),
    );
  await expect.poll(altitude).toBeLessThan(0.05);
  const readout = sky(page).locator('[data-altitude]');
  await expect(readout).toHaveText(/^0 m$|^[\d,]+ m$/);
  await page.evaluate(() =>
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'instant',
    }),
  );
  await expect.poll(altitude, { timeout: 8000 }).toBeGreaterThan(0.9);
  await expect(readout).toHaveText(/^1\d,\d{3} m$|^9,\d{3} m$/);
  const before = await frames(page);
  await page.waitForTimeout(300);
  const mode = await sky(page).getAttribute('data-sky');
  if (mode === 'webgl') expect(await frames(page)).toBeGreaterThan(before);

  await scene(page).locator('[data-motion-toggle]').click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  await page.waitForTimeout(400);
  const paused = await frames(page);
  await page.waitForTimeout(400);
  expect(await frames(page)).toBe(paused);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(altitude).toBeLessThan(0.05);

  await scene(page).locator('[data-motion-toggle]').click();
  await scene(page).locator('[data-theme-choice="medieval"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'medieval');
  await expect(page.locator('.world-transition')).not.toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }));
  await expect
    .poll(() =>
      sky(page).evaluate((el) => el.style.getPropertyValue('--sk-alt')),
    )
    .toBe('');
  const resting = await frames(page);
  await page.waitForTimeout(400);
  expect(await frames(page)).toBe(resting);
});

test('Sky wind pushes the near clouds and scatters the flock without covering content', async ({
  page,
}) => {
  await enterSky(page);
  await page.waitForTimeout(800);
  for (const target of [
    sky(page).getByRole('heading', { level: 1 }),
    sky(page).getByRole('link', { name: 'Get in touch', exact: true }),
    sky(page).getByRole('button', { name: /medieval/i }),
  ]) {
    const box = (await target.boundingBox())!;
    expect(
      await page.evaluate(
        ([x, y]) => {
          const hit = document.elementFromPoint(x, y);
          return Boolean(hit && !hit.closest('.sk-stage'));
        },
        [box.x + box.width / 2, box.y + box.height / 2],
      ),
    ).toBeTruthy();
  }
  const cloud = sky(page).locator('.sk-near-l .sk-cloud');
  const birds = sky(page).locator('.sk-bird');
  await expect(birds).toHaveCount(9);
  const positions = () =>
    birds.evaluateAll((els) =>
      els.map((el) => (el as HTMLElement).style.transform),
    );
  const before = await positions();
  await page.mouse.move(200, 500);
  for (let step = 0; step < 12; step += 1) {
    await page.mouse.move(200 + step * 70, 500 - step * 10, { steps: 2 });
  }
  await expect
    .poll(() =>
      cloud.evaluate((el) => {
        const match = getComputedStyle(el).transform.match(/matrix\(([^)]+)\)/);
        return match ? Math.abs(Number(match[1].split(',')[4])) : 0;
      }),
    )
    .toBeGreaterThan(2);
  await expect.poll(positions).not.toEqual(before);
  expect(
    await birds.evaluateAll((els) =>
      els.every((el) => el.getBoundingClientRect().top < innerHeight * 0.6),
    ),
  ).toBeTruthy();
});

test('Sky is complete and still under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enterSky(page);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  await expect(sky(page).getByRole('heading', { level: 1 })).toHaveCSS(
    'opacity',
    '1',
  );
  const first = await frames(page);
  await page.waitForTimeout(500);
  expect(await frames(page)).toBe(first);
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
  await expect
    .poll(() =>
      sky(page).evaluate((el) =>
        Number.parseFloat(el.style.getPropertyValue('--sk-alt') || '0'),
      ),
    )
    .toBeGreaterThan(0.1);
  const stillFrame = await frames(page);
  await page.waitForTimeout(400);
  expect(await frames(page)).toBe(stillFrame);
  await expect(sky(page).locator('.sk-bird svg').first()).toHaveCSS(
    'animation-name',
    'none',
  );
});

test('Sky shutter covers the viewport when the scenes swap', async ({
  page,
}) => {
  await page.goto('./');
  const coverage = await page.evaluate(
    () =>
      new Promise<{ left: number; right: number; width: number }>((resolve) => {
        const observer = new MutationObserver(() => {
          if (document.documentElement.dataset.theme === 'sky') {
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
            '[data-scene="medieval"] [data-theme-choice="sky"]',
          )!
          .click();
      }),
  );
  expect(coverage.left).toBeLessThanOrEqual(1);
  expect(coverage.right).toBeGreaterThanOrEqual(coverage.width - 1);
  await expect(page.locator('.world-transition')).not.toBeVisible();
});
