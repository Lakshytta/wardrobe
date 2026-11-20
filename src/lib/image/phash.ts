// Perceptual hash (pHash): 32×32 greyscale → 2-D DCT → top-left 8×8 → 64-bit hex.
import type { PixelData } from './palette.ts';

/** Box-sample any RGBA image down to an n×n greyscale grid. */
export function toGrey(img: PixelData, n = 32): number[] {
  const out = new Array(n * n).fill(0);
  const cnt = new Array(n * n).fill(0);
  const { width: w, height: h, data } = img;
  for (let y = 0; y < h; y++) {
    const gy = Math.min(n - 1, Math.floor((y * n) / h));
    for (let x = 0; x < w; x++) {
      const gx = Math.min(n - 1, Math.floor((x * n) / w));
      const i = (y * w + x) * 4;
      out[gy * n + gx] += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      cnt[gy * n + gx]++;
    }
  }
  return out.map((v, i) => (cnt[i] ? v / cnt[i] : 0));
}

const N = 32;
const COS: number[][] = Array.from({ length: N }, (_, u) => Array.from({ length: N }, (_, x) => Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N))));

export function phash(img: PixelData): string {
  const g = toGrey(img, N);
  const coeffs: number[] = [];
  for (let u = 0; u < 8; u++) for (let v = 0; v < 8; v++) {
    let s = 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) s += g[y * N + x] * COS[u][y] * COS[v][x];
    coeffs.push(s);
  }
  const ac = coeffs.slice(1).sort((a, b) => a - b);
  const median = ac[Math.floor(ac.length / 2)];
  let hex = '';
  for (let i = 0; i < 64; i += 4) {
    let nib = 0;
    for (let b = 0; b < 4; b++) nib = (nib << 1) | (coeffs[i + b] > median ? 1 : 0);
    hex += nib.toString(16);
  }
  return hex;
}

export function hamming(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { d += x & 1; x >>= 1; }
  }
  return d;
}

/** Threshold below which two photos are "probably the same piece". */
export const DUPE_THRESHOLD = 6; // seed photos: re-encodes ≤4 bits apart, different pieces ≥8

export function findDuplicates<T extends { phash?: string | null }>(hash: string, items: T[], threshold = DUPE_THRESHOLD): T[] {
  return items.filter((it) => it.phash && hamming(hash, it.phash) <= threshold);
}
