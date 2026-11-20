// Screenshots for the report (one per main screen, per project).
import { test, tap, fill, go, SEED } from './helpers.ts';

test('screenshots', async ({ app: page }, info) => {
  const shot = (n: string) => page.screenshot({ path: `screenshots/${info.project.name}-${n}.png`, fullPage: false });
  await go(page, '/closet'); await page.waitForTimeout(500); await shot('closet');
  await go(page, `/piece/${SEED.greenSaree}`); await page.waitForTimeout(500); await shot('piece');
  const ch = page.waitForEvent('filechooser');
  await go(page, '/add'); await tap(page, 'capture-cat-sarees'); await tap(page, 'capture-gallery');
  await (await ch).setFiles('e2e/fixtures/new-piece.jpg');
  await page.locator('[data-testid^="v-review-"]').first().waitFor(); await shot('capture-review');
  await go(page, `/studio?with=${SEED.greenSaree},${SEED.ivoryGoldBlouse}`); await tap(page, 'studio-stylecheck');
  await page.getByTestId('v-verdict').scrollIntoViewIfNeeded(); await shot('mix-match-verdict');
  for (const [t, d, o] of [['Mehendi', '2099-12-10', 'Mehendi'], ['Wedding', '2099-12-12', 'Wedding']]) {
    await go(page, '/plan?new=1'); await fill(page, 'event-title', t); await fill(page, 'event-date', d);
    await page.getByTestId('event-occasion').selectOption(o); await tap(page, 'event-save');
  }
  await go(page, '/plan'); await tap(page, 'cal-next'); await page.waitForTimeout(200); await go(page, '/plan'); await shot('event-planner');
  await go(page, '/trips'); await tap(page, 'trip-new'); await fill(page, 'trip-name', 'Jaipur wedding');
  await fill(page, 'trip-start', '2099-12-09'); await fill(page, 'trip-end', '2099-12-13'); await tap(page, 'trip-save');
  await tap(page, 'trip-generate'); await page.getByTestId('v-trip-why').waitFor(); await shot('trip-packing');
  await go(page, '/insights'); await page.getByTestId('v-gaps').waitFor(); await shot('insights');
  await go(page, '/'); await shot('home');
});
