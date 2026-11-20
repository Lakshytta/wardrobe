// Live check of the "Lakshu wedding" section on the deployed site (read-only, except one temporary
// outfit option on Haldi that it removes again). Usage: node scripts/live-verify-wedding.mjs <url> <shots-dir>
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.argv[2]; const OUT = process.argv[3] ?? 'screenshots/live';
fs.mkdirSync(OUT, { recursive: true });
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const browser = await chromium.launch({ proxy: proxy ? { server: proxy } : undefined });
const errors = [];
const ok = (c, m) => { if (!c) throw new Error('FAILED: ' + m); console.log('✓', m); };
for (const [w, h, tag] of [[390, 844, '390'], [1280, 800, '1280']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(`${BASE}/#/`);
  const card = p.locator('[data-testid^="home-celebration-"]').first();
  await card.waitFor({ timeout: 20000 });
  ok((await card.innerText()).includes('Lakshu wedding'), `[${tag}] Home shows the Lakshu wedding card`);
  await p.screenshot({ path: `${OUT}/live-${tag}-home-wedding.png` });
  await card.click();
  await p.locator('h1', { hasText: 'Lakshu wedding' }).waitFor();
  const titles = await p.locator('[data-testid^="sub-"] .t').allTextContents();
  ok(titles.join(',') === 'Gaur,Haldi,Mehendi,Welcome lunch,Sangeet,After party,Shaadi,Filler suit 1,Filler suit 2', `[${tag}] sub-events in order: ${titles.join(', ')}`);
  await p.screenshot({ path: `${OUT}/live-${tag}-wedding.png`, fullPage: true });
  if (tag === '390') {
    await p.getByTestId('sub-haldi').click();
    await p.getByTestId('option-add').click();
    await p.getByTestId('option-pick-5eed0000-0000-4000-8000-000000004819').click(); // yellow kurta for Haldi
    await p.getByTestId('option-tab-bag').click();
    await p.getByTestId('option-bag-note').fill('LIVE TEST – remove');
    await p.getByTestId('option-save').click();
    const opt = p.locator('[data-testid^="v-option-"]').first();
    await opt.waitFor();
    ok((await opt.innerText()).includes('LIVE TEST'), '[390] outfit option with a bag saved to Supabase');
    await p.screenshot({ path: `${OUT}/live-390-wedding-option.png`, fullPage: true });
    const id = (await opt.getAttribute('data-testid')).replace('v-option-', '');
    await p.getByTestId(`option-delete-${id}`).click();
    await p.getByTestId('toast-dismiss').last().click();
    await p.locator('[data-testid^="v-option-"]').first().waitFor({ state: 'detached' });
    await p.waitForTimeout(1500);
    ok(true, '[390] test option removed again');
  }
  await ctx.close();
}
console.log('page errors:', errors);
await browser.close();
