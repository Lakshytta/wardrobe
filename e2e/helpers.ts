import { expect, test as base, type Locator, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export const COV_DIR = path.join(process.cwd(), 'e2e/.coverage');
fs.mkdirSync(COV_DIR, { recursive: true });

export const SEED = {
  greenSaree: '5eed0000-0000-4000-8000-000000004831',
  navySaree: '5eed0000-0000-4000-8000-000000004830',
  rustSaree: '5eed0000-0000-4000-8000-000000004841',
  ivoryGoldBlouse: '5eed0000-0000-4000-8000-000000004847',
  magentaBlouse: '5eed0000-0000-4000-8000-000000004843',
  navyBlouse: '5eed0000-0000-4000-8000-000000004849',
  navyKurta: '5eed0000-0000-4000-8000-000000004835',
  redAnarkali: '5eed0000-0000-4000-8000-000000004824',
};

function record(id: string) {
  fs.appendFileSync(path.join(COV_DIR, `${process.pid}.jsonl`), JSON.stringify(id) + '\n');
}

/** Click a data-testid and record it in the CTA coverage log. */
export async function tap(page: Page, id: string, opts: { force?: boolean } = {}) {
  const loc = page.getByTestId(id).first();
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await loc.click({ force: opts.force });
  record(id);
}

/** Click the n-th element whose testid starts with prefix; returns the exact id. */
export async function tapPrefix(page: Page, prefix: string, n = 0): Promise<string> {
  const loc = page.locator(`[data-testid^="${prefix}"]`).nth(n);
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  const id = (await loc.getAttribute('data-testid'))!;
  await loc.click();
  record(id);
  return id;
}

/** Select / fill / check helpers that also count as exercising the control. */
export async function choose(page: Page, id: string, value: string) { await page.getByTestId(id).selectOption(value); record(id); }
export async function fill(page: Page, id: string, value: string) { await page.getByTestId(id).fill(value); record(id); }
export async function check(page: Page, id: string) { await page.getByTestId(id).click(); record(id); }
export function markUsed(id: string) { record(id); }

export const test = base.extend<{ app: Page }>({
  app: async ({ page }, use) => {
    page.on('dialog', (d) => void d.accept());
    await page.addInitScript(() => { (window as any).print = () => { (window as any).__printed = true; }; });
    await page.goto('/#/');
    await expect(page.getByTestId('profile-switcher')).toContainText('My Wardrobe');
    await use(page);
  },
});
export { expect };

export async function go(page: Page, hash: string) {
  await page.goto(`/#${hash}`);
  await page.waitForLoadState('domcontentloaded');
}

export async function toast(page: Page): Promise<Locator> {
  const t = page.locator('.toast').last();
  await expect(t).toBeVisible();
  return t;
}
