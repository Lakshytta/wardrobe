export type Theme = 'light' | 'dark' | 'auto';
const KEY = 'wardrobe-theme';
export function getTheme(): Theme {
  try { const t = localStorage.getItem(KEY); if (t === 'light' || t === 'dark' || t === 'auto') return t; } catch { /* */ }
  return 'auto';
}
export function applyTheme(t: Theme) {
  const el = document.documentElement;
  if (t === 'auto') el.removeAttribute('data-theme'); else el.setAttribute('data-theme', t);
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#141018' : '#F5F1F6');
}
export function setTheme(t: Theme) {
  try { localStorage.setItem(KEY, t); } catch { /* */ }
  applyTheme(t);
}
