// No screen may scroll sideways, at phone, small-phone, tablet and desktop widths.
import { test, expect, go, SEED } from './helpers.ts';

const SCREENS = ['/', '/closet', `/piece/${SEED.greenSaree}`, '/add', '/review', `/studio?with=${SEED.navySaree},${SEED.magentaBlouse}`, '/looks', '/plan', '/trips', '/care', '/insights', '/more', '/more/categories', '/more/trash', '/more/backup', '/print'];

for (const width of [320, 768, 1024]) {
  test(`no horizontal overflow @${width}px`, async ({ app: page }) => {
    await page.setViewportSize({ width, height: 900 });
    const bad: string[] = [];
    for (const s of SCREENS) {
      await go(page, s);
      await page.waitForTimeout(300);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (sw > 1) bad.push(`${s}: +${sw}px`);
    }
    expect(bad).toEqual([]);
  });
}

test('a very long unbroken piece name wraps instead of widening the page', async ({ app: page }) => {
  await go(page, `/piece/${SEED.greenSaree}`);
  await page.getByTestId('piece-edit').click();
  await page.getByTestId('item-name').fill('A'.repeat(300));
  await page.getByTestId('item-save').click();
  const bad: string[] = [];
  for (const s of [`/piece/${SEED.greenSaree}`, '/closet', '/insights', '/print', `/studio?with=${SEED.greenSaree}`]) {
    await go(page, s);
    await page.waitForTimeout(300);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (sw > 1) bad.push(`${s}: +${sw}px`);
  }
  expect(bad).toEqual([]);
});
