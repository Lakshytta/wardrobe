import { colour, nameColour } from './colors.ts';
import { extractPalette, type PixelData } from '../image/palette.ts';
import { CATEGORY_DEFAULTS, COLOUR_OCCASIONS } from './pairings.ts';

export interface TagResult {
  name: string;
  primary_color: string;
  accent_colors: string[];
  palette_hex: string[];
  occasions: string[];
  season: string;
  source: 'rules';
}

export interface TagContext { category: string }

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Auto-tag a photo on device: k-means palette → named colours → name/occasions/season. */
export function tagPhoto(img: PixelData, ctx: TagContext): TagResult {
  const clusters = extractPalette(img, 5, { crop: 0.6 });
  const palette_hex = clusters.map((c) => c.hex);
  // accumulate cluster weight per named colour
  const byName = new Map<string, number>();
  for (const c of clusters) {
    const n = nameColour(c.hex).name;
    byName.set(n, (byName.get(n) ?? 0) + c.weight);
  }
  const ranked = [...byName.entries()].sort((a, b) => b[1] - a[1]);
  // prefer a chromatic colour as primary if it holds a decent share (garments sit on white/grey floors)
  const chromatic = ranked.find(([n, w]) => !colour(n)?.neutral && w >= 0.18);
  const primary = (chromatic ?? ranked[0] ?? ['multi', 1])[0];
  const accent_colors = ranked.filter(([n, w]) => n !== primary && w >= 0.08 && !['white', 'grey'].includes(n)).slice(0, 2).map(([n]) => n);
  const chromaticCount = ranked.filter(([n, w]) => !colour(n)?.neutral && w >= 0.12).length;
  if (chromaticCount >= 3 && !accent_colors.includes('multi')) accent_colors.push('multi');
  const def = CATEGORY_DEFAULTS[ctx.category] ?? CATEGORY_DEFAULTS.other;
  const occasions = [...new Set([...def.occasions, ...(COLOUR_OCCASIONS[primary] ?? [])])].slice(0, 4);
  const light = colour(primary)?.light;
  const season = light || primary === 'yellow' || primary === 'mint' ? 'Summer' : 'All-season';
  return {
    name: `${cap(primary === 'multi' ? 'multicolour' : primary)} ${def.noun}`,
    primary_color: primary,
    accent_colors,
    palette_hex,
    occasions,
    season,
    source: 'rules',
  };
}
