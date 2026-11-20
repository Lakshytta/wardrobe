// Indian-wear pairing knowledge AS DATA. Tune numbers and words here; the logic in
// styleCheck.ts / tagPhoto.ts / packTrip.ts / findGaps.ts reads these tables and never
// hard-codes a pairing itself.

/** Score (0–10) for each colour relationship between two pieces. */
export const HARMONY_SCORE = {
  neutral: 8, // one piece is ivory/beige/black/gold/silver/copper
  complementary: 8.5, // opposite on the wheel (≈150–210°)
  tonal: 8, // same family, different depth
  analogous: 8, // neighbours (≤45°)
  multi: 7.5, // a multicolour piece picks up almost anything
  printPickUp: 6.5, // a multicolour border/embroidery echoes this colour
  triadic: 6.5, // ≈105–140°
  contrast: 5.5, // unrelated hues, but one is deep enough to anchor the other
  clash: 4, // everything else
} as const;

export type Relationship = keyof typeof HARMONY_SCORE;

export const RELATIONSHIP_TEXT: Record<Relationship, string> = {
  neutral: 'neutral-anchored — one colour calms the other',
  complementary: 'complementary — opposite colours that make each other glow',
  tonal: 'tonal — same colour family in different depths',
  analogous: 'analogous — neighbouring colours that flow together',
  multi: 'the print already carries many colours, so it picks this one up',
  printPickUp: 'the colour is echoed in the multicolour embroidery or print, but only lightly',
  triadic: 'a bold triad — works if one colour leads',
  contrast: 'a strong contrast — the deeper colour holds it together',
  clash: 'these two colours compete with each other',
};

/** Bonuses applied by styleCheck for the classic saree ↔ blouse pairings (points on /10). */
export const SAREE_BLOUSE_RULES = {
  borderPickUp: { bonus: 1.2, text: (blouse: string, saree: string) => `The ${blouse} blouse picks up the ${blouse} in the ${saree} saree's border/embroidery — the classic contrast pairing.` },
  matchingBody: { bonus: 0.8, text: (c: string) => `A matching ${c} blouse makes the drape look long and seamless.` },
  universalGold: { bonus: 0.8, text: () => 'A gold or brocade blouse is the universal partner — it lifts any saree.' },
  multiPickUp: { bonus: 0.3, text: (c: string) => `The ${c} blouse echoes one of the colours in the print.` },
} as const;

/** Fabric weight classes: 3 heavy, 2 medium, 1 light. Matched by substring, first hit wins. */
export const FABRIC_WEIGHT: [string, number][] = [
  ['velvet', 3], ['wool', 3], ['pashmina', 3], ['brocade', 3], ['banarasi', 3], ['kanjivaram', 3],
  ['tissue', 2], ['raw silk', 2], ['silk', 2], ['chanderi', 2], ['crepe', 2], ['satin', 2],
  ['georgette', 1], ['organza', 1], ['net', 1], ['chiffon', 1], ['cotton', 1], ['linen', 1], ['mul', 1], ['crinkle', 1],
];

/** Pairs of fabric keywords that look especially right or wrong together. */
export const FABRIC_PAIRS: { a: string; b: string; delta: number; text: string }[] = [
  { a: 'tissue', b: 'silk', delta: 0.5, text: 'Tissue and silk share the same soft sheen.' },
  { a: 'brocade', b: 'silk', delta: 0.5, text: 'Brocade with silk is the traditional festive pairing.' },
  { a: 'brocade', b: 'georgette', delta: 0.2, text: 'A structured brocade blouse gives a flowing georgette some shape.' },
  { a: 'cotton', b: 'cotton', delta: 0.4, text: 'Cotton with cotton keeps it breathable and easy.' },
  { a: 'cotton', b: 'linen', delta: 0.4, text: 'Cotton and linen share the same relaxed texture.' },
  { a: 'cotton', b: 'brocade', delta: -0.8, text: 'Heavy brocade can overpower a light cotton.' },
  { a: 'cotton', b: 'velvet', delta: -1, text: 'Velvet is much heavier than cotton — they fight each other.' },
  { a: 'linen', b: 'velvet', delta: -1, text: 'Velvet is much heavier than linen — they fight each other.' },
];

/** How dressy each occasion is (1 relaxed … 5 grand). */
export const OCCASION_FORMALITY: Record<string, number> = {
  Daily: 1, Casual: 1, Travel: 1, Work: 2, Haldi: 2, Puja: 3, 'Day function': 3, Mehendi: 3,
  Festive: 4, Sangeet: 4, 'Evening/Party': 4, 'Wedding guest': 4, Wedding: 5,
};

/** Work/fabric words that raise or lower how dressy a piece is. */
export const FORMALITY_WORDS: [string, number][] = [
  ['zardozi', 1.5], ['brocade', 1.2], ['banarasi', 1.2], ['tissue', 1], ['zari', 0.8], ['velvet', 1.2],
  ['sequin', 0.8], ['gota', 0.7], ['parsi gara', 1.2], ['kashmiri', 0.7], ['beads', 0.5], ['pearls', 0.5],
  ['mirror', 0.4], ['chikankari', 0.3], ['organza', 0.3], ['silk', 0.5],
  ['print', -0.6], ['cotton', -0.6], ['linen', -0.6], ['kantha', -0.3], ['crinkle', -0.4],
];

