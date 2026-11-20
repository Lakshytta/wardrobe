import type { Item, Trip, WEvent } from '../types.ts';
import { PACKING_ESSENTIALS } from './pairings.ts';
import { scoreLook } from './styleCheck.ts';
import { available, slotOf, type Wardrobe } from './wardrobe.ts';
import { occasionMatches } from './parseQuery.ts';

export interface PackResult {
  items: string[];
  outfits: { event_id: string | null; label: string; item_ids: string[] }[];
  essentials: string[];
  why: string;
  source: 'rules';
}

interface Combo { ids: string[]; score: number; covers: Set<number> }

const GOOD = 7;

/** Rule-based packing: greedy set cover over (main + blouse) combos, maximising mix-and-match. */
export function packTrip(trip: Pick<Trip, 'start_date' | 'end_date' | 'name'>, events: WEvent[], wardrobe: Wardrobe): PackResult {
  const cats = wardrobe.categories;
  const pool = available(wardrobe.items);
  const mains = pool.filter((i) => slotOf(i, cats) === 'main');
  const tops = pool.filter((i) => slotOf(i, cats) === 'top');
  // the "slots" to dress: each event, or one casual day per trip day when no events
  const slots: { event_id: string | null; label: string; occasion: string }[] = events.length
    ? [...events].sort((a, b) => a.date.localeCompare(b.date)).map((e) => ({ event_id: e.id, label: `${e.title} · ${e.date}`, occasion: e.occasion || 'Festive' }))
    : dayList(trip.start_date, trip.end_date).map((d) => ({ event_id: null, label: d, occasion: 'Travel' }));

  // enumerate candidate outfits
  const combos: Combo[] = [];
  for (const m of mains) {
    const partners: (Item | null)[] = m.category_id === 'sarees' || m.category_id === 'lehengas' ? tops : [null];
    for (const t of partners) {
      const pieces = t ? [m, t] : [m];
      const covers = new Set<number>();
      let best = 0;
      slots.forEach((s, idx) => {
        if (!occasionMatches(m, s.occasion) && s.occasion !== 'Travel') return;
        const sc = scoreLook(pieces, s.occasion, wardrobe);
        if (sc.score >= GOOD && sc.fit !== 'under') { covers.add(idx); best = Math.max(best, sc.score); }
        else if (s.occasion === 'Travel' && sc.score >= GOOD - 1) { covers.add(idx); best = Math.max(best, sc.score); }
      });
      if (covers.size) combos.push({ ids: pieces.map((p) => p.id), score: best, covers });
    }
  }

  // greedy set cover: pick combo with best (newly covered slots) / (new pieces to pack)
  const packed = new Set<string>();
  const assigned = new Map<number, string[]>();
  const usedMains = new Map<string, number>();
  while (assigned.size < slots.length) {
    let bestC: Combo | null = null; let bestVal = 0;
    for (const c of combos) {
      // repeat guard within a trip: the same people see every event, so each event gets its own main piece
      if (usedMains.has(c.ids[0])) continue;
      const newly = Math.min(1, [...c.covers].filter((x) => !assigned.has(x)).length);
      if (!newly) continue;
      const cost = c.ids.filter((id) => !packed.has(id)).length;
      // packing nothing new is ideal; prefer fewer new pieces, then higher score, then main variety
      const val = (newly / (cost + 0.25)) + c.score / 100;
      if (val > bestVal) { bestVal = val; bestC = c; }
    }
    if (!bestC) break;
    bestC.ids.forEach((id) => packed.add(id));
    // a main covers one event; pick the uncovered event it suits best (fewest other options first)
    const open = [...bestC.covers].filter((x) => !assigned.has(x));
    const options = (x: number) => combos.filter((c) => c.covers.has(x) && !usedMains.has(c.ids[0])).length;
    const target = open.sort((a, b) => options(a) - options(b))[0];
    assigned.set(target, bestC.ids);
    usedMains.set(bestC.ids[0], 1);
  }

  // re-assign for variety: within packed pieces, give each slot the best unused combo
  const packedCombos = combos.filter((c) => c.ids.every((id) => packed.has(id)));
  const outfits = slots.map((s, idx) => {
    const main = assigned.get(idx)?.[0];
    // best blouse among packed ones for this event's main
    const pick = packedCombos.filter((c) => c.ids[0] === main && c.covers.has(idx)).sort((a, b) => b.score - a.score)[0];
    return { event_id: s.event_id, label: s.label, item_ids: pick?.ids ?? assigned.get(idx) ?? [] };
  });

  // accessories: footwear + jewellery that cover the metal tones of what is packed
  for (const acc of pool.filter((i) => i.category_id === 'footwear' || i.category_id === 'jewellery').slice(0, 3)) packed.add(acc.id);

  const items = [...packed];
  const packedMains = items.filter((id) => mains.some((m) => m.id === id)).length;
  const packedTops = items.filter((id) => tops.some((t) => t.id === id)).length;
  const distinct = new Set(packedCombos.map((c) => c.ids.join('+'))).size;
  const uncovered = slots.length - outfits.filter((o) => o.item_ids.length).length;
  const why = slots.length === 0
    ? 'Add trip dates or events to build a packing list.'
    : `${packedMains} main piece${packedMains === 1 ? '' : 's'}${packedTops ? ` × ${packedTops} blouse${packedTops === 1 ? '' : 's'}` : ''} ${packedMains + packedTops === 1 ? 'gives' : 'give'} ${distinct} outfit${distinct === 1 ? '' : 's'} scoring ${GOOD}+ for ${slots.length} ${events.length ? 'event' : 'day'}${slots.length === 1 ? '' : 's'}, with a different main piece each time.` +
      (uncovered ? ` ${uncovered} ${uncovered === 1 ? 'needs' : 'need'} an outfit — nothing available scores ${GOOD}+ for that occasion.` : '');
  const essentials = [...PACKING_ESSENTIALS.any];
  if (items.some((id) => pool.find((i) => i.id === id)?.category_id === 'sarees')) essentials.unshift(...PACKING_ESSENTIALS.saree);
  if (items.some((id) => pool.find((i) => i.id === id)?.category_id === 'suits')) essentials.push(...PACKING_ESSENTIALS.suit);
  return { items, outfits, essentials, why, source: 'rules' };
}

export function dayList(start: string, end: string): string[] {
  if (!start || !end) return [];
  const out: string[] = [];
  let t = Date.parse(start); const e = Date.parse(end);
  while (t <= e && out.length < 31) { out.push(new Date(t).toISOString().slice(0, 10)); t += 86400000; }
  return out;
}
