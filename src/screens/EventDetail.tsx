import { useState } from 'react';
import { useStore, useWardrobe } from '../lib/store.tsx';
import { navigate } from '../lib/router.ts';
import { imgUrl } from '../lib/data/index.ts';
import { uuid } from '../lib/data/adapter.ts';
import { repeatGuard } from '../lib/smarts/repeatGuard.ts';
import { Empty, Icon, ItemTile, Sheet, fmtDate, daysFrom } from '../components/ui.tsx';
import { EventForm } from '../components/EventForm.tsx';

export default function EventDetail({ id }: { id: string }) {
  const s = useStore();
  const { wardrobe } = useWardrobe();
  const ev = s.data.events.find((e) => e.id === id);
  const [sheet, setSheet] = useState<'edit' | 'pick' | null>(null);
  if (!ev) return <Empty title="Event not found" action={<a className="btn" href="#/plan" data-testid="event-missing-back">Back to plan</a>} />;
  const look = s.data.looks.find((l) => l.id === ev.look_id && !l.deleted_at);
  const byId = new Map(s.data.items.map((i) => [i.id, i]));
  const warnings = look ? repeatGuard(look.item_ids, ev.date, ev.people, s.data.wears, s.data.events, wardrobe, { ignoreEventId: ev.id }) : [];
  const wear = s.data.wears.find((w) => w.event_id === ev.id);
  const dd = daysFrom(ev.date);
  const looks = s.data.looks.filter((l) => !l.deleted_at);

  return (
    <div>
      <div className="row between">
        <button className="btn ghost" onClick={() => navigate('/plan')} data-testid="event-back"><Icon name="back" /> Back</button>
        <div className="row">
          <button className="iconbtn" aria-label="Edit event" data-testid="event-edit" onClick={() => setSheet('edit')}><Icon name="edit" /></button>
          <button className="iconbtn" aria-label="Delete event" data-testid="event-delete" onClick={async () => { await s.deleteEvent(ev); navigate('/plan'); }}><Icon name="trash" /></button>
        </div>
      </div>
      <h1>{ev.title}</h1>
      <p className="mute">{fmtDate(ev.date)} · {ev.occasion} · {dd === 0 ? 'today' : dd > 0 ? `in ${dd} day${dd === 1 ? '' : 's'}` : `${-dd} day${dd === -1 ? '' : 's'} ago`}</p>
      {ev.people.length > 0 && <p>With: {ev.people.join(', ')}</p>}
      {ev.notes && <p>{ev.notes}</p>}

      <section className="section card">
        <div className="section-head"><h2>Outfit</h2>{look && <a className="btn small" href={`#/look/${look.id}`} data-testid="event-open-look">Open look</a>}</div>
        {look ? (
          <div className="stack">
            <p><strong>{look.name}</strong>{look.score != null && <span className="mute"> · {look.score}/10</span>}</p>
            {look.board_url && <img className="board-preview" src={imgUrl(look.board_url)} alt="" style={{ maxWidth: 320 }} />}
            <div className="grid">{look.item_ids.map((x) => byId.get(x)).filter(Boolean).map((i) => <ItemTile key={i!.id} item={i!} href={`#/piece/${i!.id}`} testid={`event-piece-${i!.id}`} />)}</div>
          </div>
        ) : <p className="mute">No outfit planned yet.</p>}
        {warnings.length > 0 && <div className="warnbox" role="alert" data-testid="v-event-repeat"><strong>Repeat alert:</strong>{warnings.map((w, k) => <p key={k} style={{ margin: '4px 0 0' }}>{w.text}</p>)}</div>}
        <div className="row" style={{ marginTop: 12 }}>
          <a className="btn primary" href={`#/studio?event=${ev.id}${look ? `&look=${look.id}` : ''}`} data-testid="event-build-look"><Icon name="match" /> {look ? 'Change in Mix & Match' : 'Create in Mix & Match'}</a>
          {looks.length > 0 && <button className="btn" data-testid="event-pick-look" onClick={() => setSheet('pick')}><Icon name="look" /> Choose a saved look</button>}
        </div>
      </section>

      <section className="section">
        {ev.worn ? (
          <div className="okbox row between">
            <span><Icon name="check" /> Worn on {fmtDate(wear?.date ?? ev.date)}</span>
            <button className="btn small" data-testid="event-unworn" onClick={async () => { if (wear) await s.deleteWear(wear); await s.saveEvent({ ...ev, worn: false }); }}>Undo</button>
          </div>
        ) : (
          <button className="btn primary block" data-testid="event-mark-worn" disabled={!look} onClick={async () => {
            await s.saveWear({ id: uuid(), profile_id: ev.profile_id, date: ev.date, item_ids: look!.item_ids, look_id: look!.id, event_id: ev.id, note: ev.title });
            await s.saveEvent({ ...ev, worn: true });
            s.toast('Saved to wear history');
          }}><Icon name="check" /> Mark as worn</button>
        )}
        {!look && !ev.worn && <p className="small mute" style={{ marginTop: 6 }}>Plan an outfit first, then mark it as worn after the event.</p>}
      </section>

      {sheet === 'edit' && <Sheet title="Edit event" onClose={() => setSheet(null)} marker="event-edit-sheet"><EventForm initial={ev} onDone={async (e) => { await s.saveEvent(e); setSheet(null); s.toast('Event updated'); }} /></Sheet>}
      {sheet === 'pick' && (
        <Sheet title="Choose a look" onClose={() => setSheet(null)} marker="pick-look-sheet">
          <div className="list">
            {looks.map((l) => {
              const w = repeatGuard(l.item_ids, ev.date, ev.people, s.data.wears, s.data.events, wardrobe, { ignoreEventId: ev.id });
              return (
                <button key={l.id} className="listrow" style={{ cursor: 'pointer', textAlign: 'left' }} data-testid={`pick-look-${l.id}`} onClick={async () => { await s.saveEvent({ ...ev, look_id: l.id }); setSheet(null); }}>
                  {l.board_url ? <img src={imgUrl(l.board_url)} alt="" /> : null}
                  <span className="grow"><span className="t">{l.name}</span><br /><span className="small mute">{l.occasion}{l.score != null ? ` · ${l.score}/10` : ''}</span>
                    {w.length > 0 && <><br /><span className="tag warn">{w[0].kind === 'people' ? 'Same people saw it' : 'Worn recently'}</span></>}</span>
                </button>
              );
            })}
          </div>
        </Sheet>
      )}
    </div>
  );
}
