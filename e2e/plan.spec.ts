import { test, expect, tap, choose, fill, go, SEED } from './helpers.ts';

async function makeLook(page: import('@playwright/test').Page, name: string) {
  await go(page, `/studio?with=${SEED.greenSaree},${SEED.ivoryGoldBlouse}`);
  await tap(page, 'studio-save');
  await fill(page, 'look-name', name);
  await tap(page, 'look-save');
  await expect(page.locator('h1')).toHaveText(name);
}

test('event: create → plan look in studio → mark worn → repeat warning', async ({ app: page }) => {
  await tap(page, 'nav-plan');
  await tap(page, 'plan-new');
  await fill(page, 'event-title', "Riya's wedding");
  await fill(page, 'event-date', '2026-12-12');
  await choose(page, 'event-occasion', 'Wedding');
  await fill(page, 'event-people', 'Sharma family, Riya');
  await fill(page, 'event-notes', 'Evening ceremony');
  await tap(page, 'event-save');
  await expect(page.locator('h1')).toHaveText("Riya's wedding");
  await expect(page.getByText('No outfit planned yet.')).toBeVisible();
  await expect(page.getByTestId('event-mark-worn')).toBeDisabled();
  await tap(page, 'event-build-look');
  await expect(page.getByText(/Planning for/)).toBeVisible();
  await expect(page.getByTestId('studio-occasion')).toHaveValue('Wedding');
  await tap(page, `tray-${SEED.greenSaree}`);
  await tap(page, 'slot-top');
  await tap(page, `tray-${SEED.ivoryGoldBlouse}`);
  await tap(page, 'studio-stylecheck');
  expect(Number(await page.getByTestId('v-score').textContent())).toBeGreaterThanOrEqual(8);
  await tap(page, 'studio-save');
  await fill(page, 'look-name', 'Green & gold');
  await tap(page, 'look-save');
  await expect(page.locator('h1')).toHaveText("Riya's wedding");
  await expect(page.getByText('Green & gold', { exact: true })).toBeVisible();
  await tap(page, 'event-mark-worn');
  await expect(page.getByText(/Worn on/)).toBeVisible();
  await tap(page, 'event-unworn');
  await tap(page, 'event-mark-worn');
  // second event with the same people → repeat warning
  await tap(page, 'event-back');
  await tap(page, 'plan-new');
  await fill(page, 'event-title', 'Sharma Diwali party');
  await fill(page, 'event-date', '2027-08-01');
  await fill(page, 'event-people', 'Sharma family');
  await tap(page, 'event-save');
  await tap(page, 'event-pick-look');
  await expect(page.getByRole('dialog')).toContainText('Same people saw it');
  await tap(page, (await page.locator('[data-testid^="pick-look-"]').first().getAttribute('data-testid'))!);
  await expect(page.getByTestId('v-event-repeat')).toContainText('Sharma family');
  // and in the studio for this event
  await tap(page, 'event-build-look');
  await expect(page.getByTestId('v-repeat-warning')).toContainText('Sharma family');
  await tap(page, 'studio-event-back');
  await tap(page, 'event-open-look');
  const ev = page.locator('[data-testid^="look-event-"]').first();
  await tap(page, (await ev.getAttribute('data-testid'))!);
  await expect(page.locator('h1')).toHaveText(/wedding|Diwali/i);
  // edit & delete with undo
  await tap(page, 'event-edit');
  await fill(page, 'event-title', 'Sharma Diwali dinner');
  await tap(page, 'event-save');
  await expect(page.locator('h1')).toHaveText(/dinner|wedding/);
  await tap(page, 'event-delete');
  await tap(page, 'toast-undo');
  await expect(page.locator('[data-testid^="event-"]').first()).toBeVisible();
});

test('recent-wear guard within 90 days without shared people', async ({ app: page }) => {
  await makeLook(page, 'Green look');
  await tap(page, 'look-worn'); // worn today
  await tap(page, 'look-plan');
  await fill(page, 'event-title', 'Kitty party');
  const soon = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  await fill(page, 'event-date', soon);
  await tap(page, 'event-save');
  await expect(page.getByTestId('v-event-repeat')).toContainText('days');
});

