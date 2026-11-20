import { test, expect, tap, fill, go, SEED } from './helpers.ts';

test('browse by category tile, colour, occasion, season, fabric, favourites', async ({ app: page }) => {
  await tap(page, 'nav-closet');
  await expect(page.getByTestId('v-result-count')).toHaveText('All 31 pieces');
  await tap(page, 'cat-tile-sarees');
  await expect(page.getByTestId('v-result-count')).toHaveText('7 matches');
  await tap(page, 'filter-chip-cat-sarees');
  await expect(page.getByTestId('v-result-count')).toHaveText('All 31 pieces');
  await tap(page, 'color-chip-green');
  await expect(page.getByTestId('v-result-count')).toHaveText('5 matches');
  await tap(page, 'closet-toggle-filters');
  await tap(page, 'occ-chip-wedding');
  await expect(page.getByTestId('v-result-count')).toHaveText('5 matches');
  await tap(page, 'season-chip-all-season');
  await tap(page, 'fabric-chip-georgette');
  await expect(page.getByTestId('v-result-count')).toHaveText('1 match');
  await expect(page.getByTestId(`tile-${SEED.greenSaree}`)).toBeVisible();
  await tap(page, 'filter-clear');
  await tap(page, 'fav-chip');
  await expect(page.getByText('Nothing matches')).toBeVisible();
  await tap(page, 'closet-empty-clear');
  await expect(page.getByTestId('v-result-count')).toHaveText('All 31 pieces');
  for (const id of ['occ-chip-mehendi', 'occ-chip-mehendi', 'season-chip-summer', 'season-chip-summer', 'fabric-chip-silk', 'fabric-chip-silk']) await tap(page, id);
  await expect(page.getByTestId('v-result-count')).toHaveText('All 31 pieces');
});

test('plain-language search turns into removable chips', async ({ app: page }) => {
  await tap(page, 'nav-closet');
  await fill(page, 'closet-search', 'green for mehendi');
  await tap(page, 'closet-search-go');
  await expect(page.getByTestId('filter-chip-color-green')).toBeVisible();
  await expect(page.getByTestId('filter-chip-occ-mehendi')).toBeVisible();
  await expect(page.getByTestId(`tile-${SEED.greenSaree}`)).toBeVisible();
  await tap(page, 'filter-chip-occ-mehendi');
  await expect(page.getByTestId('filter-chip-occ-mehendi')).toHaveCount(0);
  await tap(page, 'filter-clear');
  await fill(page, 'closet-search', 'navy blouse');
  await page.getByTestId('closet-search').press('Enter');
  await expect(page.getByTestId('v-result-count')).toHaveText('1 match');
  await expect(page.getByText('Navy brocade-yoke blouse')).toBeVisible();
  await tap(page, 'filter-clear');
  await fill(page, 'closet-search', 'chikenkari');
  await tap(page, 'closet-search-go');
  await expect(page.getByTestId('filter-chip-t-chikenkari')).toBeVisible();
  await expect(page.getByTestId('v-result-count')).toHaveText('2 matches');
  await tap(page, 'filter-chip-t-chikenkari');
  await go(page, '/closet?fav=1');
  await expect(page.getByTestId('filter-chip-fav-1')).toBeVisible();
  await tap(page, 'filter-chip-fav-1');
});

test('grid and one-by-one views', async ({ app: page }) => {
  await tap(page, 'nav-closet');
  await tap(page, 'cat-tile-blouses');
  await tap(page, 'view-one');
  await expect(page.getByText('1 of 10')).toBeVisible();
  await tap(page, 'one-next');
  await expect(page.getByText('2 of 10')).toBeVisible();
  await tap(page, 'one-prev');
  await expect(page.getByText('1 of 10')).toBeVisible();
  await tap(page, 'one-open');
  await expect(page.getByTestId('piece-back')).toBeVisible();
  await tap(page, 'piece-back');
  await tap(page, 'view-grid');
  await expect(page.locator('[data-testid^="tile-"]').first()).toBeVisible();
});
