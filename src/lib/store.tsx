import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Category, Item, Look, Profile, ProfileData, TableName, Trip, WEvent, Wear } from './types.ts';
import { adapter } from './data/index.ts';
import { uuid } from './data/adapter.ts';
import { SupabaseAdapter } from './data/supabase.ts';

export interface Toast { id: number; text: string; undo?: () => void; tone?: 'info' | 'error' }

const EMPTY: ProfileData = { items: [], looks: [], events: [], wears: [], trips: [] };
const TRASH_DAYS = 30;
const UNDO_MS = 8000;
const LS_PROFILE = 'wardrobe-profile';

type Key = keyof ProfileData;
const TABLE_KEY: Partial<Record<TableName, Key>> = { items: 'items', looks: 'looks', events: 'events', wears: 'wears', trips: 'trips' };

function lsGet(k: string) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* private mode */ } }

export const nowIso = () => new Date().toISOString();
export const today = () => new Date().toISOString().slice(0, 10);

function useStoreValue() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profileId, setProfileId] = useState<string>(lsGet(LS_PROFILE) ?? '');
  const [data, setData] = useState<ProfileData>(EMPTY);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState(adapter.pending());
  const pidRef = useRef(profileId);
  pidRef.current = profileId;

  const toast = useCallback((text: string, undo?: () => void, tone: Toast['tone'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, undo, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), undo ? UNDO_MS : 4000);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const fail = useCallback((e: unknown) => {
    console.error(e);
    toast(`Could not save: ${(e as any)?.message ?? 'please try again'}`, undefined, 'error');
  }, [toast]);

  // ---------- loading ----------
  const loadProfile = useCallback(async (pid: string) => {
    const d = await adapter.loadProfile(pid);
    // purge trash older than 30 days
    const cutoff = Date.now() - TRASH_DAYS * 86400000;
    const old = d.items.filter((i) => i.deleted_at && Date.parse(i.deleted_at) < cutoff);
    for (const i of old) { void adapter.remove('items', i.id); void adapter.removeImages(i.profile_id, i.id); }
    const oldLooks = d.looks.filter((l) => l.deleted_at && Date.parse(l.deleted_at) < cutoff);
    for (const l of oldLooks) void adapter.remove('looks', l.id);
    setData({
      ...d,
      items: d.items.filter((i) => !old.includes(i)),
      looks: d.looks.filter((l) => !oldLooks.includes(l)),
    });
  }, []);

  useEffect(() => {
    if (adapter instanceof SupabaseAdapter) adapter.onPendingChange = setPending;
    (async () => {
      try {
        const [ps, cs] = await Promise.all([adapter.listProfiles(), adapter.listCategories()]);
        setProfiles(ps); setCategories(cs);
        const pid = ps.find((p) => p.id === pidRef.current)?.id ?? ps[0]?.id ?? '';
        setProfileId(pid);
        if (pid) await loadProfile(pid);
        setReady(true);
      } catch (e) {
        console.error(e);
        setError('Could not load your wardrobe. Check your connection and try again.');
        setReady(true);
      }
    })();
  }, [loadProfile]);

  // ---------- realtime ----------
  useEffect(() => adapter.subscribe((c) => {
    if (c.table === 'profiles') {
      setProfiles((ps) => c.type === 'delete' ? ps.filter((p) => p.id !== c.row.id) : upsertBy(ps, c.row as Profile).sort((a, b) => a.sort - b.sort));
      return;
    }
    if (c.table === 'categories') {
      setCategories((cs) => c.type === 'delete' ? cs.filter((p) => p.id !== c.row.id) : upsertBy(cs, c.row as Category).sort((a, b) => a.sort - b.sort));
      return;
    }
    const key = TABLE_KEY[c.table];
    if (!key) return;
    if (c.type === 'upsert' && c.row.profile_id !== pidRef.current) return;
    setData((d) => ({ ...d, [key]: c.type === 'delete' ? (d[key] as any[]).filter((r) => r.id !== c.row.id) : upsertBy(d[key] as any[], c.row) }));
  }), []);

  // ---------- generic write helpers ----------
  const put = useCallback(async <T extends { id: string }>(table: TableName, row: T) => {
    const key = TABLE_KEY[table];
    if (key) setData((d) => ({ ...d, [key]: upsertBy(d[key] as any[], row) }));
    try { await adapter.upsert(table, row); } catch (e) { fail(e); }
  }, [fail]);

  const del = useCallback(async (table: TableName, id: string) => {
    const key = TABLE_KEY[table];
    if (key) setData((d) => ({ ...d, [key]: (d[key] as any[]).filter((r) => r.id !== id) }));
    try { await adapter.remove(table, id); } catch (e) { fail(e); }
  }, [fail]);

  // ---------- profiles ----------
  const switchProfile = useCallback(async (id: string) => {
    setProfileId(id); lsSet(LS_PROFILE, id); setData(EMPTY);
    try { await loadProfile(id); } catch (e) { fail(e); }
  }, [loadProfile, fail]);

  const saveProfile = useCallback(async (p: Partial<Profile> & { name: string }) => {
    const row: Profile = { id: p.id ?? uuid(), name: p.name, color: p.color ?? '#0B6B62', avatar_emoji: p.avatar_emoji ?? '🌸', sort: p.sort ?? profiles.length, created_at: p.created_at ?? nowIso() };
    setProfiles((ps) => upsertBy(ps, row).sort((a, b) => a.sort - b.sort));
    try { await adapter.upsert('profiles', row); } catch (e) { fail(e); }
    return row;
  }, [profiles.length, fail]);

  // ---------- items ----------
  const saveItem = useCallback(async (it: Item) => put('items', { ...it, updated_at: nowIso() }), [put]);

  const trashItem = useCallback(async (it: Item) => {
    const before = it;
    await put('items', { ...it, status: 'trashed', deleted_at: nowIso() } as Item);
    toast(`“${it.name}” moved to Trash`, () => void put('items', before));
  }, [put, toast]);

  const restoreItem = useCallback(async (it: Item) => {
    await put('items', { ...it, status: 'active', deleted_at: null } as Item);
    toast(`“${it.name}” is back in your wardrobe`);
  }, [put, toast]);

  const purgeItem = useCallback(async (it: Item) => {
    await del('items', it.id);
    void adapter.removeImages(it.profile_id, it.id);
  }, [del]);

  // ---------- looks ----------
  const saveLook = useCallback(async (l: Look) => put('looks', { ...l, updated_at: nowIso() }), [put]);
  const trashLook = useCallback(async (l: Look) => {
    await put('looks', { ...l, deleted_at: nowIso() });
    toast(`Look “${l.name}” moved to Trash`, () => void put('looks', l));
  }, [put, toast]);
  const restoreLook = useCallback(async (l: Look) => { await put('looks', { ...l, deleted_at: null }); toast(`Look “${l.name}” restored`); }, [put, toast]);
  const purgeLook = useCallback(async (l: Look) => del('looks', l.id), [del]);

  // ---------- events / wears / trips (hard delete with undo) ----------
  const saveEvent = useCallback((e: WEvent) => put('events', e), [put]);
  const deleteEvent = useCallback(async (e: WEvent) => {
    await del('events', e.id);
    toast(`Event “${e.title}” deleted`, () => void put('events', e));
  }, [del, put, toast]);
  const saveWear = useCallback((w: Wear) => put('wears', w), [put]);
  const deleteWear = useCallback(async (w: Wear) => {
    await del('wears', w.id);
    toast('Wear removed', () => void put('wears', w));
  }, [del, put, toast]);
  const saveTrip = useCallback((t: Trip) => put('trips', t), [put]);
  const deleteTrip = useCallback(async (t: Trip) => {
    await del('trips', t.id);
    toast(`Trip “${t.name}” deleted`, () => void put('trips', t));
  }, [del, put, toast]);

  // ---------- categories ----------
  const saveCategory = useCallback(async (c: Category) => {
    setCategories((cs) => upsertBy(cs, c).sort((a, b) => a.sort - b.sort));
    try { await adapter.upsert('categories', c); } catch (e) { fail(e); }
  }, [fail]);
  const deleteCategory = useCallback(async (c: Category) => {
    setCategories((cs) => cs.filter((x) => x.id !== c.id));
    try { await adapter.remove('categories', c.id); } catch (e) { fail(e); }
    toast(`Category “${c.name}” deleted`, () => void saveCategory(c));
  }, [fail, toast, saveCategory]);

  const profile = profiles.find((p) => p.id === profileId) ?? null;

  return {
    ready, error, profiles, profile, profileId, categories, data, toasts, pending, adapterKind: adapter.kind,
    toast, dismissToast, switchProfile, saveProfile,
    saveItem, trashItem, restoreItem, purgeItem,
    saveLook, trashLook, restoreLook, purgeLook,
    saveEvent, deleteEvent, saveWear, deleteWear, saveTrip, deleteTrip,
    saveCategory, deleteCategory, put, del, adapter,
  };
}

export function upsertBy<T extends { id: string }>(arr: T[], row: T): T[] {
  const i = arr.findIndex((x) => x.id === row.id);
  if (i < 0) return [...arr, row];
  const c = arr.slice(); c[i] = row; return c;
}

export type Store = ReturnType<typeof useStoreValue>;
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const v = useStoreValue();
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}

/** Live (not trashed, not in review) items for the current profile. */
export function useWardrobe() {
  const s = useStore();
  return useMemo(() => {
    const items = s.data.items.filter((i) => i.status === 'active' && !i.deleted_at);
    return { items, all: s.data.items, categories: s.categories, wardrobe: { items: s.data.items, categories: s.categories } };
  }, [s.data.items, s.categories]);
}
