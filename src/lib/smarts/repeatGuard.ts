import type { Item, Look, WEvent, Wear } from '../types.ts';
import { slotOf, type Wardrobe } from './wardrobe.ts';

export interface RepeatWarning { kind: 'people' | 'recent'; text: string; date: string; event_id: string | null }

const days = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86400000);

/**
 * Warn when this look (or its main piece) was already worn at an event with the same people,
 * or within `windowDays` of the date.
 */
export function repeatGuard(
  itemIds: string[], date: string, people: string[], wears: Wear[], events: WEvent[], wardrobe: Wardrobe,
  opts: { windowDays?: number; ignoreEventId?: string | null } = {},
): RepeatWarning[] {
  const windowDays = opts.windowDays ?? 90;
  const byId = new Map(wardrobe.items.map((i) => [i.id, i]));
  const mains = itemIds.map((id) => byId.get(id)).filter((i): i is Item => !!i && slotOf(i, wardrobe.categories) === 'main');
  const watch = mains.length ? mains : itemIds.map((id) => byId.get(id)).filter((i): i is Item => !!i).slice(0, 1);
  const lower = new Set(people.map((p) => p.trim().toLowerCase()).filter(Boolean));
  const out: RepeatWarning[] = [];
  for (const w of wears) {
    if (opts.ignoreEventId && w.event_id === opts.ignoreEventId) continue;
    const hit = watch.find((m) => w.item_ids.includes(m.id));
    if (!hit) continue;
    const ev = w.event_id ? events.find((e) => e.id === w.event_id) : undefined;
    const shared = ev ? ev.people.filter((p) => lower.has(p.trim().toLowerCase())) : [];
    if (shared.length) {
      out.push({ kind: 'people', date: w.date, event_id: w.event_id, text: `You wore the ${hit.name} to “${ev!.title}” on ${w.date} with ${shared.join(', ')}.` });
      continue;
    }
    const gap = Math.abs(days(date, w.date));
    if (gap <= windowDays) {
      out.push({ kind: 'recent', date: w.date, event_id: w.event_id, text: `You wore the ${hit.name} ${gap === 0 ? 'on the same day' : `${gap} days ${Date.parse(w.date) < Date.parse(date) ? 'before' : 'after'}`}${ev ? ` (“${ev.title}”)` : ''}.` });
    }
  }
  return out.sort((a, b) => (a.kind === b.kind ? b.date.localeCompare(a.date) : a.kind === 'people' ? -1 : 1));
}

export function lookItems(look: Look | undefined | null): string[] {
  return look?.item_ids ?? [];
}
