// Visual board: canvas collage of the chosen photos plus their palettes → PNG.
import type { Item } from './types.ts';
import { imgUrl } from './data/index.ts';
import { swatchCss } from './smarts/colors.ts';

const W = 1080, H = 1350;

function load(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const i = new Image(); i.crossOrigin = 'anonymous';
    i.onload = () => res(i); i.onerror = () => res(null); i.src = src;
  });
}

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / s, sh = h / s;
  ctx.save();
  roundRect(ctx, x, y, w, h, 24); ctx.clip();
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines = 2) {
  const words = text.split(' '); let line = ''; let n = 0;
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) {
      ctx.fillText(n === maxLines - 1 ? `${line}…` : line, x, y); y += lh; line = w; n++;
      if (n >= maxLines) return y;
    } else line = t;
  }
  if (line) { ctx.fillText(line, x, y); y += lh; }
  return y;
}

export async function drawBoard(items: Item[], opts: { title: string; occasion?: string; score?: number | null; verdict?: string }): Promise<HTMLCanvasElement> {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#F5F1F6'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#241A2B';
  ctx.font = '700 64px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(opts.title || 'My look', 60, 110);
  ctx.font = '500 30px "Hanken Grotesk", system-ui, sans-serif';
  ctx.fillStyle = '#5F536A';
  ctx.fillText([opts.occasion, opts.score != null ? `${opts.score}/10` : ''].filter(Boolean).join(' · '), 60, 160);

  const imgs = await Promise.all(items.map((i) => load(imgUrl(i.image_url || i.thumb_url))));
  const top = 200, areaH = 860;
  const main = imgs[0];
  const rest = imgs.slice(1, 4);
  if (main && rest.length === 0) cover(ctx, main, 60, top, W - 120, areaH);
  else {
    if (main) cover(ctx, main, 60, top, 600, areaH);
    const h = (areaH - 20 * (Math.max(rest.length, 1) - 1)) / Math.max(rest.length, 1);
    rest.forEach((im, k) => { if (im) cover(ctx, im, 680, top + k * (h + 20), W - 740, h); });
  }
  // palettes
  let y = top + areaH + 50;
  const cols = [...new Set(items.flatMap((i) => [i.primary_color, ...i.accent_colors]))].slice(0, 10);
  cols.forEach((cname, k) => {
    const css = swatchCss(cname);
    ctx.beginPath(); ctx.arc(90 + k * 70, y, 26, 0, Math.PI * 2);
    ctx.fillStyle = css.startsWith('conic') ? '#9A6A8A' : css; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(36,26,43,.25)'; ctx.stroke();
  });
  y += 70;
  ctx.fillStyle = '#241A2B'; ctx.font = '500 30px "Hanken Grotesk", system-ui, sans-serif';
  if (opts.verdict) y = wrap(ctx, opts.verdict, 60, y, W - 120, 40, 2);
  ctx.fillStyle = '#0B6B62'; ctx.font = '600 24px "Hanken Grotesk", system-ui, sans-serif';
  ctx.fillText('Made with Wardrobe', 60, H - 40);
  return c;
}

export function canvasToPng(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not make the picture'))), 'image/png'));
}

export async function sharePng(blob: Blob, name: string, text: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], `${name.replace(/[^\w-]+/g, '-') || 'look'}.png`, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], title: name, text }); return 'shared'; }
    catch (e) { if ((e as Error).name === 'AbortError') return 'shared'; }
  }
  downloadBlob(blob, file.name);
  return 'downloaded';
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
