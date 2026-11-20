import AxeBuilder from '@axe-core/playwright';
import { test, expect, go, SEED } from './helpers.ts';

const SCREENS = ['/', '/closet', `/piece/${SEED.greenSaree}`, '/add', '/review', `/studio?with=${SEED.navySaree},${SEED.magentaBlouse}`, '/looks', '/plan', '/trips', '/care', '/insights', '/more', '/more/categories', '/more/trash', '/more/backup', '/print'];

for (const s of SCREENS) {
  test(`axe: ${s}`, async ({ app: page }) => {
    await go(page, s);
    await page.waitForTimeout(400);
    if (s.startsWith('/studio')) await page.getByTestId('studio-stylecheck').click();
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(bad.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });
}

test('axe: open dialog', async ({ app: page }) => {
  await go(page, `/piece/${SEED.greenSaree}`);
  await page.getByTestId('piece-edit').click();
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
});
