import { useState } from 'react';
import { useStore } from '../lib/store.tsx';
import { navigate } from '../lib/router.ts';
import { Empty, Icon, Sheet, fmtDate } from '../components/ui.tsx';
import { TripForm } from '../components/TripForm.tsx';

export default function Trips() {
  const s = useStore();
  const [creating, setCreating] = useState(false);
  const trips = [...s.data.trips].sort((a, b) => b.start_date.localeCompare(a.start_date));
  return (
    <div>
      <div className="row between"><h1>Trips</h1><button className="btn primary" data-testid="trip-new" onClick={() => setCreating(true)}><Icon name="plus" /> New trip</button></div>
      <p className="mute">Pick your dates and events — we will suggest the fewest pieces that make the most outfits.</p>
      {trips.length === 0 ? <Empty title="No trips yet" action={<button className="btn primary" data-testid="trip-empty-new" onClick={() => setCreating(true)}>Plan a trip</button>}>Going to a wedding out of town? Make a packing list here.</Empty> : (
        <div className="list">
          {trips.map((t) => (
            <a key={t.id} className="listrow" href={`#/trip/${t.id}`} data-testid={`trip-${t.id}`}>
              <span className="iconbtn" style={{ background: 'var(--chip)' }}><Icon name="plane" /></span>
              <span className="grow"><span className="t">{t.name}</span><br /><span className="small mute">{fmtDate(t.start_date)} – {fmtDate(t.end_date)} · {t.event_ids.length} event{t.event_ids.length === 1 ? '' : 's'}{t.packing ? ` · ${t.packing.checklist.filter((c) => c.checked).length}/${t.packing.checklist.length} packed` : ''}</span></span>
            </a>
          ))}
        </div>
      )}
      {creating && <Sheet title="New trip" onClose={() => setCreating(false)} marker="trip-sheet"><TripForm onDone={async (t) => { await s.saveTrip(t); setCreating(false); navigate(`/trip/${t.id}`); }} /></Sheet>}
    </div>
  );
}
