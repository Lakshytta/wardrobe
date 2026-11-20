import { useState } from 'react';
import { useStore, nowIso, today } from '../lib/store.tsx';
import { navigate } from '../lib/router.ts';
import { uuid } from '../lib/data/adapter.ts';
import type { Celebration, Packing, WEvent } from '../lib/types.ts';
import { Empty, Icon, Sheet, TextField, fmtDate, daysFrom, slug, useSubmitOnce } from '../components/ui.tsx';
import { EventForm } from '../components/EventForm.tsx';
import { OptionThumbs, optionItemIds } from '../components/OutfitOptions.tsx';

/** Common Indian-wedding functions offered as one-tap additions. */
export const WEDDING_FUNCTIONS: [string, string][] = [
  ['Gaur', 'Puja'], ['Haldi', 'Haldi'], ['Mehendi', 'Mehendi'], ['Welcome lunch', 'Day function'], ['Sangeet', 'Sangeet'],
  ['Cocktail', 'Evening/Party'], ['After party', 'Evening/Party'], ['Shaadi', 'Wedding'], ['Reception', 'Wedding guest'],
  ['Filler suit', 'Day function'],
];

export function sortSubEvents(evs: WEvent[]): WEvent[] {
  return [...evs].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || (a.date ?? '9999').localeCompare(b.date ?? '9999') || a.title.localeCompare(b.title));
}

export function CelebrationForm({ initial, onDone }: { initial?: Celebration; onDone: (c: Celebration) => unknown }) {
  const s = useStore();
  const [saving, submit] = useSubmitOnce();
  const [name, setName] = useState(initial?.name ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); if (name.trim()) void submit(() => onDone({ id: initial?.id ?? uuid(), profile_id: s.profileId, name: name.trim(), notes, created_at: initial?.created_at ?? nowIso() })); }}>
      <TextField label="Name" value={name} onChange={setName} testid="celebration-name" required placeholder="e.g. Lakshu wedding" />
      <label className="field">Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="celebration-notes" placeholder="e.g. Udaipur, 3 days" /></label>
      <button className="btn primary" type="submit" data-testid="celebration-save" disabled={!name.trim() || saving}>Save</button>
    </form>
  );
}

