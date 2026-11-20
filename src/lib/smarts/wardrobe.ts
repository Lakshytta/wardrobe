// Small shared helpers over wardrobe data used by every rule.
import type { Category, Item, Slot } from '../types.ts';
import { FORMALITY_WORDS, ITEM_NOUN, FABRIC_WEIGHT } from './pairings.ts';

export interface Wardrobe { items: Item[]; categories?: Category[] }

export const DEFAULT_SLOTS: Record<string, Slot> = {
  sarees: 'main', suits: 'main', lehengas: 'main', 'indo-western': 'main',
  blouses: 'top', dupattas: 'layer', jewellery: 'accessory', footwear: 'accessory', bags: 'accessory', other: 'accessory',
};

export function slotOf(item: Item, cats?: Category[]): Slot {
  const c = cats?.find((x) => x.id === item.category_id);
  return c?.slot ?? DEFAULT_SLOTS[item.category_id] ?? 'accessory';
}

export function nounOf(item: Item): string {
  return ITEM_NOUN[item.category_id] ?? 'piece';
}

/** Items that can actually be worn now (not trashed, not in review, not away). */
export function available(items: Item[]): Item[] {
  return items.filter((i) => i.status === 'active' && !i.deleted_at && (i.care_status ?? 'in_wardrobe') === 'in_wardrobe');
}

export function activeItems(items: Item[]): Item[] {
  return items.filter((i) => i.status === 'active' && !i.deleted_at);
}

const text = (i: Item) => `${i.fabric} ${i.work} ${i.name} ${i.details}`.toLowerCase();

export function fabricWeight(i: Item): number {
  const f = (i.fabric || '').toLowerCase();
  for (const [k, w] of FABRIC_WEIGHT) if (f.includes(k)) return w;
  return 2;
}

export function hasWord(i: Item, w: string): boolean {
  return text(i).includes(w);
}

/** How dressy a piece is, 1–5. */
export function formality(i: Item): number {
  const t = text(i);
  let f = 2.2;
  for (const [w, d] of FORMALITY_WORDS) if (t.includes(w)) f += d;
  return Math.max(1, Math.min(5, f));
}

export function isGoldish(i: Item): boolean {
  return i.primary_color === 'gold' || hasWord(i, 'brocade') || hasWord(i, 'tissue');
}

export function allColours(i: Item): string[] {
  return [i.primary_color, ...(i.accent_colors ?? [])].filter(Boolean);
}

export function describe(i: Item): string {
  return `${i.primary_color === 'multi' ? 'multicolour' : i.primary_color} ${nounOf(i)}`;
}
