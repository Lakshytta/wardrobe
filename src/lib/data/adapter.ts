import type { Category, Profile, ProfileData, TableName } from '../types.ts';

export interface Change { table: TableName; type: 'upsert' | 'delete'; row: any }

export interface DataAdapter {
  readonly kind: 'supabase' | 'memory';
  listProfiles(): Promise<Profile[]>;
  listCategories(): Promise<Category[]>;
  loadProfile(profileId: string): Promise<ProfileData>;
  upsert<T extends { id: string }>(table: TableName, row: T): Promise<void>;
  remove(table: TableName, id: string): Promise<void>;
  /** Uploads an image; returns a URL or storage path the app can display. */
  uploadImage(profileId: string, ownerId: string, kind: 'full' | 'thumb' | 'board', blob: Blob): Promise<string>;
  removeImages(profileId: string, ownerId: string): Promise<void>;
  /** Live changes from other tabs/devices. Returns an unsubscribe function. */
  subscribe(cb: (c: Change) => void): () => void;
  /** Pending offline writes (0 when everything is synced). */
  pending(): number;
}

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
