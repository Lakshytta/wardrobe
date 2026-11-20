// Pure sizing maths (tested) + browser compression helpers.
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const FULL_MAX = 1600;
export const THUMB_MAX = 480;

export function fitWithin(w: number, h: number, max: number): { width: number; height: number } {
  if (w <= max && h <= max) return { width: w, height: h };
  const s = max / Math.max(w, h);
  return { width: Math.max(1, Math.round(w * s)), height: Math.max(1, Math.round(h * s)) };
}

export function validateUpload(file: { type: string; size: number }): string | null {
  if (!file.type || !file.type.startsWith('image/')) return 'That file is not a photo. Please pick a JPEG, PNG, WebP or HEIC image.';
  if (file.size > MAX_UPLOAD_BYTES) return 'That photo is larger than 8 MB. Please pick a smaller one.';
  return null;
}
