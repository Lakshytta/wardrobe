// CTA inventory: every data-testid in src (except v-* view markers) must have been exercised.
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { COV_DIR } from './helpers.ts';

function walk(d: string): string[] {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
}

export function inventory() {
  const exact = new Set<string>(); const prefixes = new Set<string>();
  for (const f of walk('src').filter((f) => f.endsWith('.tsx'))) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/data-testid="([^"]+)"/g)) exact.add(m[1]);
    for (const m of src.matchAll(/data-testid=\{`([^`$]*)\$\{/g)) prefixes.add(m[1]);
    for (const m of src.matchAll(/testid(?:Prefix)?="([^"]+)"/g)) (m[0].includes('Prefix') ? prefixes.add(`${m[1]}-`) : exact.add(m[1]));
    for (const m of src.matchAll(/(?:^|[\s{(,])id: '([a-z-]+)'/g)) if (/^nav-/.test(m[1])) exact.add(m[1]);
    for (const m of src.matchAll(/'(more-[a-z-]+)'\]/g)) exact.add(m[1]);
  }
  const keep = (s: string) => !s.startsWith('v-');
  return { exact: [...exact].filter(keep).sort(), prefixes: [...prefixes].filter(keep).filter((p) => p !== 'v-').sort() };
}

test('every CTA in the inventory was exercised', () => {
  const used = new Set<string>();
  for (const f of fs.readdirSync(COV_DIR)) for (const l of fs.readFileSync(path.join(COV_DIR, f), 'utf8').split('\n')) if (l) used.add(JSON.parse(l));
  const inv = inventory();
  fs.writeFileSync('e2e/cta-inventory.json', JSON.stringify(inv, null, 1));
  const missing = [...inv.exact.filter((id) => !used.has(id)), ...inv.prefixes.filter((p) => ![...used].some((u) => u.startsWith(p))).map((p) => `${p}*`)];
  console.log(`CTA inventory: ${inv.exact.length} exact ids + ${inv.prefixes.length} id families; exercised ${used.size} distinct ids`);
  expect(missing).toEqual([]);
});
