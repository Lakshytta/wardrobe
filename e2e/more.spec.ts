import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect, tap, choose, fill, go, SEED } from './helpers.ts';

test('categories: add, rename, change slot, reorder, delete', async ({ app: page }) => {
  await tap(page, 'nav-more');
  await tap(page, 'more-categories');
  await tap(page, 'cat-add');
  await fill(page, 'cat-name', 'Potli bags');
  await choose(page, 'cat-slot', 'accessory');
  await tap(page, 'cat-save');
  await expect(page.getByText('Potli bags')).toBeVisible();
  await tap(page, 'cat-edit-potli-bags');
  await fill(page, 'cat-name', 'Potlis');
  await choose(page, 'cat-slot', 'layer');
  await tap(page, 'cat-save');
  await expect(page.getByText('Dupatta / layer · 0 pieces').last()).toBeVisible();
  await tap(page, 'cat-up-potli-bags');
  await expect.poll(async () => { const n = await page.locator('.listrow .t').allTextContents(); return n.length - n.indexOf('Potlis'); }).toBe(2);
  await tap(page, 'cat-down-potli-bags');
  await tap(page, 'cat-edit-sarees');
  await fill(page, 'cat-name', 'Saris');
  await tap(page, 'cat-save');
  await expect(page.getByText('Saris')).toBeVisible();
  await tap(page, 'cat-down-sarees');
  await tap(page, 'cat-del-potli-bags');
  await expect(page.locator('.listrow .t', { hasText: 'Potlis' })).toHaveCount(0);
  await tap(page, 'toast-undo');
  await expect(page.locator('.listrow .t', { hasText: 'Potlis' })).toBeVisible();
  await tap(page, 'cat-del-potli-bags');
  // new category appears in Capture
  await tap(page, 'nav-add');
  await expect(page.getByTestId('capture-cat-sarees')).toContainText('Saris');
});

test('backup export then import round trip', async ({ app: page }) => {
  // create a look so the backup has more than items
  await go(page, `/studio?with=${SEED.greenSaree},${SEED.ivoryGoldBlouse}`);
  await tap(page, 'studio-save');
  await fill(page, 'look-name', 'Backup look');
  await tap(page, 'look-save');
  await tap(page, 'nav-more');
  await tap(page, 'more-backup');
  const dl = page.waitForEvent('download');
  await tap(page, 'backup-export');
  const file = path.join(os.tmpdir(), `wardrobe-backup-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  await (await dl).saveAs(file);
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  expect(json.app).toBe('wardrobe');
  expect(json.items).toHaveLength(31);
  expect(json.looks).toHaveLength(1);
  // destroy: purge the look and a piece
  await tap(page, 'nav-studio');
  await tap(page, 'studio-looks');
  await tap(page, (await page.locator('[data-testid^="look-"]').filter({ hasText: 'Backup look' }).first().getAttribute('data-testid'))!);
  await tap(page, 'look-delete');
  await go(page, `/piece/${SEED.rustSaree}`);
  await tap(page, 'piece-delete');
  await go(page, '/more/trash');
  await tap(page, 'trash-empty');
  await expect(page.getByText('Trash is empty')).toBeVisible();
  // import a broken file first
  await go(page, '/more/backup');
  let ch = page.waitForEvent('filechooser');
  await tap(page, 'backup-import');
  await (await ch).setFiles('e2e/fixtures/not-a-photo.txt');
  await expect(page.getByRole('alert')).toContainText('not a Wardrobe backup');
  // cancel once, then restore
  ch = page.waitForEvent('filechooser');
  await tap(page, 'backup-import');
  await (await ch).setFiles(file);
  await expect(page.getByRole('dialog')).toContainText('31 pieces');
  await tap(page, 'restore-cancel');
  ch = page.waitForEvent('filechooser');
  await tap(page, 'backup-import');
  await (await ch).setFiles(file);
  await tap(page, 'restore-confirm');
  await expect(page.locator('.toast').last()).toContainText('Restored 31 pieces, 1 looks');
  await tap(page, 'nav-closet');
  await expect(page.getByTestId('v-result-count')).toHaveText('All 31 pieces');
  await go(page, '/looks');
  await expect(page.getByText('Backup look')).toBeVisible();
});

test('insights render: most/least worn, stale, cost-per-wear, charts, gaps', async ({ app: page }) => {
  await go(page, `/piece/${SEED.greenSaree}`);
  await tap(page, 'piece-worn');
  await tap(page, 'piece-edit');
  await fill(page, 'item-price', '12000');
  await tap(page, 'item-save');
  await tap(page, 'nav-more');
  await tap(page, 'more-insights');
  await expect(page.getByTestId('v-gaps')).toContainText('No ivory or gold dupatta for festive suits');
  await expect(page.getByText('Cost per wear')).toBeVisible();
  await expect(page.getByText('₹12,000').first()).toBeVisible();
  await expect(page.getByRole('table', { name: 'Pieces by colour family' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Pieces by category' })).toBeVisible();
  await tap(page, `ins-most-${SEED.greenSaree}`);
  await expect(page.locator('h1')).toContainText('Parsi gara');
  await go(page, '/insights');
  await tap(page, (await page.locator('[data-testid^="ins-least-"]').first().getAttribute('data-testid'))!);
  await go(page, '/insights');
  await tap(page, (await page.locator('[data-testid^="ins-stale-"]').first().getAttribute('data-testid'))!);
  await expect(page.getByTestId('piece-back')).toBeVisible();
  // empty profile
  await tap(page, 'profile-switcher');
  await tap(page, 'profile-add');
  await fill(page, 'profile-name', 'Empty');
  await tap(page, 'profile-save');
  await go(page, '/insights');
  await tap(page, 'insights-add');
  await expect(page.locator('h1')).toContainText('Add photos');
});

test('print catalogue and remaining menu links', async ({ app: page }) => {
  await tap(page, 'nav-more');
  await tap(page, 'more-print');
  await expect(page.getByText('Sarees', { exact: false }).first()).toBeVisible();
  await tap(page, 'print-now');
  expect(await page.evaluate(() => (window as any).__printed)).toBe(true);
  for (const [id, h] of [['more-trips', 'Trips'], ['more-care', 'Tailor'], ['more-review', 'Check new photos']] as const) {
    await tap(page, 'nav-more');
    await tap(page, id);
    await expect(page.locator('h1')).toContainText(h);
  }
});
