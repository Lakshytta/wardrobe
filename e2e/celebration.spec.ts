import { test, expect, tap, fill, choose, go, SEED } from './helpers.ts';

test('wedding section: sub-events, dates, outfit options with bag + jewellery, final choice, packing, delete', async ({ app: page }) => {
  // create from Home
  await tap(page, 'home-new-celebration');
  await fill(page, 'celebration-name', 'Lakshu wedding');
  await fill(page, 'celebration-notes', 'Udaipur');
  await tap(page, 'celebration-save');
  await expect(page.locator('h1')).toHaveText('💍 Lakshu wedding');
  await expect(page.getByText('No events yet')).toBeVisible();
  // one-tap functions in the order the user listed
  for (const f of ['gaur', 'haldi', 'mehendi', 'welcome-lunch', 'sangeet', 'after-party', 'shaadi', 'filler-suit', 'filler-suit']) await tap(page, `quick-${f}`);
  await expect(page.locator('[data-testid^="sub-"]').filter({ hasText: /Filler suit/ })).toHaveCount(2);
  await expect(page.getByTestId('sub-filler-suit-2')).toBeVisible();
  await expect(page.getByTestId('quick-haldi')).toHaveCount(0); // already added
  // a custom one with a date
  await tap(page, 'sub-add');
  await fill(page, 'event-title', 'Mata ki chowki');
  await fill(page, 'event-date', '2099-02-10');
  await choose(page, 'event-occasion', 'Puja');
  await tap(page, 'event-save');
  await expect(page.getByTestId('sub-mata-ki-chowki')).toContainText('10 Feb 2099');
  // reorder: move it up above Filler suit 2
  await tap(page, 'sub-up-mata-ki-chowki');
  await expect.poll(async () => (await page.locator('[data-testid^="sub-"] .t').allTextContents()).slice(-2)).toEqual(['Mata ki chowki', 'Filler suit 2']);
  await tap(page, 'sub-down-mata-ki-chowki');
  await expect.poll(async () => (await page.locator('[data-testid^="sub-"] .t').allTextContents()).slice(-1)).toEqual(['Mata ki chowki']);
  // rename
  await tap(page, 'celebration-edit');
  await fill(page, 'celebration-name', "Lakshu's wedding");
  await tap(page, 'celebration-save');
  await expect(page.locator('h1')).toHaveText("💍 Lakshu's wedding");

  // Haldi: no date yet → add one
  await tap(page, 'sub-haldi');
  await expect(page.locator('h1')).toHaveText('Haldi');
  await tap(page, 'event-add-date');
  await fill(page, 'event-date', '2099-02-11');
  await tap(page, 'event-save');
  await expect(page.getByText(/11 Feb 2099/)).toBeVisible();
  // option 1 via the option editor: outfit + bag note + jewellery note
  await tap(page, 'option-add');
  await tap(page, 'option-cat-suits');
  await tap(page, 'option-cat-all');
  await tap(page, `option-pick-${SEED.greenSaree}`);
  await tap(page, `option-pick-${SEED.ivoryGoldBlouse}`);
  await tap(page, 'option-tab-bag');
  await expect(page.getByText(/No bags photographed yet/)).toBeVisible();
  await fill(page, 'option-bag-note', 'Gold potli');
  await tap(page, 'option-tab-jewellery');
  await fill(page, 'option-jewellery-note', 'Kundan set + maang tikka');
  await tap(page, 'option-tab-outfit');
  await fill(page, 'option-note', 'Iron the pleats');
  await expect(page.getByTestId('v-option-summary')).toContainText('Style score');
  await tap(page, 'option-save');
  const opt1 = page.locator('[data-testid^="v-option-"]').first();
  await expect(opt1).toContainText('Gold potli');
  await expect(opt1).toContainText('Kundan set');
  // option 2 built in Mix & Match
  await tap(page, 'event-build-option');
  await expect(page.getByText(/Planning for/)).toBeVisible();
  await tap(page, `tray-${SEED.redAnarkali}`);
  await tap(page, 'studio-add-option');
  await expect(page.locator('h1')).toHaveText('Haldi');
  await expect(page.locator('[data-testid^="v-option-"]')).toHaveCount(2);
  // edit option 2, cancel an edit, delete with undo
  const opt2Id = (await page.locator('[data-testid^="v-option-"]').nth(1).getAttribute('data-testid'))!.replace('v-option-', '');
  await tap(page, `option-edit-${opt2Id}`);
  await tap(page, 'option-cancel');
  await tap(page, `option-delete-${opt2Id}`);
  await expect(page.locator('[data-testid^="v-option-"]')).toHaveCount(1);
  await tap(page, 'toast-undo');
  await expect(page.locator('[data-testid^="v-option-"]')).toHaveCount(2);
  // choose option 1 as final, toggle, choose again
  const opt1Id = (await opt1.getAttribute('data-testid'))!.replace('v-option-', '');
  await tap(page, `option-choose-${opt1Id}`);
  await expect(opt1).toContainText('⭐ Final choice');
  await tap(page, `option-choose-${opt1Id}`);
  await expect(opt1).not.toContainText('⭐ Final choice');
  await tap(page, `option-choose-${opt1Id}`);
  await tap(page, `option-piece-${SEED.greenSaree}`);
  await expect(page.locator('h1')).toContainText('Parsi gara');
  await page.goBack();

  // Mehendi: same green saree → warned it is already the Haldi pick
  await tap(page, 'event-back');
  await tap(page, 'sub-mehendi');
  await tap(page, 'option-add');
  await tap(page, `option-pick-${SEED.greenSaree}`);
  await tap(page, 'option-save');
  await expect(page.getByText(/already your pick for Haldi/)).toBeVisible();

  // back to the wedding page: progress, home card and chips
  await tap(page, 'event-back');
  await expect(page.getByText('1 of 10 outfits decided')).toBeVisible();
  await tap(page, 'celebration-back');
  const card = page.locator('[data-testid^="home-celebration-"]');
  await expect(card).toContainText("Lakshu's wedding");
  await expect(card).toContainText('1 of 10 outfits decided');
  const chip = page.locator('[data-testid^="home-sub-"]').filter({ hasText: 'Haldi' });
  await expect(chip).toContainText('⭐');
  await tap(page, (await chip.getAttribute('data-testid'))!);
  // mark the Haldi outfit as worn → wear history
  await tap(page, 'event-mark-worn');
  await expect(page.getByText(/Worn on/)).toBeVisible();
  await tap(page, 'event-back');

  // packing list from final choices
  await tap(page, 'celebration-pack');
  await expect(page.locator('h1')).toHaveText("Lakshu's wedding – packing");
  await expect(page.getByTestId('v-trip-why')).toContainText('Still to decide');
  await expect(page.getByText('Bag for Haldi: Gold potli')).toBeVisible();

  // delete the whole section, then undo
  await tap(page, 'nav-home');
  await tap(page, (await card.getAttribute('data-testid'))!);
  const url = page.url();
  await tap(page, 'celebration-delete');
  await expect(page.locator('[data-testid^="home-celebration-"]')).toHaveCount(0);
  await tap(page, 'toast-undo');
  await expect(page.locator('[data-testid^="home-celebration-"]')).toHaveCount(1);
  await page.goto(url);
  await expect(page.locator('[data-testid^="sub-"] .t')).toHaveCount(10);
  await tap(page, 'celebration-delete');
  await tap(page, 'toast-dismiss');
  await page.goto(url);
  await expect(page.getByText('Not found')).toBeVisible();
  await tap(page, 'celebration-missing-home');
  await expect(page.locator('[data-testid^="home-celebration-"]')).toHaveCount(0);
});

test('undated sub-events do not break Plan, Home or trips', async ({ app: page }) => {
  await tap(page, 'home-new-celebration');
  await fill(page, 'celebration-name', 'Test wedding');
  await tap(page, 'celebration-save');
  await tap(page, 'quick-sangeet');
  await go(page, '/plan');
  await expect(page.locator('h1')).toHaveText('Plan');
  await go(page, '/trips');
  await tap(page, 'trip-new');
  await fill(page, 'trip-name', 'x');
  await tap(page, 'trip-save');
  await tap(page, 'trip-generate');
  await expect(page.getByTestId('v-trip-why')).toBeVisible();
  await go(page, '/more/backup');
  const dl = page.waitForEvent('download');
  await tap(page, 'backup-export');
  await dl;
});
