// ONE source of truth for colour: named colour → hex → hue family → metal tone.
// Pure data + small pure helpers. Imported by the rule engine, the UI and the seed scripts.

export type Family =
  | 'red' | 'pink' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple'
  | 'brown' | 'neutral' | 'metallic' | 'multi';

export type Metal = 'gold' | 'antique gold' | 'silver' | 'oxidised' | 'pearls';

export interface NamedColour {
  name: string;
  hex: string;
  family: Family;
  /** metal tone that flatters this colour (jewellery tips) */
  metal: Metal;
  /** neutral or metallic colours anchor almost anything */
  neutral?: boolean;
  /** light/pastel — reads summery and day-time */
  light?: boolean;
  /** words people use for it (search + tagging) */
  synonyms?: string[];
}

export const COLOURS: NamedColour[] = [
  { name: 'red', hex: '#B8342E', family: 'red', metal: 'gold', synonyms: ['scarlet', 'crimson', 'sindoori', 'cherry'] },
  { name: 'maroon', hex: '#7A1F2B', family: 'red', metal: 'antique gold', synonyms: ['wine', 'burgundy', 'oxblood', 'deep red'] },
  { name: 'rust', hex: '#B5532B', family: 'orange', metal: 'antique gold', synonyms: ['terracotta', 'brick', 'burnt orange'] },
  { name: 'orange', hex: '#E07A2F', family: 'orange', metal: 'gold', synonyms: ['saffron', 'kesari', 'tangerine'] },
  { name: 'copper', hex: '#B87333', family: 'metallic', metal: 'antique gold', neutral: true, synonyms: ['bronze', 'peach-copper'] },
  { name: 'mustard', hex: '#C99A1E', family: 'yellow', metal: 'antique gold', synonyms: ['haldi', 'ochre', 'turmeric'] },
  { name: 'yellow', hex: '#D4C23A', family: 'yellow', metal: 'gold', synonyms: ['lemon', 'marigold', 'canary'] },
  { name: 'gold', hex: '#C9A24B', family: 'metallic', metal: 'gold', neutral: true, synonyms: ['golden', 'zari', 'antique gold'] },
  { name: 'beige', hex: '#D9C7A3', family: 'neutral', metal: 'gold', neutral: true, light: true, synonyms: ['sand', 'nude', 'camel', 'fawn', 'khaki'] },
  { name: 'ivory', hex: '#EFE9DA', family: 'neutral', metal: 'pearls', neutral: true, light: true, synonyms: ['cream', 'off-white', 'offwhite', 'off white', 'pearl'] },
  { name: 'white', hex: '#FFFFFF', family: 'neutral', metal: 'silver', neutral: true, light: true, synonyms: ['snow'] },
  { name: 'silver', hex: '#B9BCC4', family: 'metallic', metal: 'silver', neutral: true, synonyms: ['silvery', 'metallic grey'] },
  { name: 'grey', hex: '#8A8590', family: 'neutral', metal: 'silver', neutral: true, synonyms: ['gray', 'charcoal', 'ash', 'slate'] },
  { name: 'black', hex: '#222222', family: 'neutral', metal: 'silver', neutral: true, synonyms: ['jet', 'ebony'] },
  { name: 'brown', hex: '#7B5237', family: 'brown', metal: 'antique gold', synonyms: ['chocolate', 'coffee', 'tan'] },
  { name: 'olive', hex: '#7A7A3A', family: 'green', metal: 'antique gold', synonyms: ['mehendi green', 'khaki green', 'moss'] },
  { name: 'green', hex: '#1E7A4A', family: 'green', metal: 'gold', synonyms: ['emerald', 'bottle green', 'bottle-green', 'forest', 'parrot', 'leaf', 'jade', 'hara'] },
  { name: 'mint', hex: '#A8D8C0', family: 'green', metal: 'pearls', light: true, synonyms: ['pista', 'pistachio', 'sage', 'sea green'] },
  { name: 'teal', hex: '#1B8A8A', family: 'teal', metal: 'gold', synonyms: ['peacock', 'peacock green', 'petrol'] },
  { name: 'turquoise', hex: '#1FB5B0', family: 'teal', metal: 'silver', synonyms: ['firozi', 'aqua', 'cyan', 'feroza'] },
  { name: 'blue', hex: '#2F6FB5', family: 'blue', metal: 'silver', synonyms: ['cobalt', 'royal blue', 'indigo', 'sky', 'azure'] },
  { name: 'navy', hex: '#1F2F5C', family: 'blue', metal: 'gold', synonyms: ['navy blue', 'midnight', 'dark blue', 'ink'] },
  { name: 'purple', hex: '#7A3F9D', family: 'purple', metal: 'gold', synonyms: ['violet', 'aubergine', 'plum', 'jamuni', 'brinjal'] },
  { name: 'lavender', hex: '#B9A3D6', family: 'purple', metal: 'silver', light: true, synonyms: ['lilac', 'mauve', 'onion pink'] },
  { name: 'magenta', hex: '#C2187A', family: 'pink', metal: 'gold', synonyms: ['rani', 'rani pink', 'fuchsia', 'hot pink'] },
  { name: 'pink', hex: '#D6477F', family: 'pink', metal: 'gold', synonyms: ['rose', 'gulabi'] },
  { name: 'blush', hex: '#EBC3C3', family: 'pink', metal: 'pearls', light: true, synonyms: ['baby pink', 'pastel pink', 'powder pink', 'dusty pink', 'peach', 'onion'] },
  { name: 'multi', hex: '#9A6A8A', family: 'multi', metal: 'gold', neutral: false, synonyms: ['multicolour', 'multicolor', 'multi-colour', 'printed', 'colourful', 'colorful'] },
];

