import { useState } from 'react';
import type { WEvent } from '../lib/types.ts';
import { DEFAULT_OCCASIONS } from '../lib/types.ts';
import { useStore, today } from '../lib/store.tsx';
import { uuid } from '../lib/data/adapter.ts';
import { SelectField, TextField, useSubmitOnce } from './ui.tsx';

export function EventForm({ initial, lookId, date, onDone }: { initial?: WEvent; lookId?: string | null; date?: string; onDone: (e: WEvent) => unknown }) {
  const s = useStore();
  const [saving, submit] = useSubmitOnce();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [d, setD] = useState(initial?.date ?? date ?? today());
  const [occ, setOcc] = useState(initial?.occasion ?? 'Festive');
  const [people, setPeople] = useState((initial?.people ?? []).join(', '));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [look, setLook] = useState(initial?.look_id ?? lookId ?? '');
  const looks = s.data.looks.filter((l) => !l.deleted_at);
  return (
    <form className="stack" onSubmit={(e) => {
      e.preventDefault();
      if (!title.trim()) return;
      const ev: WEvent = {
        id: initial?.id ?? uuid(), profile_id: s.profileId, title: title.trim(), date: d, occasion: occ,
        people: people.split(',').map((p) => p.trim()).filter(Boolean), look_id: look || null, notes, worn: initial?.worn ?? false,
      };
      void submit(() => onDone(ev));
    }}>
      <TextField label="What is it?" value={title} onChange={setTitle} testid="event-title" required placeholder="e.g. Riya's mehendi" />
      <TextField label="Date" type="date" value={d} onChange={setD} testid="event-date" required />
      <SelectField label="Occasion" value={occ} onChange={setOcc} testid="event-occasion" options={DEFAULT_OCCASIONS.map((o) => ({ value: o, label: o }))} />
      <TextField label="Who will be there?" hint="Names or families, separated by commas — used to avoid repeats" value={people} onChange={setPeople} testid="event-people" placeholder="e.g. Sharma family, college friends" />
      <SelectField label="Outfit" value={look} onChange={setLook} testid="event-look" options={[{ value: '', label: 'Decide later' }, ...looks.map((l) => ({ value: l.id, label: l.name }))]} />
      <label className="field">Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="event-notes" /></label>
      <button className="btn primary" type="submit" data-testid="event-save" disabled={!title.trim() || saving}>Save event</button>
    </form>
  );
}
