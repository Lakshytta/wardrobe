import { useState } from 'react';
import type { Trip } from '../lib/types.ts';
import { useStore, today } from '../lib/store.tsx';
import { uuid } from '../lib/data/adapter.ts';
import { TextField, fmtDate, useSubmitOnce } from './ui.tsx';

export function TripForm({ initial, onDone }: { initial?: Trip; onDone: (t: Trip) => unknown }) {
  const s = useStore();
  const [saving, submit] = useSubmitOnce();
  const [name, setName] = useState(initial?.name ?? '');
  const [start, setStart] = useState(initial?.start_date ?? today());
  const [end, setEnd] = useState(initial?.end_date ?? today());
  const inRange = s.data.events.filter((e) => e.date >= start && e.date <= (end < start ? start : end)).sort((a, b) => a.date.localeCompare(b.date));
  const [picked, setPicked] = useState<string[] | null>(initial?.event_ids ?? null);
  const chosen = picked ?? inRange.map((e) => e.id);
  return (
    <form className="stack" onSubmit={(e) => {
      e.preventDefault();
      if (!name.trim()) return;
      const trip: Trip = { id: initial?.id ?? uuid(), profile_id: s.profileId, name: name.trim(), start_date: start, end_date: end < start ? start : end, event_ids: chosen.filter((id) => inRange.some((e) => e.id === id)), packing: initial?.packing ?? null };
      void submit(() => onDone(trip));
    }}>
      <TextField label="Trip name" value={name} onChange={setName} testid="trip-name" required placeholder="e.g. Jaipur wedding" />
      <div className="row">
        <div className="grow"><TextField label="From" type="date" value={start} onChange={setStart} testid="trip-start" /></div>
        <div className="grow"><TextField label="To" type="date" value={end} onChange={setEnd} testid="trip-end" /></div>
      </div>
      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Events on this trip</div>
        {inRange.length ? (
          <div className="chips">
            {inRange.map((ev) => (
              <button type="button" key={ev.id} className="chip" aria-pressed={chosen.includes(ev.id)} data-testid={`trip-event-${ev.id}`}
                onClick={() => setPicked(chosen.includes(ev.id) ? chosen.filter((x) => x !== ev.id) : [...chosen, ev.id])}>
                {ev.title} · {fmtDate(ev.date)}
              </button>
            ))}
          </div>
        ) : <p className="small mute">No events in these dates — we will plan one easy outfit per day. Add events in Plan for a better list.</p>}
      </div>
      <button className="btn primary" type="submit" data-testid="trip-save" disabled={!name.trim() || saving}>Save trip</button>
    </form>
  );
}
