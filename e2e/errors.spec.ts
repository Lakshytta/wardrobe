import { test, expect, tap } from './helpers.ts';

test.use({ serviceWorkers: 'block' });

test('error states: failed first load and a screen that cannot load', async ({ page }) => {
  await page.goto('/?fail=load#/');
  await expect(page.getByText('Something went wrong')).toBeVisible();
  await tap(page, 'reload');
  await expect(page.getByText('Something went wrong')).toBeVisible(); // still failing: same URL
  await page.goto('/#/');
  await expect(page.getByTestId('profile-switcher')).toContainText('My Wardrobe');
  await page.route(/assets\/Insights-.*\.js$/, (r) => r.abort());
  await tap(page, 'nav-more');
  await tap(page, 'more-insights');
  await expect(page.getByText('This screen could not open')).toBeVisible();
  await page.unroute(/assets\/Insights-.*\.js$/);
  await tap(page, 'error-retry');
  await expect(page.locator('h1')).toContainText('Insights');
});
