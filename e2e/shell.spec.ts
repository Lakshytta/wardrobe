import { test, expect, tap, fill, go } from './helpers.ts';

test('bottom nav, brand, more menu and not-found', async ({ app: page }) => {
  for (const [id, h] of [['nav-closet', 'Closet'], ['nav-add', 'Add photos'], ['nav-studio', 'Mix & Match'], ['nav-plan', 'Plan'], ['nav-more', 'More'], ['nav-home', 'My Wardrobe']] as const) {
    await tap(page, id);
    await expect(page.locator('h1').first()).toContainText(h);
  }
  await tap(page, 'brand-home');
  await expect(page).toHaveURL(/#\/$/);
  await page.getByTestId('skip-link').focus();
  await expect(page.getByTestId('skip-link')).toBeVisible(); // becomes visible on focus
  await tap(page, 'skip-link');
  await expect(page.locator('#main')).toBeFocused();
  await go(page, '/nowhere');
  await expect(page.getByText('Page not found')).toBeVisible();
  await tap(page, 'notfound-home');
  await expect(page.locator('h1')).toContainText('My Wardrobe');
});

test('profiles: add, switch, edit, recolour', async ({ app: page }) => {
  await tap(page, 'profile-switcher');
  await tap(page, 'profile-add');
  await fill(page, 'profile-name', 'Mum');
  await tap(page, 'profile-color-C2187A');
  await tap(page, 'profile-emoji-3');
  await tap(page, 'profile-save');
  await expect(page.getByTestId('profile-switcher')).toContainText('Mum');
  // empty wardrobe for the new profile
  await tap(page, 'nav-closet');
  await expect(page.getByText('Your closet is empty')).toBeVisible();
  await tap(page, 'closet-empty-add');
  await expect(page.locator('h1')).toContainText('Add photos');
  // edit Mum
  await tap(page, 'profile-switcher');
  const mumEdit = page.locator('[data-testid^="profile-edit-"]').last();
  const mumId = (await mumEdit.getAttribute('data-testid'))!;
  await tap(page, mumId);
  await fill(page, 'profile-name', 'Mummy');
  await tap(page, 'profile-color-1E7A4A');
  await tap(page, 'profile-save');
  await tap(page, 'profile-switcher');
  await expect(page.getByRole('dialog')).toContainText('Mummy');
  // switch back to My Wardrobe
  await tap(page, 'profile-pick-5eed0000-0000-4000-8000-000000000001');
  await expect(page.getByTestId('profile-switcher')).toContainText('My Wardrobe');
  await tap(page, 'nav-closet');
  await expect(page.getByTestId('v-result-count')).toContainText('31');
  // close sheet via X
  await tap(page, 'profile-switcher');
  await tap(page, 'sheet-close');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // add from More
  await tap(page, 'nav-more');
  await tap(page, 'more-add-profile');
  await fill(page, 'profile-name', 'Riya');
  await tap(page, 'profile-save');
  await expect(page.getByTestId('profile-switcher')).toContainText('Riya');
});

test('theme: light, dark and auto', async ({ app: page }) => {
  await tap(page, 'nav-more');
  await tap(page, 'theme-dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await tap(page, 'theme-light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await tap(page, 'theme-auto');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
});

test('home quick actions', async ({ app: page }) => {
  for (const [id, h] of [['home-add', 'Add photos'], ['home-plan', 'Plan'], ['home-closet', 'Closet'], ['home-plan-all', 'Plan'], ['home-plan-empty', 'Plan'], ['home-favs', 'Closet'], ['home-what-to-wear', 'Mix & Match']] as const) {
    await tap(page, 'nav-home');
    await tap(page, id);
    await expect(page.locator('h1').first()).toContainText(h);
    if (await page.getByRole('dialog').isVisible()) await tap(page, 'sheet-close');
  }
  // what-to-wear shuffles a Daily look
  await expect(page.getByTestId('studio-occasion')).toHaveValue('Daily');
});
