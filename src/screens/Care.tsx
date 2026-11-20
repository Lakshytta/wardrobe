import { useState } from 'react';
import { useStore, useWardrobe } from '../lib/store.tsx';
import { CARE_LABEL, type Item } from '../lib/types.ts';
import { Empty, Icon, Sheet, Thumb, fmtDate, daysFrom } from '../components/ui.tsx';
import { CareForm } from '../components/ItemForm.tsx';

export default function Care() {
  const s = useStore();
  const { items } = useWardrobe();
  const [editing, setEditing] = useState<Item | null>(null);
  const [picking, setPicking] = useState(false);
  const away = items.filter((i) => i.care_status !== 'in_wardrobe')
    .sort((a, b) => (a.care_due ?? '9999').localeCompare(b.care_due ?? '9999'));
  const total = away.reduce((n, i) => n + (i.care_cost ?? 0), 0);
  return (
    <div>
      <div className="row between"><h1>Tailor, cleaning &amp; lending</h1><button className="btn primary" data-testid="care-add" onClick={() => setPicking(true)}><Icon name="needle" /> Send something out</button></div>
      {away.length === 0 ? (
        <Empty title="Everything is at home">When a piece goes to the tailor, dry-cleaner or a friend, note it here so you never lose track.</Empty>
      ) : (
        <>
          {total > 0 && <p className="mute">Tailoring and cleaning costs so far: ₹{total.toLocaleString('en-IN')}</p>}
          <div className="list">
            {away.map((i) => {
              const d = i.care_due ? daysFrom(i.care_due) : null;
              return (
                <div key={i.id} className="listrow" style={d !== null && d < 0 ? { borderColor: 'var(--danger)' } : undefined}>
                  <a href={`#/piece/${i.id}`} data-testid={`care-open-${i.id}`} aria-label={i.name}><Thumb item={i} alt="" /></a>
                  <span className="grow">
                    <span className="t">{i.name}</span><br />
                    <span className="small">{CARE_LABEL[i.care_status]}{i.lent_to ? ` to ${i.lent_to}` : ''}{i.care_contact ? ` · ${i.care_contact}` : ''}{i.care_cost != null ? ` · ₹${i.care_cost}` : ''}</span><br />
                    {d !== null && <span className={`tag ${d < 0 ? 'warn' : ''}`}>{d < 0 ? `Overdue by ${-d} day${d === -1 ? '' : 's'}` : d === 0 ? 'Due today' : `Due ${fmtDate(i.care_due)}`}</span>}
                    {i.care_note && <span className="small mute"> {i.care_note}</span>}
                  </span>
                  <span className="stack" style={{ gap: 6 }}>
                    <button className="btn small primary" data-testid={`care-returned-${i.id}`} onClick={async () => {
                      const before = i;
                      await s.saveItem({ ...i, care_status: 'in_wardrobe', care_due: null, lent_to: '', care_contact: '', care_note: '', care_cost: i.care_cost });
                      s.toast(`“${i.name}” is back home`, () => void s.saveItem(before));
                    }}>Back home</button>
                    <button className="btn small" data-testid={`care-edit-${i.id}`} onClick={() => setEditing(i)}>Edit</button>
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
      {picking && (
        <Sheet title="Which piece?" onClose={() => setPicking(false)} testid="care-pick-sheet">
          <div className="grid">
            {items.filter((i) => i.care_status === 'in_wardrobe').map((i) => (
              <button key={i.id} className="tile" data-testid={`care-pick-${i.id}`} onClick={() => { setPicking(false); setEditing(i); }}>
                <Thumb item={i} className="ph" alt="" /><span className="meta"><span className="name">{i.name}</span></span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
      {editing && <Sheet title={editing.name} onClose={() => setEditing(null)} testid="care-edit-sheet"><CareForm item={editing} onSave={async (i) => { await s.saveItem(i); setEditing(null); s.toast('Status updated'); }} /></Sheet>}
    </div>
  );
}
