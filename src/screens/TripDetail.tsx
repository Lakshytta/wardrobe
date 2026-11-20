import { useState } from 'react';
import { useStore, useWardrobe, nowIso } from '../lib/store.tsx';
import { back, navigate } from '../lib/router.ts';
import { smarts } from '../lib/smarts/index.ts';
import type { Packing } from '../lib/types.ts';
import { Empty, Icon, Sheet, Thumb, fmtDate } from '../components/ui.tsx';
import { TripForm } from '../components/TripForm.tsx';
import { downloadText } from '../components/ItemForm.tsx';

export default function TripDetail({ id }: { id: string }) {
  const s = useStore();
  const { wardrobe } = useWardrobe();
  const trip = s.data.trips.find((t) => t.id === id);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!trip) return <Empty title="Trip not found" action={<a className="btn" href="#/trips" data-testid="trip-missing-back">All trips</a>} />;
  const byId = new Map(s.data.items.map((i) => [i.id, i]));
  const events = s.data.events.filter((e) => trip.event_ids.includes(e.id));
  const p = trip.packing;

  const generate = async () => {
    setBusy(true);
    const r = await smarts().packTrip(trip, events, wardrobe);
    const checklist = [
      ...r.items.map((iid) => ({ id: iid, label: byId.get(iid)?.name ?? 'Piece', item_id: iid, checked: false })),
      ...r.essentials.map((e, k) => ({ id: `ess-${k}`, label: e, checked: false })),
    ];
    // keep ticks for entries that are still on the list
    const old = new Map((p?.checklist ?? []).map((c) => [c.id, c.checked]));
    const packing: Packing = { items: r.items, outfits: r.outfits, why: r.why, checklist: checklist.map((c) => ({ ...c, checked: old.get(c.id) ?? false })), generated_at: nowIso() };
    await s.saveTrip({ ...trip, packing });
    setBusy(false);
  };
  const tick = (cid: string) => p && s.saveTrip({ ...trip, packing: { ...p, checklist: p.checklist.map((c) => (c.id === cid ? { ...c, checked: !c.checked } : c)) } });
  const listText = () => p ? `${trip.name} (${fmtDate(trip.start_date)} – ${fmtDate(trip.end_date)})\n\n` +
    p.outfits.map((o) => `${o.label}: ${o.item_ids.map((x) => byId.get(x)?.name).filter(Boolean).join(' + ') || '—'}`).join('\n') +
    '\n\nPacking list:\n' + p.checklist.map((c) => `${c.checked ? '☑' : '☐'} ${c.label}`).join('\n') : '';

  return (
    <div>
      <div className="row between">
        <button className="btn ghost" onClick={() => back('/trips')} data-testid="trip-back"><Icon name="back" /> Back</button>
        <div className="row">
          <button className="iconbtn" aria-label="Edit trip" data-testid="trip-edit" onClick={() => setEditing(true)}><Icon name="edit" /></button>
          <button className="iconbtn" aria-label="Delete trip" data-testid="trip-delete" onClick={async () => { await s.deleteTrip(trip); navigate('/trips'); }}><Icon name="trash" /></button>
        </div>
      </div>
      <h1>{trip.name}</h1>
      <p className="mute">{fmtDate(trip.start_date)} – {fmtDate(trip.end_date)}{events.length ? ` · ${events.map((e) => e.title).join(', ')}` : ''}</p>
      <div className="row">
        <button className="btn primary" data-testid="trip-generate" disabled={busy} onClick={generate}><Icon name="bag" /> {p ? 'Make the list again' : 'Make packing list'}</button>
        {p && <button className="btn" data-testid="trip-share" onClick={async () => {
          const text = listText();
          if (navigator.share) { try { await navigator.share({ title: trip.name, text }); return; } catch (e) { if ((e as Error).name === 'AbortError') return; } }
          try { await navigator.clipboard.writeText(text); s.toast('Packing list copied — paste it into WhatsApp'); }
          catch { downloadText(`${trip.name}-packing.txt`, text); s.toast('Packing list saved as a file'); }
        }}><Icon name="share" /> Share list</button>}
      </div>
      {p && (
        <>
          <p className="okbox" style={{ marginTop: 12 }} data-testid="v-trip-why">{p.why}</p>
          <section className="section">
            <h2>Outfits</h2>
            <div className="list">
              {p.outfits.map((o, k) => (
                <div key={k} className="listrow" style={{ alignItems: 'flex-start' }}>
                  <span className="grow"><span className="t">{o.label}</span>
                    <span className="row" style={{ marginTop: 6 }}>
                      {o.item_ids.map((x) => byId.get(x)).filter(Boolean).map((i) => <a key={i!.id} href={`#/piece/${i!.id}`} data-testid={`trip-piece-${i!.id}`} style={{ width: 84 }} title={i!.name}><Thumb item={i!} alt={i!.name} /></a>)}
                      {!o.item_ids.length && <span className="small mute">Nothing in your wardrobe fits this one well.</span>}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section className="section">
            <h2>Checklist <span className="mute small">({p.checklist.filter((c) => c.checked).length}/{p.checklist.length} packed)</span></h2>
            <div className="card">
              {p.checklist.map((c) => (
                <label key={c.id} className="check">
                  <input type="checkbox" checked={c.checked} onChange={() => void tick(c.id)} data-testid={`pack-${c.id}`} />
                  <span style={c.checked ? { textDecoration: 'line-through', color: 'var(--mute)' } : undefined}>{c.label}</span>
                </label>
              ))}
            </div>
          </section>
        </>
      )}
      {editing && <Sheet title="Edit trip" onClose={() => setEditing(false)} marker="trip-edit-sheet"><TripForm initial={trip} onDone={async (t) => { await s.saveTrip(t); setEditing(false); }} /></Sheet>}
    </div>
  );
}
