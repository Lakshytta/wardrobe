// MemoryAdapter: tests + demo. Seeded from APPENDIX A, persisted to IndexedDB, synced across
// tabs with BroadcastChannel (stands in for Supabase Realtime).
import type { Category, Profile, ProfileData, TableName } from '../types.ts';
import type { Change, DataAdapter } from './adapter.ts';
import { DEFAULT_CATEGORIES, SEED_ITEMS, SEED_PROFILE } from './seed.ts';
import { idbGet, idbSet } from './idb.ts';

type DB = Record<TableName, Record<string, any>>;
const KEY = 'memory-db-v1';

function seedDb(): DB {
  const db: DB = { profiles: {}, categories: {}, items: {}, looks: {}, events: {}, wears: {}, trips: {} };
  db.profiles[SEED_PROFILE.id] = SEED_PROFILE;
  for (const c of DEFAULT_CATEGORIES) db.categories[c.id] = c;
  for (const i of SEED_ITEMS) db.items[i.id] = i;
  return db;
}

const blobToDataUrl = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = () => rej(r.error); r.readAsDataURL(b);
});

export class MemoryAdapter implements DataAdapter {
  readonly kind = 'memory' as const;
  private db: DB | null = null;
  private chan = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('wardrobe-memory') : null;
  private listeners = new Set<(c: Change) => void>();

  constructor() {
    this.chan?.addEventListener('message', (e) => {
      const c = e.data as Change;
      if (this.db) {
        if (c.type === 'upsert') this.db[c.table][c.row.id] = c.row; else delete this.db[c.table][c.row.id];
      }
      this.listeners.forEach((l) => l(c));
    });
  }

  private async load(): Promise<DB> {
    if (this.db) return this.db;
    const saved = await idbGet<DB>(KEY);
    this.db = saved ?? seedDb();
    if (!saved) await idbSet(KEY, this.db);
    return this.db;
  }
  private persist() { if (this.db) void idbSet(KEY, this.db); }
  private emit(c: Change) { this.chan?.postMessage(c); }

  async listProfiles(): Promise<Profile[]> { return Object.values((await this.load()).profiles).sort((a, b) => a.sort - b.sort); }
  async listCategories(): Promise<Category[]> { return Object.values((await this.load()).categories).sort((a, b) => a.sort - b.sort); }
  async loadProfile(pid: string): Promise<ProfileData> {
    const db = await this.load();
    const of = (t: TableName) => Object.values(db[t]).filter((r: any) => r.profile_id === pid).map((r) => structuredClone(r));
    return { items: of('items'), looks: of('looks'), events: of('events'), wears: of('wears'), trips: of('trips') };
  }
  async upsert<T extends { id: string }>(table: TableName, row: T) {
    const db = await this.load();
    db[table][row.id] = structuredClone(row);
    this.persist(); this.emit({ table, type: 'upsert', row });
  }
  async remove(table: TableName, id: string) {
    const db = await this.load();
    delete db[table][id];
    this.persist(); this.emit({ table, type: 'delete', row: { id } });
  }
  async uploadImage(_p: string, _o: string, _k: string, blob: Blob) { return blobToDataUrl(blob); }
  async removeImages() { /* data URLs live on the row */ }
  subscribe(cb: (c: Change) => void) { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; }
  pending() { return 0; }
}
