// A double-tap on Save must create one record, not two.
import { test, expect, go } from './helpers.ts';

test('double-tap Save creates one event, trip, category and profile', async ({ app: page }) => {
  const t = (id: string) => page.getByTestId(id).first();

  await go(page, '/plan');
  await t('plan-new').click();
  await t('event-title').fill('Tap twice event');
  await t('event-save').dblclick();
  await page.waitForTimeout(500);
  await go(page, '/plan');
  const events = await page.$$eval('a[href^="#/event/"]', (as) => new Set(as.filter((a) => a.textContent!.includes('Tap twice event')).map((a) => a.getAttribute('href'))).size);
  expect(events).toBe(1);

  await go(page, '/trips');
  await t('trip-new').click();
  await t('trip-name').fill('Tap twice trip');
  await t('trip-save').dblclick();
  // the sheet closes instantly; on phones the second click can land on the nav below, so only count records
  await page.waitForTimeout(500);
  await go(page, '/trips');
  const trips = await page.$$eval('a[href^="#/trip/"]', (as) => new Set(as.filter((a) => a.textContent!.includes('Tap twice trip')).map((a) => a.getAttribute('href'))).size);
  expect(trips).toBe(1);

  await go(page, '/more/categories');
  await t('cat-add').click();
  await t('cat-name').fill('Tap twice');
  await t('cat-save').dblclick();
  await go(page, '/more/categories');
  await expect(page.locator('[data-testid^="cat-edit-tap-twice"]')).toHaveCount(1);
  await page.waitForTimeout(300);
  await expect(page.locator('[data-testid^="cat-edit-tap-twice"]')).toHaveCount(1);

  await go(page, '/');
  await t('profile-switcher').click();
  await t('profile-add').click();
  await t('profile-name').fill('Tap twice person');
  await t('profile-save').dblclick();
  await expect(t('profile-switcher')).toContainText('Tap twice person');
  await t('profile-switcher').click();
  await expect(page.locator('[data-testid^="profile-pick-"]', { hasText: 'Tap twice person' })).toHaveCount(1);
});
