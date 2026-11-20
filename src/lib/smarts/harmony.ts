import { colour, hexToRgb, hueDistance, hueOf, isNeutral, rgbToHsl } from './colors.ts';
import { HARMONY_SCORE, RELATIONSHIP_TEXT, type Relationship } from './pairings.ts';

/** Colour relationship between two named colours (canonical names from the colour table). */
export function relationship(a: string, b: string): Relationship {
  if (!a || !b) return 'neutral';
  if (isNeutral(a) || isNeutral(b)) return 'neutral';
  if (a === 'multi' || b === 'multi') return 'multi';
  if (a === b) return 'tonal';
  const ca = colour(a), cb = colour(b);
  if (ca && cb && ca.family === cb.family) return 'tonal';
  const ha = hueOf(a), hb = hueOf(b);
  if (ha == null || hb == null) return 'neutral';
  const d = hueDistance(ha, hb);
  if (d <= 45) return 'analogous';
  if (d >= 150) return 'complementary';
  if (d >= 105 && d <= 140) return 'triadic';
  const la = ca ? rgbToHsl(hexToRgb(ca.hex))[2] : 0.5;
  const lb = cb ? rgbToHsl(hexToRgb(cb.hex))[2] : 0.5;
  if (Math.min(la, lb) < 0.3) return 'contrast';
  return 'clash';
}

export function harmonyScore(a: string, b: string): number {
  return HARMONY_SCORE[relationship(a, b)];
}

export interface ColourCheckPair { a: string; b: string; rel: Relationship; label: string; ok: boolean; text: string }

const LABEL: Record<Relationship, string> = {
  neutral: 'Neutral anchor', complementary: 'Complementary', tonal: 'Tonal', analogous: 'Analogous',
  multi: 'Multicolour', printPickUp: 'Print pick-up', triadic: 'Bold triad', contrast: 'Strong contrast', clash: 'Clash',
};

/** Instant, free colour check between every pair of colours given. */
export function colourCheck(colours: string[]): ColourCheckPair[] {
  const out: ColourCheckPair[] = [];
  for (let i = 0; i < colours.length; i++) for (let j = i + 1; j < colours.length; j++) {
    const rel = relationship(colours[i], colours[j]);
    out.push({ a: colours[i], b: colours[j], rel, label: LABEL[rel], ok: HARMONY_SCORE[rel] >= 6.5, text: RELATIONSHIP_TEXT[rel] });
  }
  return out;
}
