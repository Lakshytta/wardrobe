import { test, expect, tap } from './helpers.ts';

test('installable PWA: app shell and photos work offline; offline edits persist', async ({ app: page, context }) => {
  const manifest = await page.request.get('/manifest.webmanifest');
  expect((await manifest.json()).display).toBe('standalone');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload(); // now controlled by the service worker
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await tap(page, 'nav-closet');
  await page.waitForFunction(() => [...document.images].filter((i) => i.complete && i.naturalWidth > 0).length >= 3);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('profile-switcher')).toContainText('My Wardrobe');
  await expect(page.getByTestId('v-result-count')).toHaveText('All 31 pieces');
  await expect.poll(() => page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth > 0).length)).toBeGreaterThan(3);
  // an edit made while offline survives a reload
  await tap(page, (await page.locator('[data-testid^="tile-"]').first().getAttribute('data-testid'))!);
  await tap(page, 'piece-fav');
  await expect(page.getByTestId('piece-fav')).toHaveAttribute('aria-pressed', 'true');
  await page.waitForFunction(() => !(window as any).__memoryWrites);
  await page.reload();
  await expect(page.getByTestId('piece-fav')).toHaveAttribute('aria-pressed', 'true');
  await context.setOffline(false);
});