export default function CelebrationDetail({ id }: { id: string }) {
  const s = useStore();
  const c = s.data.celebrations.find((x) => x.id === id);
  const [sheet, setSheet] = useState<'edit' | 'add' | null>(null);
  if (!c) return <Empty title="Not found" action={<a className="btn" href="#/" data-testid="celebration-missing-home">Go home</a>}>It may have been deleted.</Empty>;
  const subs = sortSubEvents(s.data.events.filter((e) => e.celebration_id === c.id));
  const byId = new Map(s.data.items.map((i) => [i.id, i]));
  const decided = subs.filter((e) => (e.options ?? []).some((o) => o.chosen)).length;
  const dated = subs.filter((e) => e.date).map((e) => e.date!).sort();
  const nextSort = Math.max(0, ...subs.map((e) => e.sort ?? 0)) + 1;
  const existing = new Set(subs.map((e) => e.title.toLowerCase()));

  const addQuick = async (title: string, occasion: string) => {
    let t = title; let n = 2;
    while (existing.has(t.toLowerCase())) t = `${title} ${n++}`;
    await s.saveEvent({ id: uuid(), profile_id: s.profileId, title: t, date: null, occasion, people: [], look_id: null, notes: '', worn: false, celebration_id: c.id, sort: nextSort, options: [] });
    s.toast(`${t} added`);
  };
  const move = async (i: number, d: -1 | 1) => {
    const a = subs[i], b = subs[i + d]; if (!a || !b) return;
    const sa = a.sort ?? i, sb = b.sort ?? i + d;
    await s.saveEvent({ ...a, sort: sb === sa ? sa + d : sb });
    await s.saveEvent({ ...b, sort: sa });
  };
  const packing = async () => {
    const checklist: Packing['checklist'] = [];
    const seen = new Set<string>();
    const outfits = subs.map((e) => {
      const o = (e.options ?? []).find((x) => x.chosen);
      const ids = o ? optionItemIds(o) : [];
      for (const iid of ids) if (!seen.has(iid)) { seen.add(iid); checklist.push({ id: iid, label: byId.get(iid)?.name ?? 'Piece', item_id: iid, checked: false }); }
      if (o?.bag_note && !o.bag_id) checklist.push({ id: `bag-${e.id}`, label: `Bag for ${e.title}: ${o.bag_note}`, checked: false });
      if (o?.jewellery_note) checklist.push({ id: `jw-${e.id}`, label: `Jewellery for ${e.title}: ${o.jewellery_note}`, checked: false });
      return { event_id: e.id, label: `${e.title}${e.date ? ` · ${e.date}` : ''}`, item_ids: ids };
    });
    ['Safety pins', 'Saree petticoats', 'Dupatta pins', 'Jewellery pouch', 'Small sewing kit', 'Garment bags for heavy pieces'].forEach((x, k) => checklist.push({ id: `ess-${k}`, label: x, checked: false }));
    const missing = subs.filter((e) => !(e.options ?? []).some((o) => o.chosen)).map((e) => e.title);
    const trip = {
      id: uuid(), profile_id: s.profileId, name: `${c.name} – packing`, start_date: dated[0] ?? today(), end_date: dated[dated.length - 1] ?? dated[0] ?? today(),
      event_ids: subs.map((e) => e.id),
      packing: { items: [...seen], outfits, checklist, generated_at: nowIso(), why: `Packed from your final choices for ${decided} of ${subs.length} events.${missing.length ? ` Still to decide: ${missing.join(', ')}.` : ''}` },
    };
    await s.saveTrip(trip);
    navigate(`/trip/${trip.id}`);
  };

  return (
    <div>
      <div className="row between">
        <button className="btn ghost" onClick={() => navigate('/')} data-testid="celebration-back"><Icon name="back" /> Home</button>
        <button className="iconbtn" aria-label="Rename" data-testid="celebration-edit" onClick={() => setSheet('edit')}><Icon name="edit" /></button>
      </div>
      <h1>💍 {c.name}</h1>
      <p className="mute">
        {subs.length} event{subs.length === 1 ? '' : 's'} · {decided} of {subs.length} outfits decided
        {dated.length > 0 && <> · {fmtDate(dated[0])}{dated.length > 1 ? ` – ${fmtDate(dated[dated.length - 1])}` : ''}</>}
      </p>
      {c.notes && <p>{c.notes}</p>}
      {subs.length > 0 && <div className="bar" style={{ marginBottom: 16 }} role="progressbar" aria-valuemin={0} aria-valuemax={subs.length} aria-valuenow={decided} aria-label="Outfits decided"><i style={{ width: `${(decided / subs.length) * 100}%` }} /></div>}

      {subs.length === 0 ? <Empty title="No events yet">Add the functions below — Haldi, Mehendi, Sangeet, Shaadi…</Empty> : (
        <div className="list">
          {subs.map((e, i) => {
            const opts = e.options ?? [];
            const chosen = opts.find((o) => o.chosen);
            const dd = e.date ? daysFrom(e.date) : null;
            return (
              <div key={e.id} className="listrow" style={{ alignItems: 'center' }}>
                <a href={`#/event/${e.id}`} data-testid={`sub-${slug(e.title)}`} className="grow" style={{ color: 'inherit', textDecoration: 'none', minWidth: 0 }}>
                  <span className="t">{e.title}</span><br />
                  <span className="small mute">{e.date ? `${fmtDate(e.date)}${dd !== null && dd >= 0 ? ` · in ${dd} day${dd === 1 ? '' : 's'}` : ''}` : 'Date to be decided'} · {e.occasion}</span><br />
                  {chosen ? <span className="row" style={{ marginTop: 4, gap: 6 }}><span className="tag ok">⭐ Decided</span><OptionThumbs o={chosen} byId={byId} size={40} /></span>
                    : <span className="tag" style={{ marginTop: 4 }}>{opts.length ? `${opts.length} option${opts.length === 1 ? '' : 's'} · not decided` : 'No outfit yet'}</span>}
                </a>
                <span className="stack" style={{ gap: 0 }}>
                  <button className="iconbtn" aria-label={`Move ${e.title} up`} disabled={i === 0} data-testid={`sub-up-${slug(e.title)}`} onClick={() => void move(i, -1)}><Icon name="up" /></button>
                  <button className="iconbtn" aria-label={`Move ${e.title} down`} disabled={i === subs.length - 1} data-testid={`sub-down-${slug(e.title)}`} onClick={() => void move(i, 1)}><Icon name="down" /></button>
                </span>
              </div>
            );
          })}
        </div>
      )}

      <section className="section">
        <h2>Add an event</h2>
        <div className="chips">
          {WEDDING_FUNCTIONS.filter(([t]) => t === 'Filler suit' || !existing.has(t.toLowerCase())).map(([t, o]) => (
            <button key={t} className="chip" data-testid={`quick-${slug(t)}`} onClick={() => void addQuick(t, o)}><Icon name="plus" />{t}</button>
          ))}
          <button className="chip on" data-testid="sub-add" onClick={() => setSheet('add')}><Icon name="plus" />Something else…</button>
        </div>
      </section>

      <section className="section row">
        <button className="btn" data-testid="celebration-pack" disabled={!decided} onClick={packing}><Icon name="bag" /> Packing list from final choices</button>
        <button className="btn danger" data-testid="celebration-delete" onClick={async () => {
          if (!confirm(`Delete “${c.name}” and its ${subs.length} events? Your clothes stay in your wardrobe.`)) return;
          await s.deleteCelebration(c, subs); navigate('/');
        }}><Icon name="trash" /> Delete this section</button>
      </section>

      {sheet === 'edit' && <Sheet title="Rename" onClose={() => setSheet(null)} marker="celebration-sheet"><CelebrationForm initial={c} onDone={async (x) => { await s.saveCelebration(x); setSheet(null); }} /></Sheet>}
      {sheet === 'add' && (
        <Sheet title={`Add to ${c.name}`} onClose={() => setSheet(null)} marker="sub-sheet">
          <EventForm celebrationId={c.id} sort={nextSort} onDone={async (e) => { await s.saveEvent(e); setSheet(null); s.toast(`${e.title} added`); }} />
        </Sheet>
      )}
    </div>
  );
}
