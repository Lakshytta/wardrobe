// k-means palette extraction on raw RGBA pixels. Pure + deterministic (seeded k-means++).
import { rgbToHex, rgbToHsl, type RGB } from '../smarts/colors.ts';

export interface PixelData { data: Uint8ClampedArray | Uint8Array | number[]; width: number; height: number }
export interface Cluster { hex: string; rgb: RGB; weight: number }

/** Small deterministic PRNG (mulberry32). */
export function rng(seed = 42) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Weight for a pixel: down-weights near-white floor/walls and skin tones. */
export function pixelWeight([r, g, b]: RGB): number {
  const [h, s, l] = rgbToHsl([r, g, b]);
  if (l > 0.88 && s < 0.25) return 0.08; // white floor / wall
  if (l > 0.8 && s < 0.12) return 0.15; // light grey
  // skin: warm hue 5–45°, moderate saturation, mid lightness, r > g > b
  if (h >= 8 && h <= 35 && s > 0.15 && s < 0.6 && l > 0.3 && l < 0.8 && r > g && g > b && r - b > 40) return 0.3;
  // walls, sofas and floors are mostly unsaturated mid-greys; garments are colourful or very dark
  if (s < 0.12 && l > 0.25 && l < 0.85) return 0.35;
  return 1 + s;
}

/**
 * Samples the garment region (centre crop) and returns k clusters sorted by weight.
 * crop = fraction of width/height kept around the centre.
 */
export function extractPalette(img: PixelData, k = 5, opts: { crop?: number; seed?: number; maxSamples?: number } = {}): Cluster[] {
  const crop = opts.crop ?? 0.6;
  const { width: w, height: h, data } = img;
  const x0 = Math.floor((w * (1 - crop)) / 2), x1 = Math.ceil(w - x0);
  const y0 = Math.floor((h * (1 - crop)) / 2), y1 = Math.ceil(h - y0);
  const area = (x1 - x0) * (y1 - y0);
  const step = Math.max(1, Math.floor(Math.sqrt(area / (opts.maxSamples ?? 4000))));
  const pts: RGB[] = []; const wts: number[] = [];
  for (let y = y0; y < y1; y += step) for (let x = x0; x < x1; x += step) {
    const i = (y * w + x) * 4;
    const p: RGB = [data[i], data[i + 1], data[i + 2]];
    pts.push(p); wts.push(pixelWeight(p));
  }
  if (!pts.length) return [];
  const rand = rng(opts.seed ?? 7);
  k = Math.min(k, pts.length);
  // k-means++ seeding
  const cents: RGB[] = [pts[Math.floor(rand() * pts.length)]];
  const d2 = (a: RGB, b: RGB) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  while (cents.length < k) {
    const ds = pts.map((p, i) => Math.min(...cents.map((c) => d2(p, c))) * wts[i]);
    const tot = ds.reduce((a, b) => a + b, 0);
    if (tot === 0) break;
    let r = rand() * tot, idx = 0;
    while (r > ds[idx] && idx < ds.length - 1) { r -= ds[idx]; idx++; }
    cents.push(pts[idx]);
  }
  const assign = new Int32Array(pts.length);
  for (let iter = 0; iter < 12; iter++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      let best = 0, bd = Infinity;
      for (let c = 0; c < cents.length; c++) { const d = d2(pts[i], cents[c]); if (d < bd) { bd = d; best = c; } }
      if (assign[i] !== best) { assign[i] = best; moved = true; }
    }
    const sum = cents.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < pts.length; i++) {
      const s = sum[assign[i]], w8 = wts[i];
      s[0] += pts[i][0] * w8; s[1] += pts[i][1] * w8; s[2] += pts[i][2] * w8; s[3] += w8;
    }
    sum.forEach((s, c) => { if (s[3] > 0) cents[c] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
    if (!moved && iter > 0) break;
  }
  const weight = cents.map(() => 0);
  for (let i = 0; i < pts.length; i++) weight[assign[i]] += wts[i];
  const total = weight.reduce((a, b) => a + b, 0) || 1;
  return cents
    .map((c, i) => ({ rgb: c.map(Math.round) as RGB, hex: rgbToHex(c), weight: weight[i] / total }))
    .filter((c) => c.weight > 0)
    .sort((a, b) => b.weight - a.weight);
}
