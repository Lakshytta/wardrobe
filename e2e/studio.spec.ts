import { test, expect, tap, choose, fill, go, SEED } from './helpers.ts';

test('mix & match: slots, trays, colour check, style check, swap, board, export, share, save', async ({ app: page }) => {
  await tap(page, 'nav-studio');
  await choose(page, 'studio-occasion', 'Festive');
  await tap(page, 'slot-main');
  await tap(page, `tray-${SEED.navySaree}`);
  await tap(page, 'slot-top');
  await tap(page, `tray-${SEED.magentaBlouse}`);
  await expect(page.getByText('Colour check')).toBeVisible();
  await tap(page, 'slot-layer');
  await expect(page.getByText(/Nothing here is tagged|Nothing in this slot/)).toBeVisible();
  await tap(page, 'tray-fit');
  await tap(page, 'tray-fit');
  await tap(page, 'slot-accessory');
  await expect(page.getByText(/No jewellery, footwear or bags yet/)).toBeVisible();
  await tap(page, 'studio-stylecheck');
  const score1 = Number(await page.getByTestId('v-score').textContent());
  await expect(page.getByTestId('v-verdict')).toContainText('Navy saree');
  await expect(page.getByTestId('v-verdict')).toContainText('On-device tips');
  const swap = page.locator('[data-testid^="swap-apply-"]').first();
  const swapId = (await swap.getAttribute('data-testid'))!;
  await tap(page, swapId);
  await expect(page.getByTestId('v-score')).toBeVisible();
  const score2 = Number(await page.getByTestId('v-score').textContent());
  expect(score2).toBeGreaterThan(score1);
  // board, download, share
  await tap(page, 'studio-board');
  await expect(page.locator('.board-preview')).toBeVisible();
  const dl = page.waitForEvent('download');
  await tap(page, 'board-download');
  expect((await dl).suggestedFilename()).toMatch(/\.png$/);
  const dl2 = page.waitForEvent('download');
  await tap(page, 'board-share');
  await dl2; // no Web Share in headless Chromium → falls back to saving the picture
  // save
  await tap(page, 'studio-save');
  await fill(page, 'look-name', 'Navy for Diwali');
  await choose(page, 'look-occasion', 'Festive');
  await fill(page, 'look-notes', 'With pearl drops');
  await tap(page, 'look-save');
  await expect(page.locator('h1')).toHaveText('Navy for Diwali');
  await expect(page.locator('.board-preview')).toBeVisible();
  await expect(page.getByTestId('v-verdict')).toBeVisible();
});

test('shuffle, clear, preselected pieces, swap guard', async ({ app: page }) => {
  await go(page, `/studio?with=${SEED.rustSaree}`);
  await expect(page.getByTestId(`tray-${SEED.rustSaree}`)).toHaveAttribute('aria-pressed', 'true');
  await tap(page, `tray-${SEED.rustSaree}`); // toggle off
  await tap(page, `tray-${SEED.rustSaree}`); // and on again
  await tap(page, 'studio-shuffle');
  await expect(page.locator('.slot.active img, .slot img').first()).toBeVisible();
  await tap(page, 'studio-clear');
  await expect(page.getByTestId('studio-stylecheck')).toBeDisabled();
});

test('looks: list, open, edit, worn, plan, delete with undo, restore from trash', async ({ app: page }) => {
  await tap(page, 'nav-more');
  await tap(page, 'more-looks');
  await expect(page.getByText('No looks saved yet')).toBeVisible();
  await tap(page, 'looks-empty-start');
  await expect(page.getByTestId('studio-occasion')).toHaveValue('Festive');
  await tap(page, 'studio-save');
  await fill(page, 'look-name', 'Shuffled festive');
  await tap(page, 'look-save');
  await expect(page.locator('h1')).toHaveText('Shuffled festive');
  await tap(page, 'look-edit');
  await fill(page, 'look-edit-name', 'Festive favourite');
  await choose(page, 'look-edit-occasion', 'Wedding guest');
  await fill(page, 'look-edit-notes', 'Comfortable');
  await tap(page, 'look-edit-save');
  await expect(page.locator('h1')).toHaveText('Festive favourite');
  await tap(page, 'look-worn');
  await expect(page.getByText(/worn 1×/)).toBeVisible();
  const piece = page.locator('[data-testid^="look-piece-"]').first();
  await tap(page, (await piece.getAttribute('data-testid'))!);
  await expect(page.getByTestId('piece-back')).toBeVisible();
  await tap(page, 'piece-back');
  await tap(page, 'look-open-studio');
  await expect(page.locator('h1')).toContainText('Edit “Festive favourite”');
  await tap(page, 'studio-looks');
  const card = page.locator('[data-testid^="look-"]').filter({ hasText: 'Festive favourite' }).first();
  await tap(page, (await card.getAttribute('data-testid'))!);
  await tap(page, 'look-back');
  await expect(page.locator('h1')).toHaveText('My looks');
  await tap(page, 'looks-new');
  await expect(page.locator('h1')).toHaveText('Mix & Match');
  await tap(page, 'nav-home');
  const homeLook = page.locator('[data-testid^="home-look-"]').first();
  await tap(page, (await homeLook.getAttribute('data-testid'))!);
  await tap(page, 'look-delete');
  await tap(page, 'toast-undo');
  await tap(page, 'nav-home');
  await tap(page, 'home-looks');
  await expect(page.locator('.tile').filter({ hasText: 'Festive favourite' }).first()).toBeVisible();
  await tap(page, (await page.locator('[data-testid^="look-"]').filter({ hasText: 'Festive favourite' }).first().getAttribute('data-testid'))!);
  const lookUrl = page.url();
  await tap(page, 'look-delete');
  await tap(page, 'toast-dismiss');
  await page.goto(lookUrl);
  await tap(page, 'look-restore');
  await expect(page.getByText('This look is in Trash.')).toHaveCount(0);
  await tap(page, 'look-delete');
  await go(page, '/more/trash');
  const r = page.locator('[data-testid^="trash-restore-look-"]').first();
  await tap(page, (await r.getAttribute('data-testid'))!);
  await go(page, '/more/trash');
  await expect(page.getByText('Trash is empty')).toBeVisible();
  // purge a look
  await page.goto(lookUrl);
  await tap(page, 'look-delete');
  await go(page, '/more/trash');
  await tap(page, (await page.locator('[data-testid^="trash-purge-look-"]').first().getAttribute('data-testid'))!);
  await page.goto(lookUrl);
  await expect(page.getByText('Look not found')).toBeVisible();
  await tap(page, 'look-missing-back');
});