const BY_NAME = new Map(COLOURS.map((c) => [c.name, c]));

export function colour(name: string | null | undefined): NamedColour | undefined {
  if (!name) return undefined;
  return BY_NAME.get(name.toLowerCase());
}

/** CSS background for a swatch (multi gets a conic gradient). */
export function swatchCss(name: string): string {
  if (name === 'multi') return 'conic-gradient(#D6477F,#C9A24B,#1E7A4A,#1F2F5C,#D6477F)';
  return colour(name)?.hex ?? name;
}

/** synonym → canonical name (lower-case keys, also canonical names themselves). */
export const COLOUR_SYNONYMS: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const c of COLOURS) {
    m[c.name] = c.name;
    for (const s of c.synonyms ?? []) m[s] = c.name;
  }
  return m;
})();

// ---------- colour maths ----------
export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** HSL with h in degrees, s/l in 0..1 */
export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function srgbToLinear(c: number) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function rgbToLab([r, g, b]: RGB): [number, number, number] {
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  let y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  let z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = f(x); y = f(y); z = f(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

export function deltaE(a: RGB, b: RGB): number {
  const A = rgbToLab(a), B = rgbToLab(b);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

const NAMEABLE = COLOURS.filter((c) => c.name !== 'multi');
const NAMEABLE_LAB = NAMEABLE.map((c) => ({ c, lab: rgbToLab(hexToRgb(c.hex)) }));

/** Nearest named colour for a hex (perceptual, CIE76 in Lab). */
export function nameColour(hex: string): NamedColour {
  const lab = rgbToLab(hexToRgb(hex));
  let best = NAMEABLE_LAB[0], bestD = Infinity;
  for (const e of NAMEABLE_LAB) {
    // weight lightness a little less: photos vary in exposure
    const d = Math.hypot((lab[0] - e.lab[0]) * 0.75, lab[1] - e.lab[1], lab[2] - e.lab[2]);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best.c;
}

/** Hue in degrees for a named colour (null for neutrals/metallics/multi). */
export function hueOf(name: string): number | null {
  const c = colour(name);
  if (!c || c.neutral || c.family === 'multi' || c.family === 'neutral' || c.family === 'metallic') return null;
  return rgbToHsl(hexToRgb(c.hex))[0];
}

export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export function isNeutral(name: string): boolean {
  const c = colour(name);
  return !!c && (!!c.neutral || c.family === 'neutral' || c.family === 'metallic');
}

/** Readable label: "bottle-green" style names are kept by the item; this is for the canonical name. */
export function prettyColour(name: string): string {
  return name === 'multi' ? 'multicolour' : name;
}