test('calendar: months, day select, add on a day, piece link from event, empty states', async ({ app: page }) => {
  await tap(page, 'nav-plan');
  await expect(page.getByText('No events coming up')).toBeVisible();
  await tap(page, 'plan-empty-new');
  await tap(page, 'sheet-close');
  await tap(page, 'cal-next');
  await tap(page, 'cal-prev');
  const day = page.locator('[data-testid^="cal-day-"]').nth(17);
  const dayId = (await day.getAttribute('data-testid'))!;
  await tap(page, dayId);
  await expect(page.getByText('Nothing planned on this day.')).toBeVisible();
  await tap(page, 'plan-add-on-day');
  await expect(page.getByTestId('event-date')).toHaveValue(dayId.replace('cal-day-', ''));
  await fill(page, 'event-title', 'Puja at home');
  await choose(page, 'event-look', '');
  await tap(page, 'event-save');
  await tap(page, 'event-back');
  await tap(page, dayId);
  await tap(page, (await page.locator('[data-testid^="event-"]').filter({ hasText: 'Puja at home' }).first().getAttribute('data-testid'))!);
  await go(page, '/event/nope');
  await tap(page, 'event-missing-back');
  await go(page, '/look/nope');
  await expect(page.getByText('Look not found')).toBeVisible();
  // home shows the upcoming event
  await makeLook(page, 'For puja');
  await tap(page, 'look-plan');
  await fill(page, 'event-title', 'Navratri');
  await fill(page, 'event-date', '2099-10-01');
  await tap(page, 'event-save');
  const pieceTile = page.locator('[data-testid^="event-piece-"]').first();
  await tap(page, (await pieceTile.getAttribute('data-testid'))!);
  await expect(page.getByTestId('piece-back')).toBeVisible();
  await tap(page, 'nav-home');
  const he = page.locator('[data-testid^="home-event-"]').first();
  await tap(page, (await he.getAttribute('data-testid'))!);
  await expect(page.locator('h1')).toHaveText('Navratri');
});

test('trips: create, packing list, tick, share, edit, delete', async ({ app: page }) => {
  for (const [t, d, o] of [['Mehendi', '2099-12-10', 'Mehendi'], ['Sangeet', '2099-12-11', 'Sangeet'], ['Wedding', '2099-12-12', 'Wedding']]) {
    await go(page, '/plan?new=1');
    await fill(page, 'event-title', t); await fill(page, 'event-date', d); await choose(page, 'event-occasion', o);
    await tap(page, 'event-save');
  }
  await tap(page, 'nav-plan');
  await tap(page, 'plan-trips');
  await expect(page.getByText('No trips yet')).toBeVisible();
  await tap(page, 'trip-empty-new');
  await tap(page, 'sheet-close');
  await tap(page, 'trip-new');
  await fill(page, 'trip-name', 'Jaipur wedding');
  await fill(page, 'trip-start', '2099-12-09');
  await fill(page, 'trip-end', '2099-12-13');
  const ev = page.locator('[data-testid^="trip-event-"]');
  await expect(ev).toHaveCount(3);
  const firstEv = (await ev.first().getAttribute('data-testid'))!;
  await tap(page, firstEv);
  await tap(page, firstEv);
  await tap(page, 'trip-save');
  await expect(page.locator('h1')).toHaveText('Jaipur wedding');
  await tap(page, 'trip-generate');
  await expect(page.getByTestId('v-trip-why')).toContainText('outfit');
  const boxes = page.locator('[data-testid^="pack-"]');
  expect(await boxes.count()).toBeGreaterThan(3);
  const b0 = (await boxes.first().getAttribute('data-testid'))!;
  await tap(page, b0);
  await expect(page.getByTestId(b0)).toBeChecked();
  await tap(page, 'trip-generate'); // regenerate keeps ticks
  await expect(page.getByTestId(b0)).toBeChecked();
  await tap(page, 'trip-share');
  await expect(page.locator('.toast').last()).toContainText(/copied|saved/);
  const tp = page.locator('[data-testid^="trip-piece-"]').first();
  await tap(page, (await tp.getAttribute('data-testid'))!);
  await tap(page, 'piece-back');
  await tap(page, 'trip-edit');
  await fill(page, 'trip-name', 'Jaipur shaadi');
  await tap(page, 'trip-save');
  await expect(page.locator('h1')).toHaveText('Jaipur shaadi');
  await tap(page, 'trip-back');
  await tap(page, (await page.locator('[data-testid^="trip-"]').filter({ hasText: 'Jaipur shaadi' }).first().getAttribute('data-testid'))!);
  await tap(page, 'trip-delete');
  await tap(page, 'toast-undo');
  await expect(page.getByText('Jaipur shaadi')).toBeVisible();
  await go(page, '/trip/nope');
  await tap(page, 'trip-missing-back');
});
