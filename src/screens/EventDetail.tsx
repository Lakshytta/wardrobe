import { useState } from 'react';
import { useStore, useWardrobe, today } from '../lib/store.tsx';
import type { OutfitOption } from '../lib/types.ts';
import { OptionCard, OptionEditor, blankOption, optionItemIds } from '../components/OutfitOptions.tsx';
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
  const [editing, setEditing] = useState<OutfitOption | null>(null);
  if (!ev) return <Empty title="Event not found" action={<a className="btn" href="#/plan" data-testid="event-missing-back">Back to plan</a>} />;
  const look = s.data.looks.find((l) => l.id === ev.look_id && !l.deleted_at);
  const byId = new Map(s.data.items.map((i) => [i.id, i]));
  const celebration = ev.celebration_id ? s.data.celebrations.find((c) => c.id === ev.celebration_id) : undefined;
  const options = ev.options ?? [];
  const chosen = options.find((o) => o.chosen);
  const wornIds = look?.item_ids ?? (chosen ? optionItemIds(chosen) : []);
  const when = ev.date ?? today();
  const warnings = wornIds.length ? repeatGuard(wornIds, when, ev.people, s.data.wears, s.data.events, wardrobe, { ignoreEventId: ev.id }) : [];
  const wear = s.data.wears.find((w) => w.event_id === ev.id);
  const dd = ev.date ? daysFrom(ev.date) : null;
  const looks = s.data.looks.filter((l) => !l.deleted_at);
  const backTo = celebration ? `/celebration/${celebration.id}` : '/plan';
  // main pieces already chosen for the celebration's other sub-events
  const otherPicks = new Map<string, string>();
  if (celebration) for (const e of s.data.events) if (e.celebration_id === celebration.id && e.id !== ev.id) for (const o of e.options ?? []) if (o.chosen) for (const id of o.item_ids) otherPicks.set(id, e.title);
  const saveOptions = (next: OutfitOption[]) => s.saveEvent({ ...ev, options: next });

  return (
    <div>
      <div className="row between">
        <button className="btn ghost" onClick={() => navigate(backTo)} data-testid="event-back"><Icon name="back" /> {celebration ? celebration.name : 'Back'}</button>
        <div className="row">
          <button className="iconbtn" aria-label="Edit event" data-testid="event-edit" onClick={() => setSheet('edit')}><Icon name="edit" /></button>
          <button className="iconbtn" aria-label="Delete event" data-testid="event-delete" onClick={async () => { await s.deleteEvent(ev); navigate(backTo); }}><Icon name="trash" /></button>
        </div>
      </div>
      <h1>{ev.title}</h1>
      <p className="mute">{ev.date ? fmtDate(ev.date) : <button className="btn small" onClick={() => setSheet('edit')} data-testid="event-add-date">Add date</button>} · {ev.occasion}{dd !== null && <> · {dd === 0 ? 'today' : dd > 0 ? `in ${dd} day${dd === 1 ? '' : 's'}` : `${-dd} day${dd === -1 ? '' : 's'} ago`}</>}</p>
      {ev.people.length > 0 && <p>With: {ev.people.join(', ')}</p>}
      {ev.notes && <p>{ev.notes}</p>}

      {celebration ? (
        <section className="section" aria-labelledby="opt-h">
          <div className="section-head"><h2 id="opt-h">Outfit options</h2><span className="mute small">{options.length} option{options.length === 1 ? '' : 's'}</span></div>
          {options.length === 0 && <p className="mute">Add one or more outfit options — each with its bag and jewellery — then pick your final choice.</p>}
          <div className="stack">
            {options.map((o, k) => (
              <OptionCard key={o.id} o={o} index={k} event={ev} byId={byId} otherPicks={otherPicks}
                onEdit={() => setEditing(o)}
                onChoose={() => void saveOptions(options.map((x) => ({ ...x, chosen: x.id === o.id ? !o.chosen : false })))}
                onDelete={async () => { await saveOptions(options.filter((x) => x.id !== o.id)); s.toast(`Option ${k + 1} removed`, () => void s.saveEvent({ ...ev, options })); }} />
            ))}
          </div>
          {warnings.length > 0 && <div className="warnbox" role="alert" data-testid="v-event-repeat" style={{ marginTop: 10 }}><strong>Repeat alert:</strong>{warnings.map((w, k) => <p key={k} style={{ margin: '4px 0 0' }}>{w.text}</p>)}</div>}
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn primary" data-testid="option-add" onClick={() => setEditing(blankOption())}><Icon name="plus" /> Add outfit option</button>
            <a className="btn" href={`#/studio?event=${ev.id}`} data-testid="event-build-option"><Icon name="match" /> Build in Mix &amp; Match</a>
          </div>
        </section>
      ) : (
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
      )}

      <section className="section">
        {ev.worn ? (
          <div className="okbox row between">
            <span><Icon name="check" /> Worn on {fmtDate(wear?.date ?? ev.date)}</span>
            <button className="btn small" data-testid="event-unworn" onClick={async () => { if (wear) await s.deleteWear(wear); await s.saveEvent({ ...ev, worn: false }); }}>Undo</button>
          </div>
        ) : (
          <button className="btn primary block" data-testid="event-mark-worn" disabled={!wornIds.length} onClick={async () => {
            await s.saveWear({ id: uuid(), profile_id: ev.profile_id, date: when, item_ids: wornIds, look_id: look?.id ?? null, event_id: ev.id, note: ev.title });
            await s.saveEvent({ ...ev, worn: true });
            s.toast('Saved to wear history');
          }}><Icon name="check" /> Mark as worn</button>
        )}
        {!wornIds.length && !ev.worn && <p className="small mute" style={{ marginTop: 6 }}>{celebration ? 'Make one option your final choice, then mark it as worn after the event.' : 'Plan an outfit first, then mark it as worn after the event.'}</p>}
      </section>

      {editing && <OptionEditor event={ev} initial={editing} onClose={() => setEditing(null)} onSave={async (o) => {
        const exists = options.some((x) => x.id === o.id);
        await saveOptions(exists ? options.map((x) => (x.id === o.id ? o : x)) : [...options, o]);
        setEditing(null); s.toast(exists ? 'Option updated' : 'Option added');
      }} />}
      {sheet === 'edit' && <Sheet title="Edit event" onClose={() => setSheet(null)} marker="event-edit-sheet"><EventForm initial={ev} onDone={async (e) => { await s.saveEvent(e); setSheet(null); s.toast('Event updated'); }} /></Sheet>}
      {sheet === 'pick' && (
        <Sheet title="Choose a look" onClose={() => setSheet(null)} marker="pick-look-sheet">
          <div className="list">
            {looks.map((l) => {
              const w = repeatGuard(l.item_ids, when, ev.people, s.data.wears, s.data.events, wardrobe, { ignoreEventId: ev.id });
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
