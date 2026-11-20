// Extracts the 31 base64 JPEGs from the reference single-file app into seed-src/<ref>.jpg
// Usage: node scripts/extract-base.mjs path/to/my-wardrobe-app.html
import fs from 'node:fs';
const src = process.argv[2];
if (!src) { console.error('usage: node scripts/extract-base.mjs my-wardrobe-app.html'); process.exit(1); }
const html = fs.readFileSync(src, 'utf8');
const start = html.indexOf('const BASE=[');
if (start < 0) throw new Error('BASE array not found');
// find matching bracket
let i = html.indexOf('[', start), depth = 0, inStr = false, q = '';
for (; i < html.length; i++) {
  const c = html[i];
  if (inStr) { if (c === '\\') { i++; continue; } if (c === q) inStr = false; continue; }
  if (c === '"' || c === "'") { inStr = true; q = c; continue; }
  if (c === '[') depth++;
  else if (c === ']') { depth--; if (depth === 0) break; }
}
const arr = JSON.parse(html.slice(html.indexOf('[', start), i + 1));
fs.mkdirSync('seed-src', { recursive: true });
for (const p of arr) {
  const m = /^data:image\/\w+;base64,(.*)$/.exec(p.img);
  fs.writeFileSync(`seed-src/${p.id}.jpg`, Buffer.from(m[1], 'base64'));
}
const meta = arr.map(({ img, ...rest }) => rest);
fs.writeFileSync('seed-src/reference-meta.json', JSON.stringify(meta, null, 1));
console.log(`extracted ${arr.length} photos`);
