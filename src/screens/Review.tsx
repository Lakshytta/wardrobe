import { useState } from 'react';
import { useStore } from '../lib/store.tsx';
import type { Item } from '../lib/types.ts';
import { prettyColour } from '../lib/smarts/colors.ts';
import { Empty, Icon, Sheet, Swatch, Thumb } from '../components/ui.tsx';
import { ItemForm } from '../components/ItemForm.tsx';

export default function Review() {
  const s = useStore();
  const queue = s.data.items.filter((i) => i.status === 'review' && !i.deleted_at).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const [editing, setEditing] = useState<Item | null>(null);
  const cat = (id: string) => s.categories.find((c) => c.id === id)?.name ?? id;
  const accept = (i: Item) => s.saveItem({ ...i, status: 'active' });

  return (
    <div>
      <div className="row between"><h1>Check new photos</h1>{queue.length > 1 && <button className="btn primary" data-testid="review-accept-all" onClick={async () => { for (const i of queue) await accept(i); s.toast(`${queue.length} pieces added`); }}><Icon name="check" /> All look right</button>}</div>
      <p className="mute">We guessed the colours and name from each photo. Tap ✓ if it looks right, or Edit to fix it.</p>
      {queue.length === 0 ? (
        <Empty title="All checked" action={<div className="row" style={{ justifyContent: 'center' }}><a className="btn primary" href="#/add" data-testid="review-add-more">Add more photos</a><a className="btn" href="#/closet" data-testid="review-closet">Open closet</a></div>}>
          New photos you add will wait here for a quick check.
        </Empty>
      ) : (
        <div className="list">
          {queue.map((i) => (
            <article key={i.id} className="card" data-testid={`v-review-${i.id}`}>
              <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                <div style={{ width: 120, flex: "none", borderRadius: 12, overflow: "hidden" }}><Thumb item={i} alt={i.name} /></div>
                <div className="grow stack" style={{ gap: 6 }}>
                  <strong>{i.name}</strong>
                  <span className="small mute">{cat(i.category_id)} · {i.season}</span>
                  <span className="row" style={{ gap: 6 }}><Swatch name={i.primary_color} />{prettyColour(i.primary_color)}{i.accent_colors.map((c) => <span key={c} className="row" style={{ gap: 4 }}><Swatch name={c} />{prettyColour(c)}</span>)}</span>
                  <span className="small">{i.occasions.join(', ')}</span>
                  <span className="row" style={{ gap: 4 }}>{i.palette_hex.map((h) => <span key={h} className="swatch" style={{ background: h, borderRadius: 6 }} />)}</span>
                </div>
              </div>
              <div className="row end" style={{ marginTop: 10 }}>
                <button className="btn danger small" data-testid={`review-discard-${i.id}`} onClick={() => void s.trashItem(i)}><Icon name="trash" /> Discard</button>
                <button className="btn small" data-testid={`review-edit-${i.id}`} onClick={() => setEditing(i)}><Icon name="edit" /> Edit</button>
                <button className="btn primary small" data-testid={`review-accept-${i.id}`} onClick={async () => { await accept(i); s.toast(`“${i.name}” added`); }}><Icon name="check" /> Looks right</button>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing && (
        <Sheet title="Fix the details" onClose={() => setEditing(null)} testid="review-edit-sheet">
          <ItemForm item={editing} saveLabel="Save and add" onCancel={() => setEditing(null)} onSave={async (i) => { await s.saveItem({ ...i, status: 'active' }); setEditing(null); s.toast(`“${i.name}” added`); }} />
        </Sheet>
      )}
    </div>
  );
}
