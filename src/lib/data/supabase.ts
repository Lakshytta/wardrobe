// SupabaseAdapter (production): Postgres + Storage + Realtime, with an offline write queue
// (IndexedDB, FIFO, replayed when back online) and a cached snapshot for offline reads.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Category, Profile, ProfileData, TableName } from '../types.ts';
import type { Change, DataAdapter } from './adapter.ts';
import { idbGet, idbSet } from './idb.ts';

type QueueOp =
  | { op: 'upsert'; table: TableName; row: any }
  | { op: 'remove'; table: TableName; id: string }
  | { op: 'upload'; path: string; blob: Blob; contentType: string };

const QKEY = 'sb-queue-v1';
const BUCKET = 'wardrobe';
const TABLES: TableName[] = ['profiles', 'categories', 'items', 'looks', 'events', 'wears', 'trips', 'celebrations'];

/** Paths uploaded this session but maybe not yet on the server (shown from memory). */
export const localBlobs = new Map<string, string>();

function isNetworkError(e: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg = String((e as any)?.message ?? e);
  return /fetch|network|Failed to fetch|NetworkError|Load failed|timeout/i.test(msg);
}

export class SupabaseAdapter implements DataAdapter {
  readonly kind = 'supabase' as const;
  readonly sb: SupabaseClient;
  private queue: QueueOp[] = [];
  private flushing = false;
  private ready: Promise<void>;
  onPendingChange: (n: number) => void = () => {};

  constructor(readonly url: string, key: string) {
    this.sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    this.ready = idbGet<QueueOp[]>(QKEY).then((q) => { this.queue = q ?? []; this.onPendingChange(this.queue.length); });
    if (typeof window !== 'undefined') window.addEventListener('online', () => void this.flush());
    void this.ready.then(() => this.flush());
  }

  pending() { return this.queue.length; }

  private async saveQueue() { await idbSet(QKEY, this.queue); this.onPendingChange(this.queue.length); }

  private async run(op: QueueOp) {
    if (op.op === 'upsert') {
      const { error } = await this.sb.from(op.table).upsert(op.row);
      if (error) throw error;
    } else if (op.op === 'remove') {
      const { error } = await this.sb.from(op.table).delete().eq('id', op.id);
      if (error) throw error;
    } else {
      const { error } = await this.sb.storage.from(BUCKET).upload(op.path, op.blob, { contentType: op.contentType, upsert: true, cacheControl: '31536000' });
      if (error) throw error;
    }
  }

  private async exec(op: QueueOp) {
    await this.ready;
    if (this.queue.length) { this.queue.push(op); await this.saveQueue(); void this.flush(); return; }
    try { await this.run(op); }
    catch (e) {
      if (!isNetworkError(e)) throw e;
      this.queue.push(op); await this.saveQueue();
    }
  }

  async flush() {
    if (this.flushing || !this.queue.length) return;
    this.flushing = true;
    try {
      while (this.queue.length) {
        try { await this.run(this.queue[0]); }
        catch (e) { if (isNetworkError(e)) break; console.warn('Dropping failed queued write', e); }
        this.queue.shift(); await this.saveQueue();
      }
    } finally { this.flushing = false; }
  }

  private async cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    try { const v = await fetcher(); void idbSet(key, v); return v; }
    catch (e) {
      const c = await idbGet<T>(key);
      if (c !== undefined) return c;
      throw e;
    }
  }

  private async select(table: TableName, profileId?: string) {
    let q = this.sb.from(table).select('*');
    if (profileId) q = q.eq('profile_id', profileId);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }

  /** Applies queued (unsynced) writes on top of server/cached rows so offline edits survive reloads. */
  private overlay<T extends { id: string }>(table: TableName, rows: T[]): T[] {
    const m = new Map(rows.map((r) => [r.id, r]));
    for (const op of this.queue) {
      if (op.op === 'upsert' && op.table === table) m.set(op.row.id, op.row);
      if (op.op === 'remove' && op.table === table) m.delete(op.id);
    }
    return [...m.values()];
  }

  async listProfiles(): Promise<Profile[]> {
    await this.ready;
    const rows = await this.cached('sb-profiles', () => this.select('profiles'));
    return this.overlay('profiles', rows as Profile[]).sort((a, b) => a.sort - b.sort);
  }
  async listCategories(): Promise<Category[]> {
    await this.ready;
    const rows = await this.cached('sb-categories', () => this.select('categories'));
    return this.overlay('categories', rows as Category[]).sort((a, b) => a.sort - b.sort);
  }
  async loadProfile(pid: string): Promise<ProfileData> {
    await this.ready;
    const data = await this.cached(`sb-profile-${pid}`, async () => {
      const [items, looks, events, wears, trips, celebrations] = await Promise.all((['items', 'looks', 'events', 'wears', 'trips', 'celebrations'] as TableName[]).map((t) => this.select(t, pid)));
      return { items, looks, events, wears, trips, celebrations } as ProfileData;
    });
    return {
      items: this.overlay('items', data.items).filter((r) => r.profile_id === pid),
      looks: this.overlay('looks', data.looks).filter((r) => r.profile_id === pid),
      events: this.overlay('events', data.events).filter((r) => r.profile_id === pid),
      wears: this.overlay('wears', data.wears).filter((r) => r.profile_id === pid),
      trips: this.overlay('trips', data.trips).filter((r) => r.profile_id === pid),
      celebrations: this.overlay('celebrations', data.celebrations ?? []).filter((r) => r.profile_id === pid),
    };
  }
  async upsert<T extends { id: string }>(table: TableName, row: T) { await this.exec({ op: 'upsert', table, row }); }
  async remove(table: TableName, id: string) { await this.exec({ op: 'remove', table, id }); }

  async uploadImage(profileId: string, ownerId: string, kind: 'full' | 'thumb' | 'board', blob: Blob) {
    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'webp';
    const path = `${profileId}/${ownerId}/${kind}.${ext}`;
    localBlobs.set(path, URL.createObjectURL(blob));
    await this.exec({ op: 'upload', path, blob, contentType: blob.type || 'image/webp' });
    return path;
  }
  async removeImages(profileId: string, ownerId: string) {
    const paths = ['full', 'thumb', 'board'].flatMap((k) => ['webp', 'jpg', 'png'].map((e) => `${profileId}/${ownerId}/${k}.${e}`));
    try { await this.sb.storage.from(BUCKET).remove(paths); } catch { /* best effort */ }
  }

  subscribe(cb: (c: Change) => void) {
    const ch = this.sb.channel('wardrobe-live');
    for (const t of TABLES) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, (p: any) => {
        if (p.eventType === 'DELETE') cb({ table: t, type: 'delete', row: p.old });
        else cb({ table: t, type: 'upsert', row: p.new });
      });
    }
    ch.subscribe();
    return () => { void this.sb.removeChannel(ch); };
  }

  publicUrl(path: string) { return `${this.url}/storage/v1/object/public/${BUCKET}/${path}`; }
}
