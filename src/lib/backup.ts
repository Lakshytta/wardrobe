import type { Celebration, Category, Item, Look, Profile, Trip, WEvent, Wear } from './types.ts';

export interface Backup {
  app: 'wardrobe'; version: 1; exported_at: string;
  profile: Profile; categories: Category[];
  items: Item[]; looks: Look[]; events: WEvent[]; wears: Wear[]; trips: Trip[];
  celebrations?: Celebration[]; // added later; older backups do not have it
}

export function makeBackup(b: Omit<Backup, 'app' | 'version' | 'exported_at'>): Backup {
  return { app: 'wardrobe', version: 1, exported_at: new Date().toISOString(), ...b };
}

/** Validates an uploaded backup; returns a readable error or the parsed backup. */
export function parseBackup(text: string): Backup | string {
  let j: any;
  try { j = JSON.parse(text); } catch { return 'That file is not a Wardrobe backup (it is not valid JSON).'; }
  if (j?.app !== 'wardrobe' || j?.version !== 1) return 'That file is not a Wardrobe backup.';
  for (const k of ['items', 'looks', 'events', 'wears', 'trips', 'categories']) if (!Array.isArray(j[k])) return `The backup is missing its ${k}.`;
  if (!j.items.every((i: any) => typeof i?.id === 'string' && typeof i?.name === 'string')) return 'Some pieces in the backup are damaged.';
  return j as Backup;
}

/** Re-homes every row onto the target profile. */
export function rehome(b: Backup, profileId: string): Backup {
  const re = <T extends { profile_id: string }>(rows: T[]) => rows.map((r) => ({ ...r, profile_id: profileId }));
  return { ...b, items: re(b.items), looks: re(b.looks), events: re(b.events), wears: re(b.wears), trips: re(b.trips), celebrations: re(b.celebrations ?? []) };
}
