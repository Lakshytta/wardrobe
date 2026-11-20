import { chromium } from 'playwright';
const base = process.argv[2] ?? 'http://localhost:4173';
const out = process.argv[3] ?? '.';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', (e) => errs.push(String(e)));
for (const r of ['/', '/closet', '/piece/5eed0000-0000-4000-8000-000000004831', '/studio?with=5eed0000-0000-4000-8000-000000004830,5eed0000-0000-4000-8000-000000004843', '/plan', '/insights', '/more']) {
  await p.goto(`${base}/#${r}`); await p.waitForTimeout(800);
  if (r.startsWith('/studio')) { await p.click('[data-testid=studio-stylecheck]'); await p.waitForTimeout(300); }
  await p.screenshot({ path: `${out}/smoke-${r.replace(/[^a-z]/g, '_').slice(0, 20)}.png`, fullPage: false });
}
console.log('errors:', errs);
await b.close();
