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

test('axe: wedding section, sub-event with options, option editor', async ({ app: page }) => {
  const scan = async () => {
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  };
  await page.getByTestId('home-new-celebration').click();
  await page.getByTestId('celebration-name').fill('Lakshu wedding');
  await page.getByTestId('celebration-save').click();
  await page.getByTestId('quick-haldi').click();
  await page.getByTestId('quick-shaadi').click();
  await scan();
  await page.getByTestId('sub-haldi').click();
  await page.getByTestId('option-add').click();
  await page.getByTestId(`option-pick-${SEED.greenSaree}`).click();
  await scan();
  await page.getByTestId('option-save').click();
  await scan();
  await page.goto('/#/');
  await scan();
});
