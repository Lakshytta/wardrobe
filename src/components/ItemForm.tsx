import { useState } from 'react';
import type { CareStatus, Item } from '../lib/types.ts';
import { CARE_LABEL, DEFAULT_OCCASIONS, SEASONS } from '../lib/types.ts';
import { COLOURS, prettyColour } from '../lib/smarts/colors.ts';
import { useStore } from '../lib/store.tsx';
import { ChipSelect, SelectField, Swatch, TextField } from './ui.tsx';

export function ItemForm({ item, onSave, onCancel, saveLabel = 'Save changes' }: { item: Item; onSave: (i: Item) => void; onCancel?: () => void; saveLabel?: string }) {
  const { categories } = useStore();
  const [f, setF] = useState<Item>(item);
  const set = <K extends keyof Item>(k: K, v: Item[K]) => setF((x) => ({ ...x, [k]: v }));
  const colourNames = COLOURS.map((c) => c.name);
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); onSave({ ...f, name: f.name.trim() || 'Untitled piece', auto_tagged: false }); }}>
      <TextField label="Name" value={f.name} onChange={(v) => set('name', v)} testid="item-name" required />
      <SelectField label="Category" value={f.category_id} onChange={(v) => set('category_id', v)} testid="item-category" options={categories.map((c) => ({ value: c.id, label: c.name }))} />
      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Main colour</div>
        <ChipSelect options={colourNames} value={[f.primary_color]} testidPrefix="item-primary" onChange={(v) => set('primary_color', v.filter((x) => x !== f.primary_color)[0] ?? f.primary_color)} render={(o) => <><Swatch name={o} />{prettyColour(o)}</>} />
      </div>
      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Other colours</div>
        <ChipSelect options={colourNames.filter((c) => c !== f.primary_color)} value={f.accent_colors} testidPrefix="item-accent" onChange={(v) => set('accent_colors', v)} render={(o) => <><Swatch name={o} />{prettyColour(o)}</>} />
      </div>
      <TextField label="Fabric" value={f.fabric} onChange={(v) => set('fabric', v)} testid="item-fabric" placeholder="e.g. Raw silk" />
      <TextField label="Work / embroidery" value={f.work} onChange={(v) => set('work', v)} testid="item-work" placeholder="e.g. Zardozi" />
      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Occasions</div>
        <ChipSelect options={[...DEFAULT_OCCASIONS]} value={f.occasions} testidPrefix="item-occ" onChange={(v) => set('occasions', v)} />
      </div>
      <SelectField label="Season" value={f.season} onChange={(v) => set('season', v)} testid="item-season" options={SEASONS.map((s) => ({ value: s, label: s }))} />
      <label className="field">Details<textarea value={f.details} onChange={(e) => set('details', e.target.value)} data-testid="item-details" /></label>
      <TextField label="Tags" hint="Separate with commas" value={f.tags.filter((t) => !/^p\d{4}$/.test(t)).join(', ')} testid="item-tags"
        onChange={(v) => set('tags', [...f.tags.filter((t) => /^p\d{4}$/.test(t)), ...v.split(',').map((t) => t.trim()).filter(Boolean)])} />
      <TextField label="Price (optional)" hint="Used for cost-per-wear" type="number" value={f.price == null ? '' : String(f.price)} testid="item-price"
        onChange={(v) => set('price', v === '' ? null : Math.max(0, Number(v)))} />
      <div className="row end">
        {onCancel && <button type="button" className="btn" onClick={onCancel} data-testid="item-cancel">Cancel</button>}
        <button type="submit" className="btn primary" data-testid="item-save">{saveLabel}</button>
      </div>
    </form>
  );
}

export function CareForm({ item, onSave }: { item: Item; onSave: (i: Item) => void }) {
  const [status, setStatus] = useState<CareStatus>(item.care_status);
  const [due, setDue] = useState(item.care_due ?? '');
  const [contact, setContact] = useState(item.care_contact);
  const [lentTo, setLentTo] = useState(item.lent_to);
  const [cost, setCost] = useState(item.care_cost == null ? '' : String(item.care_cost));
  const [note, setNote] = useState(item.care_note);
  const away = status !== 'in_wardrobe';
  return (
    <form className="stack" onSubmit={(e) => {
      e.preventDefault();
      onSave({ ...item, care_status: status, care_due: away && due ? due : null, care_contact: away && status !== 'lent' ? contact : '', lent_to: status === 'lent' ? lentTo : '', care_cost: away && cost !== '' ? Number(cost) : null, care_note: away ? note : '' });
    }}>
      <div className="chips" role="radiogroup" aria-label="Where is it?">
        {(Object.keys(CARE_LABEL) as CareStatus[]).map((k) => (
          <button type="button" key={k} role="radio" aria-checked={status === k} className={`chip${status === k ? ' on' : ''}`} onClick={() => setStatus(k)} data-testid={`care-status-${k}`}>{CARE_LABEL[k]}</button>
        ))}
      </div>
      {status === 'lent' && <TextField label="Lent to" value={lentTo} onChange={setLentTo} testid="care-lent-to" placeholder="e.g. Priya" />}
      {away && status !== 'lent' && <TextField label={status === 'tailor' ? 'Tailor' : status === 'dry_clean' ? 'Dry-cleaner' : 'Who is repairing it'} value={contact} onChange={setContact} testid="care-contact" />}
      {away && <TextField label={status === 'lent' ? 'Return by' : 'Due back'} type="date" value={due} onChange={setDue} testid="care-due" />}
      {away && status !== 'lent' && <TextField label="Cost (optional)" type="number" value={cost} onChange={setCost} testid="care-cost" />}
      {away && <label className="field">Notes<textarea value={note} onChange={(e) => setNote(e.target.value)} data-testid="care-note" placeholder="e.g. Take in the sleeves 1 cm" /></label>}
      <button className="btn primary" type="submit" data-testid="care-save">Save</button>
    </form>
  );
}

/** Downloadable calendar reminder (.ics) — works with any phone calendar, no permissions needed. */
export function icsFor(title: string, date: string, details: string): string {
  const d = date.replace(/-/g, '');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Wardrobe//EN', 'BEGIN:VEVENT', `UID:${Date.now()}@wardrobe`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${d}`, `SUMMARY:${title.replace(/[,;]/g, ' ')}`, `DESCRIPTION:${details.replace(/[,;\n]/g, ' ')}`,
    'BEGIN:VALARM', 'TRIGGER:-PT9H', 'ACTION:DISPLAY', `DESCRIPTION:${title.replace(/[,;]/g, ' ')}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}

export function downloadText(name: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
