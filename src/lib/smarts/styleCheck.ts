// Rule-based style check. Deterministic and pure.
import type { Item, Verdict } from '../types.ts';
import { colour } from './colors.ts';
import { relationship } from './harmony.ts';
import {
  FABRIC_PAIRS, FOOTWEAR_TEXT, HARMONY_SCORE, JEWELLERY_TEXT, OCCASION_FORMALITY,
  RELATIONSHIP_TEXT, SAREE_BLOUSE_RULES, VERDICT_TEMPLATES,
} from './pairings.ts';
import {
  allColours, available, describe, fabricWeight, formality, hasWord, isGoldish, nounOf, slotOf, type Wardrobe,
} from './wardrobe.ts';

export interface LookScore {
  score: number;
  harmony: number;
  rel: string | null; // main ↔ top/layer relationship
  works: string[];
  change: string[];
  fit: 'great' | 'ok' | 'under' | 'over';
  fitText: string;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const article = (w: string) => (/^[aeiou]/i.test(w) ? 'an' : 'a');

function pairRel(a: Item, b: Item) {
  let rel = relationship(a.primary_color, b.primary_color);
  // a multicolour print, or a multi accent, can pick up the other colour
  if (rel === 'clash' || rel === 'contrast' || rel === 'triadic') {
    if ((a.accent_colors ?? []).includes(b.primary_color) || (b.accent_colors ?? []).includes(a.primary_color)) rel = 'tonal';
    else if ((a.accent_colors ?? []).includes('multi') || (b.accent_colors ?? []).includes('multi')) rel = 'printPickUp';
  }
  return rel;
}

/** Month 1–12 → is it the warm half of the Indian year? */
const isWarmMonth = (m: number) => m >= 3 && m <= 9;

export function scoreLook(pieces: Item[], occasion: string, wardrobe: Wardrobe, opts: { month?: number } = {}): LookScore {
  const cats = wardrobe.categories;
  const main = pieces.find((p) => slotOf(p, cats) === 'main') ?? pieces[0];
  const top = pieces.find((p) => p !== main && slotOf(p, cats) === 'top');
  const layer = pieces.find((p) => p !== main && slotOf(p, cats) === 'layer');
  const works: string[] = []; const change: string[] = [];
  if (!main) return { score: 0, harmony: 0, rel: null, works, change, fit: 'ok', fitText: '' };

  // 1. colour harmony
  const pairs: [Item, Item, number][] = [];
  if (top) pairs.push([main, top, 1]);
  if (layer) pairs.push([main, layer, 0.7]);
  if (top && layer) pairs.push([top, layer, 0.5]);
  let harmony = 7; let rel: string | null = null;
  if (pairs.length) {
    let s = 0, w = 0;
    for (const [a, b, wt] of pairs) {
      const r = pairRel(a, b);
      s += HARMONY_SCORE[r] * wt; w += wt;
      if (a === main && rel == null) rel = r;
      if (HARMONY_SCORE[r] >= 7.5) works.push(`${cap(describe(a))} + ${describe(b)}: ${RELATIONSHIP_TEXT[r]}.`);
      else change.push(`${cap(describe(a))} + ${describe(b)}: ${RELATIONSHIP_TEXT[r]}.`);
    }
    harmony = s / w;
  }

  // 2. classic saree ↔ blouse (and suit ↔ dupatta) pairings
  let bonus = 0;
  const partner = top ?? layer;
  if (partner) {
    const accents = (main.accent_colors ?? []).filter((c) => c !== 'multi');
    const R = SAREE_BLOUSE_RULES;
    if (partner.primary_color !== main.primary_color && accents.includes(partner.primary_color) && !['gold'].includes(partner.primary_color)) {
      bonus += R.borderPickUp.bonus; works.push(R.borderPickUp.text(partner.primary_color, main.primary_color));
    } else if (partner.primary_color === main.primary_color) {
      bonus += R.matchingBody.bonus; works.push(R.matchingBody.text(partner.primary_color));
    } else if ((main.accent_colors ?? []).includes('multi') && !colour(partner.primary_color)?.neutral) {
      bonus += R.multiPickUp.bonus; works.push(R.multiPickUp.text(partner.primary_color));
    }
    if (top && isGoldish(top)) { bonus += R.universalGold.bonus; works.push(R.universalGold.text()); }
    bonus = Math.min(bonus, 1.5);
  }

  // 3. fabric weight compatibility
  let fabric = 0;
  if (partner) {
    const fa = `${main.fabric} ${main.work}`.toLowerCase(), fb = `${partner.fabric} ${partner.work}`.toLowerCase();
    let matched = false;
    for (const p of FABRIC_PAIRS) {
      if ((fa.includes(p.a) && fb.includes(p.b)) || (fa.includes(p.b) && fb.includes(p.a))) {
        fabric += p.delta; matched = true;
        (p.delta >= 0 ? works : change).push(p.text);
        break;
      }
    }
    if (!matched && Math.abs(fabricWeight(main) - fabricWeight(partner)) >= 2) {
      fabric -= 0.4; change.push(`The ${partner.fabric.toLowerCase() || nounOf(partner)} is much heavier or lighter than the ${main.fabric.toLowerCase() || nounOf(main)}.`);
    }
  }

  // 4. occasion formality
  const target = OCCASION_FORMALITY[occasion] ?? 3;
  const others = pieces.filter((p) => p !== main && slotOf(p, cats) !== 'accessory');
  const lookF = others.length ? 0.6 * formality(main) + 0.4 * Math.max(...others.map(formality)) : formality(main);
  const diff = lookF - target;
  let fit: LookScore['fit'] = 'great'; let fitText = `Just right for ${occasion || 'the day'}.`; let occ = 0;
  if (diff < -1.2) {
    fit = 'under'; occ = -Math.min(2, (Math.abs(diff) - 1) * 1.2);
    fitText = `A little simple for ${occasion}. Something with zari, zardozi or brocade would feel more special.`;
    change.push(fitText);
  } else if (diff > 1.8) {
    fit = 'over'; occ = -Math.min(1.5, (diff - 1.8) * 0.8);
    fitText = `Quite grand for ${occasion}. Keep the jewellery light, or save this for a bigger day.`;
    change.push(fitText);
  } else if (Math.abs(diff) > 0.8) {
    fit = 'ok'; fitText = `Suits ${occasion}.`;
  } else if (occasion) works.push(fitText);

  // 5. season
  let season = 0;
  if (opts.month) {
    const warm = isWarmMonth(opts.month);
    const winterPiece = pieces.find((p) => p.season === 'Winter' || hasWord(p, 'velvet') || hasWord(p, 'wool'));
    if (warm && winterPiece) { season = -1; change.push(`${cap(winterPiece.name)} is warm for this time of year — keep it for winter evenings.`); }
    const summerPiece = pieces.find((p) => p.season === 'Summer');
    if (!warm && summerPiece && [12, 1].includes(opts.month)) { season = -0.3; change.push(`${cap(summerPiece.name)} is light for midwinter — carry a shawl.`); }
  }

  const score = Math.max(1, Math.min(10, round1(harmony + bonus + fabric + occ + season)));
  return { score, harmony, rel, works: dedupe(works), change: dedupe(change), fit, fitText };
}

function dedupe(a: string[]) { return [...new Set(a)]; }

function jewelleryTips(pieces: Item[], occasion: string, wardrobe: Wardrobe): string[] {
  const cols = pieces.flatMap(allColours);
  const tones = new Set<string>();
  const heavyWork = pieces.some((p) => hasWord(p, 'zardozi') || hasWord(p, 'antique') || hasWord(p, 'kashmiri'));
  if (cols.includes('silver')) tones.add('silver');
  if (cols.includes('gold') || cols.includes('copper')) tones.add(heavyWork ? 'antique gold' : 'gold');
  const main = pieces[0];
  const mainMetal = colour(main?.primary_color)?.metal;
  if (!tones.size && mainMetal) tones.add(mainMetal);
  if (['Casual', 'Work', 'Daily', 'Travel'].includes(occasion) && pieces.some((p) => hasWord(p, 'cotton') || hasWord(p, 'print'))) {
    tones.clear(); tones.add('oxidised');
  }
  if (pieces.some((p) => colour(p.primary_color)?.light) && ['Day function', 'Puja', 'Wedding guest', 'Mehendi'].includes(occasion)) tones.add('pearls');
  const tips = [...tones].map((t) => JEWELLERY_TEXT[t]).filter(Boolean);
  if (occasion === 'Wedding') tips.push(JEWELLERY_TEXT.kundan);
  const own = available(wardrobe.items).filter((i) => i.category_id === 'jewellery');
  const match = own.find((j) => [...tones].some((t) => allColours(j).includes(t.replace('antique ', '')) || `${j.name} ${j.details}`.toLowerCase().includes(t)));
  if (match) tips.unshift(`From your jewellery: ${match.name}.`);
  return tips.slice(0, 3);
}

function footwearTips(pieces: Item[], occasion: string, wardrobe: Wardrobe): string[] {
  const f = OCCASION_FORMALITY[occasion] ?? 3;
  const tips: string[] = [];
  if (occasion === 'Travel') tips.push(FOOTWEAR_TEXT.travel);
  else tips.push(f <= 2 ? FOOTWEAR_TEXT.relaxed : f <= 3 ? FOOTWEAR_TEXT.medium : FOOTWEAR_TEXT.dressy);
  if (pieces.some((p) => p.category_id === 'sarees') && f >= 3) tips.push(FOOTWEAR_TEXT.saree);
  const cols = pieces.flatMap(allColours);
  if (cols.includes('gold')) tips.push('Gold or tan footwear picks up the zari.');
  else if (cols.includes('silver')) tips.push('Silver or grey footwear matches the silver accents.');
  const own = available(wardrobe.items).find((i) => i.category_id === 'footwear');
  if (own) tips.unshift(`From your footwear: ${own.name}.`);
  return tips.slice(0, 3);
}

/** Full style check with swaps chosen ONLY from the given wardrobe. */
export function styleCheck(itemIds: string[], occasion: string, wardrobe: Wardrobe, opts: { month?: number } = {}): Verdict {
  const byId = new Map(wardrobe.items.map((i) => [i.id, i]));
  const pieces = itemIds.map((id) => byId.get(id)).filter((x): x is Item => !!x);
  const cats = wardrobe.categories;
  // put main first
  pieces.sort((a, b) => (slotOf(a, cats) === 'main' ? -1 : 0) - (slotOf(b, cats) === 'main' ? -1 : 0));
  if (!pieces.length) {
    return { score: 0, verdict: 'Pick at least one piece to check.', works: [], change: [], swaps: [], jewellery: [], footwear: [], occasion_fit: '', source: 'rules' };
  }
  const base = scoreLook(pieces, occasion, wardrobe, opts);
  const main = pieces[0];
  const top = pieces.find((p) => p !== main && slotOf(p, cats) === 'top');
  const layer = pieces.find((p) => p !== main && slotOf(p, cats) === 'layer');
  const partner = top ?? layer;

  // verdict text
  let verdict: string;
  const mainTxt = `${cap(main.primary_color === 'multi' ? 'multicolour' : main.primary_color)} ${nounOf(main)}`;
  if (!partner) {
    const need = main.category_id === 'sarees' ? 'blouse' : main.category_id === 'suits' ? 'dupatta or jewellery' : 'second piece';
    verdict = VERDICT_TEMPLATES.single.replace('{main}', mainTxt).replace('{need}', need);
  } else {
    const t = base.score >= 8.5 ? 'great' : base.score >= 7 ? 'good' : base.score >= 5.5 ? 'okay' : 'weak';
    const pc = partner.primary_color === 'multi' ? 'multicolour' : partner.primary_color;
    verdict = VERDICT_TEMPLATES[t]
      .replace('{main}', mainTxt)
      .replace('{top}', `${article(pc)} ${pc} ${nounOf(partner)}`)
      .replace('{rel}', RELATIONSHIP_TEXT[(base.rel ?? 'neutral') as keyof typeof RELATIONSHIP_TEXT]);
  }

  // swaps — only from the wardrobe, only pieces that are actually available
  const pool = available(wardrobe.items).filter((i) => !itemIds.includes(i.id));
  type Cand = { replace_id: string | null; with_id: string; score: number; why: string };
  const cands: Cand[] = [];
  const tryReplace = (target: Item | undefined, slot: 'top' | 'layer' | 'main') => {
    for (const c of pool.filter((i) => slotOf(i, cats) === slot)) {
      if (slot === 'top' && main.category_id !== 'sarees' && main.category_id !== 'lehengas') continue;
      const next = target ? pieces.map((p) => (p === target ? c : p)) : [...pieces, c];
      const s = scoreLook(next, occasion, wardrobe, opts);
      const anchor = slot === 'main' ? (top ?? layer)! : main;
      const r = anchor ? pairRel(slot === 'main' ? c : anchor, slot === 'main' ? anchor : c) : 'neutral';
      cands.push({
        replace_id: target?.id ?? null, with_id: c.id, score: s.score,
        why: `${c.name}: ${RELATIONSHIP_TEXT[r]}${target ? '' : ' — completes the look'} (${s.score}/10).`,
      });
    }
  };
  if (main.category_id === 'sarees' || main.category_id === 'lehengas') tryReplace(top, 'top');
  if (layer || main.category_id === 'suits') tryReplace(layer, 'layer');
  if (partner && base.score < 7) tryReplace(main, 'main');
  const minGain = 0.3;
  const picked: Cand[] = [];
  for (const c of cands.sort((a, b) => b.score - a.score || a.with_id.localeCompare(b.with_id))) {
    if (c.score < base.score + minGain && c.replace_id) continue;
    if (!c.replace_id && c.score < 6.5) continue;
    if (picked.some((p) => p.with_id === c.with_id)) continue;
    picked.push(c);
    if (picked.length === 3) break;
  }
  const swaps = validateSwaps(picked.map(({ replace_id, with_id, why }) => ({ replace_id, with_id, why })), itemIds, wardrobe);

  if (base.score < 7 && !swaps.length && partner) base.change.push('Nothing in your wardrobe scores much higher here — see Insights for what to add.');

  return {
    score: base.score,
    verdict,
    works: base.works.slice(0, 5),
    change: base.change.slice(0, 5),
    swaps,
    jewellery: jewelleryTips(pieces, occasion, wardrobe),
    footwear: footwearTips(pieces, occasion, wardrobe),
    occasion_fit: base.fitText,
    source: 'rules',
  };
}

/** Enforces: every with_id is in the wardrobe, every replace_id is in the look. */
export function validateSwaps<T extends { replace_id: string | null; with_id: string }>(swaps: T[], itemIds: string[], wardrobe: Wardrobe): T[] {
  const ids = new Set(wardrobe.items.map((i) => i.id));
  return swaps.filter((s) => ids.has(s.with_id) && !itemIds.includes(s.with_id) && (s.replace_id === null || itemIds.includes(s.replace_id)));
}

export function applySwap(itemIds: string[], swap: { replace_id: string | null; with_id: string }): string[] {
  if (!swap.replace_id) return [...itemIds, swap.with_id];
  return itemIds.map((id) => (id === swap.replace_id ? swap.with_id : id));
}
