// Browser-side compression + analysis (canvas). Pure maths lives in resize.ts / palette.ts / phash.ts.
import { FULL_MAX, THUMB_MAX, fitWithin } from './resize.ts';
import type { PixelData } from './palette.ts';

export interface Processed { full: Blob; thumb: Blob; pixels: PixelData; width: number; height: number }

async function decode(src: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try { return await createImageBitmap(src, { imageOrientation: 'from-image' } as ImageBitmapOptions); }
  catch {
    const url = URL.createObjectURL(src);
    try {
      const img = new Image(); img.src = url; await img.decode(); return img;
    } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }
}

function canvasFor(w: number, h: number) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

export function toBlob(c: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((res, rej) => {
    c.toBlob((b) => {
      if (b && b.type === 'image/webp') return res(b);
      // Safari < 16 cannot encode WebP: fall back to JPEG
      c.toBlob((j) => (j ? res(j) : rej(new Error('Could not encode the photo'))), 'image/jpeg', quality);
    }, 'image/webp', quality);
  });
}

export async function processImage(src: Blob): Promise<Processed> {
  const bmp = await decode(src);
  const w = 'naturalWidth' in bmp ? bmp.naturalWidth : bmp.width;
  const h = 'naturalHeight' in bmp ? bmp.naturalHeight : bmp.height;
  const draw = (max: number) => {
    const s = fitWithin(w, h, max); const c = canvasFor(s.width, s.height);
    const ctx = c.getContext('2d')!; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(bmp, 0, 0, s.width, s.height); return c;
  };
  const fullC = draw(FULL_MAX), thumbC = draw(THUMB_MAX), aC = draw(240);
  const [full, thumb] = await Promise.all([toBlob(fullC, 0.8), toBlob(thumbC, 0.75)]);
  const id = aC.getContext('2d')!.getImageData(0, 0, aC.width, aC.height);
  if ('close' in bmp) bmp.close();
  return { full, thumb, pixels: { data: id.data, width: id.width, height: id.height }, width: w, height: h };
}

export async function urlToPixels(url: string, max = 240): Promise<PixelData> {
  const img = new Image(); img.crossOrigin = 'anonymous'; img.src = url; await img.decode();
  const s = fitWithin(img.naturalWidth, img.naturalHeight, max); const c = canvasFor(s.width, s.height);
  const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0, s.width, s.height);
  const d = ctx.getImageData(0, 0, s.width, s.height);
  return { data: d.data, width: d.width, height: d.height };
}
