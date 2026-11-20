export type Slot = 'main' | 'top' | 'layer' | 'accessory';
export type ItemStatus = 'active' | 'review' | 'trashed';
export type CareStatus = 'in_wardrobe' | 'tailor' | 'dry_clean' | 'lent' | 'repair';

export interface Profile {
  id: string;
  name: string;
  color: string;
  avatar_emoji: string;
  sort: number;
  created_at?: string;
}

export interface Category {
  id: string; // slug
  name: string;
  slot: Slot;
  sort: number;
  builtin: boolean;
}

export interface Item {
  id: string;
  profile_id: string;
  name: string;
  details: string;
  category_id: string;
  primary_color: string;
  accent_colors: string[];
  palette_hex: string[];
  fabric: string;
  work: string;
  occasions: string[];
  season: string;
  tags: string[];
  image_url: string;
  thumb_url: string;
  phash: string | null;
  price: number | null;
  status: ItemStatus;
  care_status: CareStatus;
  care_note: string;
  care_due: string | null; // yyyy-mm-dd
  care_contact: string; // tailor / dry-cleaner name
  care_cost: number | null;
  lent_to: string;
  favorite: boolean;
  auto_tagged: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Verdict {
  score: number;
  verdict: string;
  works: string[];
  change: string[];
  swaps: { replace_id: string | null; with_id: string; why: string }[];
  jewellery: string[];
  footwear: string[];
  occasion_fit: string;
  source: 'rules' | 'ai';
}

export interface Look {
  id: string;
  profile_id: string;
  name: string;
  occasion: string;
  notes: string;
  item_ids: string[];
  verdict: Verdict | null;
  score: number | null;
  board_url: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface OutfitOption {
  id: string;
  item_ids: string[]; // the outfit: main + blouse/top + dupatta
  bag_id: string | null;
  jewellery_ids: string[];
  bag_note: string; // for a bag not photographed yet
  jewellery_note: string;
  note: string;
  chosen: boolean; // the final pick for this sub-event
}

export interface Celebration {
  id: string;
  profile_id: string;
  name: string;
  notes: string;
  created_at: string;
}

export interface WEvent {
  id: string;
  profile_id: string;
  title: string;
  date: string | null; // yyyy-mm-dd; sub-events of a celebration may not have a date yet
  occasion: string;
  people: string[];
  look_id: string | null;
  notes: string;
  worn: boolean;
  celebration_id?: string | null;
  sort?: number;
  options?: OutfitOption[];
}

export interface Wear {
  id: string;
  profile_id: string;
  date: string;
  item_ids: string[];
  look_id: string | null;
  event_id: string | null;
  note: string;
}

export interface PackingEntry { id: string; label: string; item_id?: string; checked: boolean }
export interface Packing {
  items: string[];
  outfits: { event_id: string | null; label: string; item_ids: string[] }[];
  why: string;
  checklist: PackingEntry[];
  generated_at: string;
}

export interface Trip {
  id: string;
  profile_id: string;
  name: string;
  start_date: string;
  end_date: string;
  event_ids: string[];
  packing: Packing | null;
}

export interface ProfileData {
  items: Item[];
  looks: Look[];
  events: WEvent[];
  wears: Wear[];
  trips: Trip[];
  celebrations: Celebration[];
}

export type TableName = 'profiles' | 'categories' | 'items' | 'looks' | 'events' | 'wears' | 'trips' | 'celebrations';

export const DEFAULT_OCCASIONS = [
  'Daily', 'Work', 'Casual', 'Puja', 'Festive', 'Mehendi', 'Haldi', 'Sangeet',
  'Wedding guest', 'Wedding', 'Evening/Party', 'Day function', 'Travel',
] as const;

export const SEASONS = ['All-season', 'Summer', 'Monsoon', 'Winter'] as const;

export const CARE_LABEL: Record<CareStatus, string> = {
  in_wardrobe: 'In wardrobe',
  tailor: 'At the tailor',
  dry_clean: 'At dry-clean',
  lent: 'Lent out',
  repair: 'Being repaired',
};
