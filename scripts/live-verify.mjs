// Live verification against the deployed site + real Supabase (§10). Cleans up everything it creates.
// Usage: node scripts/live-verify.mjs https://wardrobe-ten-sooty.vercel.app <screenshot-dir>
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.argv[2];
const OUT = process.argv[3] ?? 'screenshots/live';
fs.mkdirSync(OUT, { recursive: true });
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const browser = await chromium.launch({ proxy: proxy ? { server: proxy } : undefined, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
const mk = (vp) => browser.newContext({ viewport: vp, ignoreHTTPSErrors: true, acceptDownloads: true });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const ok = (c, m) => { if (!c) throw new Error('FAILED: ' + m); log('✓', m); };
const created = { items: [], looks: [], events: [], profiles: [] };
const errors = [];

const ctxA = await mk({ width: 390, height: 844 });
const a = await ctxA.newPage();
a.on('pageerror', (e) => errors.push(String(e)));
a.on('dialog', (d) => d.accept());
const t = (p, id) => p.getByTestId(id).first();

try {
  // 1. home
  await a.goto(`${BASE}/#/`);
  await a.waitForFunction(() => document.querySelector('[data-testid=profile-switcher]')?.textContent?.includes('My Wardrobe'), null, { timeout: 20000 })
    .catch(async () => { console.log(await a.locator('body').innerText()); });
  ok((await t(a, 'profile-switcher').innerText()).includes('My Wardrobe'), 'home loads with "My Wardrobe" from Supabase');
  await a.screenshot({ path: `${OUT}/live-390-home.png` });
  await a.goto(`${BASE}/#/closet`);
  await a.getByTestId('v-result-count').waitFor();
  const count = await a.getByTestId('v-result-count').innerText();
  ok(/31 pieces/.test(count), `closet shows the seeded pieces (${count})`);
  await a.waitForTimeout(1200);
  await a.screenshot({ path: `${OUT}/live-390-closet.png` });

  // 2. switch profile (create a temporary one, switch, switch back)
  await t(a, 'profile-switcher').click(); await t(a, 'profile-add').click();
  await t(a, 'profile-name').fill('Live test (temporary)'); await t(a, 'profile-save').click();
  await a.waitForFunction(() => document.querySelector('[data-testid=profile-switcher]')?.textContent?.includes('Live test'));
  ok(true, 'created + switched to a temporary profile');
  await t(a, 'profile-switcher').click();
  const tmpId = (await a.locator('[data-testid^="profile-edit-"]').last().getAttribute('data-testid')).replace('profile-edit-', '');
  created.profiles.push(tmpId);
  await t(a, 'profile-pick-5eed0000-0000-4000-8000-000000000001').click();
  await a.waitForFunction(() => document.querySelector('[data-testid=profile-switcher]')?.textContent?.includes('My Wardrobe'));
  ok(true, 'switched back to My Wardrobe');

  // 3. open a piece
  await a.goto(`${BASE}/#/piece/5eed0000-0000-4000-8000-000000004831`);
  await a.locator('h1').waitFor();
  ok((await a.locator('h1').innerText()).includes('Parsi gara'), 'piece page opens');
  await a.waitForTimeout(800);
  await a.screenshot({ path: `${OUT}/live-390-piece.png` });

  // 4. upload one photo in tab A, watch it appear in tab B (a separate browser context = another device)
  const ctxB = await mk({ width: 1280, height: 800 });
  const b = await ctxB.newPage();
  await b.goto(`${BASE}/#/review`);
  await b.getByText('All checked').waitFor();
  await a.goto(`${BASE}/#/add`);
  await t(a, 'capture-cat-sarees').click();
  const ch = a.waitForEvent('filechooser');
  await t(a, 'capture-gallery').click();
  await (await ch).setFiles('e2e/fixtures/dupe-of-green-saree.jpg');
  await t(a, 'dupe-keep').click({ timeout: 30000 });
  ok(true, 'duplicate-photo warning shown for a seed photo; chose "Add anyway"');
  await a.locator('[data-testid^="v-review-"]').first().waitFor({ timeout: 30000 });
  const newId = (await a.locator('[data-testid^="v-review-"]').first().getAttribute('data-testid')).replace('v-review-', '');
  created.items.push(newId);
  const img = await a.locator('[data-testid^="v-review-"] img').first().getAttribute('src');
  ok(/supabase\.co\/storage\/v1\/object\/public\/wardrobe\//.test(img) || img.startsWith('blob:'), `photo uploaded to Supabase Storage (${img.slice(0, 80)}…)`);
  await b.locator(`[data-testid="v-review-${newId}"]`).waitFor({ timeout: 20000 });
  ok(true, 'new photo appeared in the second tab in real time (Supabase Realtime)');
  const bImg = b.locator(`[data-testid="v-review-${newId}"] img`).first();
  await b.waitForFunction((id) => { const i = document.querySelector(`[data-testid="v-review-${id}"] img`); return i && i.complete && i.naturalWidth > 0; }, newId, { timeout: 20000 });
  const bSrc = await bImg.getAttribute('src');
  ok(/gmtprnpryxbtotejneae\.supabase\.co\/storage\/v1\/object\/public\/wardrobe\/.+\/thumb\.webp$/.test(bSrc), `second tab renders the photo from Supabase Storage (${bSrc.split('/').slice(-3).join('/')})`);
  await a.screenshot({ path: `${OUT}/live-390-capture-review.png` });
  await t(a, `review-accept-${newId}`).click();

  // 5. build a look and save it
  await a.goto(`${BASE}/#/studio?with=5eed0000-0000-4000-8000-000000004831,5eed0000-0000-4000-8000-000000004847`);
  await t(a, 'studio-stylecheck').click();
  await a.getByTestId('v-score').waitFor();
  ok(Number(await a.getByTestId('v-score').innerText()) >= 8, 'style check: green Parsi gara + ivory/gold brocade ≥ 8');
  await a.getByTestId('v-verdict').scrollIntoViewIfNeeded();
  await a.screenshot({ path: `${OUT}/live-390-mix-match.png` });
  await t(a, 'studio-save').click();
  await t(a, 'look-name').fill('Live test look (temporary)');
  await t(a, 'look-save').click();
  await a.waitForURL(/#\/look\//, { timeout: 30000 });
  created.looks.push(a.url().split('/look/')[1]);
  await a.locator('.board-preview').waitFor();
  ok(true, 'look saved with its board image');

  // 6. create an event
  await a.goto(`${BASE}/#/plan?new=1`);
  await t(a, 'event-title').fill('Live test event (temporary)');
  await t(a, 'event-date').fill('2099-01-01');
  await t(a, 'event-save').click();
  await a.waitForURL(/#\/event\//);
  created.events.push(a.url().split('/event/')[1]);
  ok(true, 'event created');

  // 7. export a backup
  await a.goto(`${BASE}/#/more/backup`);
  const dl = a.waitForEvent('download');
  await t(a, 'backup-export').click();
  const f = await (await dl).path();
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  ok(j.app === 'wardrobe' && j.items.length === 32 && j.looks.length >= 1 && j.events.length >= 1, `backup exported (${j.items.length} pieces, ${j.looks.length} looks, ${j.events.length} events)`);

  // desktop screenshots
  for (const [h, n] of [['/', 'home'], ['/closet', 'closet'], ['/insights', 'insights']]) {
    await b.goto(`${BASE}/#${h}`); await b.waitForTimeout(1500); await b.screenshot({ path: `${OUT}/live-1280-${n}.png` });
  }
  await ctxB.close();
} finally {
  // 8. clean up everything this run created, through the app's own delete paths
  try {
    for (const id of created.events) { await a.goto(`${BASE}/#/event/${id}`); await t(a, 'event-delete').click(); await t(a, 'toast-dismiss').click().catch(() => {}); }
    for (const id of created.looks) { await a.goto(`${BASE}/#/look/${id}`); await t(a, 'look-delete').click(); }
    for (const id of created.items) { await a.goto(`${BASE}/#/piece/${id}`); await t(a, 'piece-delete').click(); }
    await a.goto(`${BASE}/#/more/trash`);
    for (const id of created.items) await t(a, `trash-purge-${id}`).click();
    for (const id of created.looks) await t(a, `trash-purge-look-${id}`).click();
    await a.waitForTimeout(3000);
    log('cleanup via app done; profiles to delete via SQL:', JSON.stringify(created.profiles));
  } catch (e) { log('cleanup error', e.message); }
  fs.writeFileSync(`${OUT}/created.json`, JSON.stringify(created, null, 1));
  console.log('page errors:', errors);
  await browser.close();
}
