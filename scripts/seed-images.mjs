// Builds /public/seed/<ref>.{full,thumb}.webp + src/lib/data/seed-derived.json (palette_hex, phash)
// from seed-src/<ref>.jpg (run scripts/extract-base.mjs first).
import fs from 'node:fs';
import sharp from 'sharp';
import { extractPalette } from '../src/lib/image/palette.ts';
import { phash } from '../src/lib/image/phash.ts';

const cat = JSON.parse(fs.readFileSync('src/lib/data/catalogue.json', 'utf8'));
fs.mkdirSync('public/seed', { recursive: true });
const derived = {};
for (const it of cat) {
  const src = `seed-src/${it.ref}.jpg`;
  await sharp(src).rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(`public/seed/${it.ref}.full.webp`);
  await sharp(src).rotate().resize(480, 480, { fit: 'inside' }).webp({ quality: 75 }).toFile(`public/seed/${it.ref}.thumb.webp`);
  // analysis at the same size the browser uses (≈ thumbnail)
  const { data, info } = await sharp(src).resize(240, 240, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const img = { data, width: info.width, height: info.height };
  const pal = extractPalette(img, 5, { crop: 0.6 });
  derived[it.ref] = { palette_hex: pal.map((c) => c.hex), phash: phash(img) };
}
fs.writeFileSync('src/lib/data/seed-derived.json', JSON.stringify(derived, null, 1));
console.log('seeded', Object.keys(derived).length);
