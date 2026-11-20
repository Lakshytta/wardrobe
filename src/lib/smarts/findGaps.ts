import type { Item, Wear } from '../types.ts';
import { COLOURS, colour } from './colors.ts';
import { GAP_FABRIC_FOR_BLOUSE } from './pairings.ts';
import { scoreLook } from './styleCheck.ts';
import { activeItems, slotOf, type Wardrobe } from './wardrobe.ts';

export interface Gap { title: string; why: string; suggestion: string; source: 'rules' }

const GOOD = 7;

function virtualBlouse(c: string): Item {
  return {
    id: `virtual-${c}`, profile_id: '', name: `${c} blouse`, details: '', category_id: 'blouses', primary_color: c,
    accent_colors: [], palette_hex: [], fabric: 'Raw silk', work: '', occasions: ['Festive'], season: 'All-season', tags: [],
    image_url: '', thumb_url: '', phash: null, price: null, status: 'active', care_status: 'in_wardrobe', care_note: '',
    care_due: null, care_contact: '', care_cost: null, lent_to: '', favorite: false, auto_tagged: false,
    created_at: '', updated_at: '', deleted_at: null,
  };
}

/** Best colours for a new blouse to pair with this saree (excluding colours already owned that score 7+). */
export function blouseSuggestions(saree: Item, wardrobe: Wardrobe, n = 2): string[] {
  const cands = COLOURS.filter((c) => !c.neutral && c.family !== 'multi' && c.name !== saree.primary_color).map((c) => c.name);
  return cands
    .map((c) => ({ c, s: scoreLook([saree, virtualBlouse(c)], 'Festive', wardrobe).score + ((saree.accent_colors ?? []).includes(c) ? 0.5 : 0) }))
    .sort((a, b) => b.s - a.s || a.c.localeCompare(b.c))
    .slice(0, n)
    .map((x) => x.c);
}

const SIX_MONTHS = 182;

export function findGaps(wardrobe: Wardrobe, wears: Wear[], opts: { today?: string } = {}): Gap[] {
  const items = activeItems(wardrobe.items);
  const cats = wardrobe.categories;
  const gaps: Gap[] = [];
  const sarees = items.filter((i) => i.category_id === 'sarees');
  const blouses = items.filter((i) => slotOf(i, cats) === 'top');
  const g = (title: string, why: string, suggestion: string) => gaps.push({ title, why, suggestion, source: 'rules' });

  // 1. sarees without a 7+ blouse, or only gold ones
  for (const s of sarees) {
    const scored = blouses.map((b) => ({ b, sc: scoreLook([s, b], 'Festive', wardrobe).score })).filter((x) => x.sc >= GOOD);
    const sugg = blouseSuggestions(s, wardrobe);
    const fab = GAP_FABRIC_FOR_BLOUSE;
    if (!scored.length) {
      g(`The ${s.name.toLowerCase()} has no blouse scoring ${GOOD}+`, `None of your ${blouses.length} blouses pair strongly with its ${s.primary_color}.`, `A ${sugg.join(' or ')} ${fab} blouse would pair well.`);
    } else if (scored.every((x) => x.b.primary_color === 'gold')) {
      g(`The ${s.name.toLowerCase()} only pairs with gold blouses`, `Its best matches are all gold or brocade (${scored.length}). A coloured blouse gives it a second look.`, `A ${sugg.join(' or ')} ${fab} blouse would pair well.`);
    }
  }

  // 2. dupattas for festive suits
  const suits = items.filter((i) => i.category_id === 'suits' && (i.occasions ?? []).some((o) => ['Festive', 'Wedding', 'Wedding guest'].includes(o)));
  const dupattas = items.filter((i) => slotOf(i, cats) === 'layer');
  if (suits.length && !dupattas.some((d) => ['ivory', 'gold', 'beige', 'white'].includes(d.primary_color))) {
    g('No ivory or gold dupatta for festive suits', `You have ${suits.length} festive kurta sets but no neutral dupatta to restyle them.`, 'An ivory or gold organza/tissue dupatta would work with almost all of them.');
  }

  // 3. accessories that make Style check smarter
  if (!items.some((i) => i.category_id === 'jewellery')) g('No jewellery added yet', 'Style check can suggest your own pieces once it knows them.', 'Photograph your go-to sets: one gold, one oxidised, one pearl.');
  if (!items.some((i) => i.category_id === 'footwear')) g('No footwear added yet', 'Footwear tips are generic until your shoes are in.', 'Add your gold juttis and everyday flats.');

  // 4. colour balance among main pieces
  const mains = items.filter((i) => slotOf(i, cats) === 'main');
  if (mains.length >= 6) {
    const fam = new Map<string, number>();
    for (const m of mains) { const f = colour(m.primary_color)?.family ?? 'other'; fam.set(f, (fam.get(f) ?? 0) + 1); }
    const [topFam, cnt] = [...fam.entries()].sort((a, b) => b[1] - a[1])[0];
    if (cnt / mains.length > 0.35) {
      const missing = ['yellow', 'pink', 'red', 'green', 'blue', 'purple', 'orange'].filter((f) => !fam.has(f));
      g(`Lots of ${topFam}`, `${cnt} of your ${mains.length} main outfits are in the ${topFam} family.`, missing.length ? `A ${missing.slice(0, 2).join(' or ')} piece would add variety.` : 'Mix in a lighter or brighter colour for day events.');
    }
    const light = mains.filter((m) => colour(m.primary_color)?.light).length;
    if (light < 2) g('Few light colours for day events', `Only ${light} of your main outfits are light or pastel.`, 'A blush, mint or ivory outfit would cover day functions and pujas.');
    for (const occ of ['Work', 'Haldi', 'Puja'] as const) {
      const n = mains.filter((m) => (m.occasions ?? []).includes(occ)).length;
      if (n === 0) g(`Nothing tagged for ${occ}`, `None of your outfits are tagged ${occ}.`, occ === 'Haldi' ? 'A yellow or mustard cotton kurta set.' : occ === 'Puja' ? 'An ivory or red cotton-silk saree.' : 'Two easy cotton kurta sets for work.');
    }
  }

  // 5. pieces not worn in 6+ months
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const last = new Map<string, string>();
  for (const w of wears) for (const id of w.item_ids) if (!last.has(id) || last.get(id)! < w.date) last.set(id, w.date);
  if (wears.length) {
    const stale = items.filter((i) => slotOf(i, cats) === 'main' && (!last.has(i.id) || (Date.parse(today) - Date.parse(last.get(i.id)!)) / 86400000 > SIX_MONTHS));
    if (stale.length) g(`${stale.length} outfit${stale.length === 1 ? '' : 's'} not worn in 6+ months`, stale.slice(0, 3).map((s) => s.name).join(', ') + (stale.length > 3 ? '…' : ''), 'Plan one of them for your next event, or lend it to someone who will enjoy it.');
  }
  return gaps;
}
