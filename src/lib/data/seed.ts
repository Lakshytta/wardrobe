// Seed data: APPENDIX A (verified catalogue) + derived palettes/pHashes. Used by the
// MemoryAdapter (tests/demo) and by scripts/seed-sql.mjs for Supabase.
import type { Category, Item, Profile } from '../types.ts';
import catalogue from './catalogue.json' with { type: 'json' };
import derived from './seed-derived.json' with { type: 'json' };

export const SEED_PROFILE_ID = '5eed0000-0000-4000-8000-000000000001';
export const SEED_TIME = '2026-11-20T00:00:00.000Z';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'sarees', name: 'Sarees', slot: 'main', sort: 1, builtin: true },
  { id: 'blouses', name: 'Blouses', slot: 'top', sort: 2, builtin: true },
  { id: 'suits', name: 'Suits & Kurta sets', slot: 'main', sort: 3, builtin: true },
  { id: 'lehengas', name: 'Lehengas', slot: 'main', sort: 4, builtin: true },
  { id: 'dupattas', name: 'Dupattas & Shawls', slot: 'layer', sort: 5, builtin: true },
  { id: 'indo-western', name: 'Indo-Western', slot: 'main', sort: 6, builtin: true },
  { id: 'jewellery', name: 'Jewellery', slot: 'accessory', sort: 7, builtin: true },
  { id: 'footwear', name: 'Footwear', slot: 'accessory', sort: 8, builtin: true },
  { id: 'bags', name: 'Bags', slot: 'accessory', sort: 9, builtin: true },
  { id: 'other', name: 'Other', slot: 'accessory', sort: 10, builtin: true },
];

export const SEED_PROFILE: Profile = { id: SEED_PROFILE_ID, name: 'My Wardrobe', color: '#0B6B62', avatar_emoji: '🌸', sort: 0, created_at: SEED_TIME };

export function seedItemId(ref: string): string {
  return `5eed0000-0000-4000-8000-${ref.replace(/\D/g, '').padStart(12, '0')}`;
}

type CatRow = (typeof catalogue)[number];
const D = derived as Record<string, { palette_hex: string[]; phash: string }>;

export function blankItem(over: Partial<Item> = {}): Item {
  return {
    id: '', profile_id: SEED_PROFILE_ID, name: '', details: '', category_id: 'other', primary_color: 'multi',
    accent_colors: [], palette_hex: [], fabric: '', work: '', occasions: [], season: 'All-season', tags: [],
    image_url: '', thumb_url: '', phash: null, price: null, status: 'active', care_status: 'in_wardrobe',
    care_note: '', care_due: null, care_contact: '', care_cost: null, lent_to: '', favorite: false,
    auto_tagged: false, created_at: SEED_TIME, updated_at: SEED_TIME, deleted_at: null, ...over,
  };
}

export const SEED_ITEMS: Item[] = (catalogue as CatRow[]).map((c, i) =>
  blankItem({
    id: seedItemId(c.ref),
    name: c.name,
    details: c.details,
    category_id: c.category_id,
    primary_color: c.primary_color,
    accent_colors: c.accent_colors,
    palette_hex: D[c.ref]?.palette_hex ?? [],
    phash: D[c.ref]?.phash ?? null,
    fabric: c.fabric,
    work: c.work,
    occasions: c.occasions,
    season: c.season,
    tags: [...(c.tags ?? []), c.ref],
    image_url: `/seed/${c.ref}.full.webp`,
    thumb_url: `/seed/${c.ref}.thumb.webp`,
    created_at: new Date(Date.parse(SEED_TIME) + i * 1000).toISOString(),
    updated_at: new Date(Date.parse(SEED_TIME) + i * 1000).toISOString(),
  }),
);

export function seedRef(item: Item): string | undefined {
  return item.tags.find((t) => /^p\d{4}$/.test(t));
}
