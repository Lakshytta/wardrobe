import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { extractPalette, pixelWeight, rng } from '../src/lib/image/palette.ts';
import { phash, hamming, findDuplicates, toGrey } from '../src/lib/image/phash.ts';
import { fitWithin, validateUpload, MAX_UPLOAD_BYTES } from '../src/lib/image/resize.ts';
import derived from '../src/lib/data/seed-derived.json';

function img(fn: (x: number, y: number) => [number, number, number], w = 64, h = 64) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b] = fn(x, y); const i = (y * w + x) * 4; data.set([r, g, b, 255], i); }
  return { data, width: w, height: h };
}

describe('palette k-means', () => {
  it('finds two clusters with the right weights', () => {
    const p = extractPalette(img((x) => (x < 32 ? [200, 30, 30] : [30, 30, 200])), 2, { crop: 1 });
    expect(p).toHaveLength(2);
    expect(p[0].weight).toBeCloseTo(0.5, 1);
    const hexes = p.map((c) => c.hex).sort();
    expect(hexes).toEqual(['#1E1EC8', '#C81E1E']);
  });
  it('down-weights the white floor and skin', () => {
    expect(pixelWeight([250, 250, 250])).toBeLessThan(0.2);
    expect(pixelWeight([224, 172, 140])).toBeLessThan(1);
    expect(pixelWeight([30, 120, 70])).toBeGreaterThan(1);
    expect(pixelWeight([128, 128, 130])).toBeLessThan(0.5);
    const p = extractPalette(img((x) => (x < 48 ? [250, 250, 250] : [30, 120, 70])), 2, { crop: 1 });
    expect(p[0].hex).toBe('#1E7846');
  });
  it('is deterministic', () => {
    const im = img((x, y) => [(x * 4) % 255, (y * 4) % 255, 100]);
    expect(extractPalette(im, 4)).toEqual(extractPalette(im, 4));
    const a = rng(3), b = rng(3);
    expect([a(), a()]).toEqual([b(), b()]);
  });
});

describe('pHash', () => {
  const scene = (dx: number) => img((x, y) => {
    const inC = (x - 24) ** 2 + (y - 30) ** 2 < 200;
    const inR = x > 40 && x < 58 && y > 8 && y < 50;
    const v = inC ? 200 : inR ? 60 : 120 + (x + y);
    return [Math.min(255, v + dx), Math.min(255, v + dx), Math.min(255, v + dx)];
  });
  const grad = scene(0);
  it('is 16 hex chars and stable', () => {
    expect(phash(grad)).toMatch(/^[0-9a-f]{16}$/);
    expect(phash(grad)).toBe(phash(grad));
  });
  it('is close for a brightness change, far for a different image', () => {
    const brighter = scene(15);
    const other = img((x, y) => (((x >> 3) + (y >> 3)) % 2 ? [255, 255, 255] : [0, 0, 0]));
    expect(hamming(phash(grad), phash(brighter))).toBeLessThanOrEqual(6);
    expect(hamming(phash(grad), phash(other))).toBeGreaterThan(16);
  });
  it('hamming counts bits', () => {
    expect(hamming('0000', '000f')).toBe(4);
    expect(hamming('ffff', 'ffff')).toBe(0);
    expect(hamming('ab', 'abc')).toBe(64);
  });
  it('seed photos are mutually distinct (no false dupes)', () => {
    const hashes = Object.values(derived as Record<string, { phash: string }>).map((d) => d.phash);
    for (let i = 0; i < hashes.length; i++) for (let j = i + 1; j < hashes.length; j++) expect(hamming(hashes[i], hashes[j])).toBeGreaterThan(6);
  });
  it('findDuplicates flags near matches', () => {
    expect(findDuplicates('ffff0000ffff0000', [{ phash: 'ffff0000ffff0001' }, { phash: '0000ffff0000ffff' }])).toHaveLength(1);
  });
  it('toGrey averages blocks', () => {
    expect(toGrey(img(() => [255, 255, 255], 8, 8), 4).every((v) => Math.abs(v - 255) < 0.01)).toBe(true);
  });
});

describe('resize maths', () => {
  it('fits within the max keeping aspect', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(900, 1200, 480)).toEqual({ width: 360, height: 480 });
    expect(fitWithin(300, 200, 480)).toEqual({ width: 300, height: 200 });
  });
  it('validates type and size', () => {
    expect(validateUpload({ type: 'image/jpeg', size: 1000 })).toBeNull();
    expect(validateUpload({ type: 'application/pdf', size: 1000 })).toMatch(/not a photo/);
    expect(validateUpload({ type: 'image/png', size: MAX_UPLOAD_BYTES + 1 })).toMatch(/8 MB/);
  });
  it('seed thumbnails are ≤ 480px', async () => {
    const sharp = (await import('sharp')).default;
    const m = await sharp(fs.readFileSync('public/seed/p4851.thumb.webp')).metadata();
    expect(Math.max(m.width!, m.height!)).toBeLessThanOrEqual(480);
  });
});
