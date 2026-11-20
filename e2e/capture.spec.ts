import { test, expect, tap, go, markUsed } from './helpers.ts';

test('gallery upload → auto-tag → review → accept / edit / discard', async ({ app: page }) => {
  await tap(page, 'nav-add');
  await tap(page, 'capture-cat-blouses');
  await expect(page.getByTestId('capture-cat-blouses')).toHaveAttribute('aria-checked', 'true');
  await tap(page, 'capture-cat-sarees');
  const chooser = page.waitForEvent('filechooser');
  await tap(page, 'capture-gallery');
  await (await chooser).setFiles(['e2e/fixtures/new-piece.jpg', 'e2e/fixtures/new-piece.jpg']);
  // the second copy is a duplicate of the first in the same batch
  await expect(page.getByRole('dialog')).toContainText('Is this already in your wardrobe?');
  await tap(page, 'dupe-skip');
  await expect(page.locator('h1')).toHaveText('Check new photos');
  const cards = page.locator('[data-testid^="v-review-"]');
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText(/saree/i);
  await expect(cards.first()).toContainText(/mustard|yellow/i);
  const id = (await cards.first().getAttribute('data-testid'))!.replace('v-review-', '');
  await tap(page, `review-edit-${id}`);
  await page.getByTestId('item-name').fill('Mustard saree with maroon border');
  await tap(page, 'item-save');
  await expect(page.getByText('All checked')).toBeVisible();
  await tap(page, 'review-closet');
  await expect(page.getByTestId('v-result-count')).toHaveText('All 32 pieces');
  await go(page, '/review');
  await tap(page, 'review-add-more');
  await expect(page.getByTestId('capture-cat-sarees')).toHaveAttribute('aria-checked', 'true');
});

test('duplicate-photo warning against the existing wardrobe, add anyway, accept all, discard', async ({ app: page }) => {
  await tap(page, 'nav-add');
  await tap(page, 'capture-cat-sarees');
  const chooser = page.waitForEvent('filechooser');
  await tap(page, 'capture-gallery');
  await (await chooser).setFiles(['e2e/fixtures/dupe-of-green-saree.jpg', 'e2e/fixtures/new-piece.jpg', 'e2e/fixtures/not-a-photo.txt']);
  await expect(page.getByRole('dialog')).toContainText('Bottle green Parsi gara saree');
  await tap(page, 'dupe-keep');
  await expect(page.locator('[data-testid^="v-review-"]')).toHaveCount(2);
  const ids = await page.locator('[data-testid^="v-review-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.replace('v-review-', '')));
  await tap(page, `review-discard-${ids[0]}`);
  await expect(page.locator('[data-testid^="v-review-"]')).toHaveCount(1);
  await tap(page, `review-accept-${ids[1]}`);
  await expect(page.getByText('All checked')).toBeVisible();
  // the bad file was rejected with a message on the capture screen (shown before navigating)
  await tap(page, 'nav-add');
  const c2 = page.waitForEvent('filechooser');
  await tap(page, 'capture-gallery');
  await (await c2).setFiles(['e2e/fixtures/not-a-photo.txt']);
  await expect(page.getByRole('alert')).toContainText('not a photo');
  // accept-all with two new photos (generated variations)
  const c3 = page.waitForEvent('filechooser');
  await tap(page, 'capture-gallery');
  await (await c3).setFiles([{ name: 'a.png', mimeType: 'image/png', buffer: await makePng(page, '#1F2F5C') }, { name: 'b.png', mimeType: 'image/png', buffer: await makePng(page, '#C2187A', true) }]);
  if (await page.getByRole('dialog').isVisible().catch(() => false)) await tap(page, 'dupe-keep');
  await expect(page.locator('h1')).toHaveText('Check new photos');
  await tap(page, 'review-accept-all');
  await expect(page.getByText('All checked')).toBeVisible();
  await tap(page, 'nav-home');
  await tap(page, 'nav-add');
  await expect(page.getByTestId('capture-to-review')).toHaveCount(0);
});

test('in-app camera burst (fake device) → review queue', async ({ app: page }) => {
  await tap(page, 'nav-add');
  await tap(page, 'capture-cat-blouses');
  await tap(page, 'capture-camera');
  await expect(page.locator('video')).toBeVisible();
  await page.waitForFunction(() => (document.querySelector('video') as HTMLVideoElement)?.videoWidth > 0);
  await tap(page, 'camera-snap');
  await page.waitForTimeout(300);
  await tap(page, 'camera-snap');
  await expect(page.getByTestId('camera-done')).toContainText('(2)');
  await tap(page, 'camera-done');
  // fake-camera frames are near-identical, so the second is flagged as a duplicate
  const dlg = page.getByRole('dialog');
  if (await dlg.isVisible().catch(() => false)) await tap(page, 'dupe-keep');
  await expect(page.locator('h1')).toHaveText('Check new photos');
  await expect(page.locator('[data-testid^="v-review-"]').first()).toContainText(/blouse/i);
  await tap(page, 'nav-home');
  await tap(page, 'home-review');
  await expect(page.locator('h1')).toHaveText('Check new photos');
  await tap(page, 'nav-add');
  await tap(page, 'capture-to-review');
  await tap(page, 'nav-add');
  await tap(page, 'capture-camera');
  await tap(page, 'camera-cancel');
  await expect(page.getByTestId('capture-camera')).toBeVisible();
  markUsed('dupe-keep');
});

async function makePng(page: import('@playwright/test').Page, colour: string, stripes = false): Promise<Buffer> {
  const b64 = await page.evaluate(([c, s]) => {
    const cv = document.createElement('canvas'); cv.width = 640; cv.height = 480;
    const x = cv.getContext('2d')!; x.fillStyle = '#f2f2f0'; x.fillRect(0, 0, 640, 480);
    x.fillStyle = c as string; x.fillRect(140, 80, 360, 320);
    if (s) { x.fillStyle = '#f2f2f0'; x.fillRect(0, 0, 640, 480); x.fillStyle = c as string; x.beginPath(); x.arc(160, 360, 150, 0, 7); x.fill(); x.fillStyle = '#C9A24B'; for (let i = 0; i < 6; i++) x.fillRect(300 + i * 50, 0, 18, 200); }
    return cv.toDataURL('image/png').split(',')[1];
  }, [colour, stripes]);
  return Buffer.from(b64, 'base64');
}
