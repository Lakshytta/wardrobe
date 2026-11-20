import type { Item } from '../types.ts';
import { OCCASION_COLOURS } from './pairings.ts';
import { occasionMatches } from './parseQuery.ts';
import { scoreLook } from './styleCheck.ts';
import { available, slotOf, type Wardrobe } from './wardrobe.ts';

/** Shuffle a good look for an occasion. `rand` is injectable for tests. */
export function shuffleLook(occasion: string, wardrobe: Wardrobe, rand: () => number = Math.random): string[] {
  const cats = wardrobe.categories;
  const pool = available(wardrobe.items);
  const mainsAll = pool.filter((i) => slotOf(i, cats) === 'main');
  let mains = mainsAll.filter((m) => occasionMatches(m, occasion));
  if (!mains.length) mains = mainsAll;
  if (!mains.length) return [];
  const pref = OCCASION_COLOURS[occasion] ?? [];
  const weighted = mains.flatMap((m) => (pref.includes(m.primary_color) ? [m, m] : [m]));
  const main = weighted[Math.floor(rand() * weighted.length)];
  const look: Item[] = [main];
  const pickTop = (slot: 'top' | 'layer') => {
    const opts = pool.filter((i) => slotOf(i, cats) === slot)
      .map((i) => ({ i, s: scoreLook([...look, i], occasion, wardrobe).score }))
      .filter((x) => x.s >= 7).sort((a, b) => b.s - a.s).slice(0, 3);
    if (opts.length) look.push(opts[Math.floor(rand() * opts.length)].i);
  };
  if (main.category_id === 'sarees' || main.category_id === 'lehengas') pickTop('top');
  pickTop('layer');
  for (const cat of ['jewellery', 'footwear', 'bags']) {
    const acc = pool.filter((i) => i.category_id === cat);
    if (acc.length) look.push(acc[Math.floor(rand() * acc.length)]);
  }
  return look.map((i) => i.id);
}