/** Default occasions and season when auto-tagging a new photo. */
export const CATEGORY_DEFAULTS: Record<string, { noun: string; occasions: string[] }> = {
  sarees: { noun: 'saree', occasions: ['Festive', 'Wedding guest'] },
  blouses: { noun: 'blouse', occasions: ['Festive'] },
  suits: { noun: 'kurta set', occasions: ['Festive', 'Casual'] },
  lehengas: { noun: 'lehenga', occasions: ['Wedding', 'Sangeet'] },
  dupattas: { noun: 'dupatta', occasions: ['Festive'] },
  'indo-western': { noun: 'outfit', occasions: ['Evening/Party'] },
  jewellery: { noun: 'jewellery', occasions: ['Festive'] },
  footwear: { noun: 'footwear', occasions: ['Festive'] },
  bags: { noun: 'bag', occasions: ['Festive', 'Evening/Party'] },
  other: { noun: 'piece', occasions: ['Casual'] },
};

/** Extra occasions suggested by a garment's main colour. */
export const COLOUR_OCCASIONS: Record<string, string[]> = {
  ivory: ['Puja', 'Day function'], white: ['Puja', 'Day function'], beige: ['Day function'],
  red: ['Wedding'], maroon: ['Wedding'], yellow: ['Haldi', 'Mehendi'], mustard: ['Haldi', 'Mehendi'],
  green: ['Mehendi'], olive: ['Mehendi'], mint: ['Mehendi', 'Day function'],
  black: ['Evening/Party'], navy: ['Evening/Party'], gold: ['Wedding'], silver: ['Evening/Party'],
  blush: ['Day function'], lavender: ['Day function'], magenta: ['Sangeet'], pink: ['Sangeet'],
  orange: ['Haldi'],
};

/** Occasions that are close enough to count as a match when searching/planning. */
export const RELATED_OCCASIONS: Record<string, string[]> = {
  Mehendi: ['Festive', 'Day function'],
  Haldi: ['Day function', 'Festive', 'Casual'],
  Sangeet: ['Festive', 'Evening/Party'],
  Puja: ['Festive', 'Daily', 'Day function'],
  'Wedding guest': ['Wedding', 'Festive'],
  Wedding: ['Wedding guest'],
  'Evening/Party': ['Evening', 'Party'],
  'Day function': ['Festive'],
  Daily: ['Casual', 'Work'],
  Casual: ['Daily'],
  Work: ['Casual'],
  Travel: ['Casual', 'Daily'],
  Festive: ['Wedding guest'],
};

/** Colours traditionally favoured for an occasion (search hints + shuffle preference). */
export const OCCASION_COLOURS: Record<string, string[]> = {
  Mehendi: ['green', 'yellow', 'olive', 'mustard', 'mint', 'orange'],
  Haldi: ['yellow', 'mustard', 'orange', 'ivory'],
  Puja: ['ivory', 'red', 'yellow', 'maroon', 'white'],
  Wedding: ['red', 'maroon', 'gold', 'magenta', 'green'],
  Sangeet: ['magenta', 'purple', 'teal', 'blue', 'black'],
  'Evening/Party': ['black', 'navy', 'silver', 'gold', 'purple'],
  'Day function': ['blush', 'ivory', 'mint', 'lavender', 'yellow'],
  Festive: ['red', 'green', 'gold', 'magenta', 'teal'],
};

/** Jewellery templates by metal tone. */
export const JEWELLERY_TEXT: Record<string, string> = {
  gold: 'Yellow-gold jewellery — jhumkas or a short necklace — matches the zari.',
  'antique gold': 'Antique gold or temple jewellery suits the deep, warm tones.',
  silver: 'Silver or diamanté keeps it cool and crisp.',
  oxidised: 'Oxidised silver jhumkas and a few bangles keep it relaxed.',
  pearls: 'Pearls (a single strand or pearl drops) flatter the soft, light colours.',
  kundan: 'Kundan or polki sets suit a full wedding look.',
};

/** Footwear by occasion formality band. */
export const FOOTWEAR_TEXT = {
  relaxed: 'Kolhapuris or comfortable flats.',
  medium: 'Embroidered juttis or low block heels.',
  dressy: 'Embellished block heels or zari juttis — comfortable enough for standing.',
  saree: 'With a saree, a small heel helps the pleats fall cleanly.',
  travel: 'Comfortable flats you can walk in all day.',
} as const;

/** Packing-list extras that are not wardrobe pieces. */
export const PACKING_ESSENTIALS: Record<string, string[]> = {
  saree: ['Safety pins', 'Saree petticoat (matching)', 'Saree shaper or pleat clips'],
  suit: ['Dupatta pins'],
  any: ['Jewellery pouch', 'Small sewing kit', 'Garment bags for heavy pieces'],
};

/** Suggestion words for gap analysis: what to buy to complete a pairing. */
export const GAP_FABRIC_FOR_BLOUSE = 'raw-silk';

export const ITEM_NOUN: Record<string, string> = {
  sarees: 'saree', blouses: 'blouse', suits: 'kurta set', lehengas: 'lehenga', dupattas: 'dupatta',
  'indo-western': 'outfit', jewellery: 'jewellery', footwear: 'footwear', bags: 'bag', other: 'piece',
};

/** Verdict templates. {main}, {top}, {rel} etc. are filled with the actual colours. */
export const VERDICT_TEMPLATES = {
  great: '{main} with {top}: {rel}. A lovely, confident choice.',
  good: '{main} with {top}: {rel}. Works well — a small tweak could make it sing.',
  okay: '{main} with {top}: {rel}. It can work, but see the swaps below.',
  weak: '{main} with {top}: {rel}. Try one of the swaps below.',
  single: '{main} on its own — add a {need} to complete the look.',
} as const;
