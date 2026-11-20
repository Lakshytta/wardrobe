import type { DataAdapter } from './adapter.ts';
import { MemoryAdapter } from './memory.ts';
import { SupabaseAdapter, localBlobs } from './supabase.ts';

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const FORCE = import.meta.env.VITE_ADAPTER as string | undefined;

function pick(): DataAdapter {
  const demo = typeof location !== 'undefined' && /[?&]demo=1/.test(location.search);
  if (FORCE === 'memory' || demo || !URL_ || !KEY) return new MemoryAdapter();
  return new SupabaseAdapter(URL_, KEY);
}

export const adapter: DataAdapter = pick();

/** Accepts relative URLs (/seed/…), full URLs, data/blob URLs and storage paths. */
export function imgUrl(u: string | null | undefined): string {
  if (!u) return '';
  if (/^(https?:|data:|blob:|\/)/.test(u)) return u;
  const local = localBlobs.get(u);
  if (local) return local;
  return URL_ ? `${URL_}/storage/v1/object/public/wardrobe/${u}` : u;
}
