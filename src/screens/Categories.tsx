import { useState } from 'react';
import { useStore } from '../lib/store.tsx';
import type { Category, Slot } from '../lib/types.ts';
import { Icon, Sheet, TextField, SelectField, slug } from '../components/ui.tsx';

const SLOT_LABEL: Record<Slot, string> = { main: 'Main outfit', top: 'Blouse / top', layer: 'Dupatta / layer', accessory: 'Accessory' };

export default function Categories() {
  const s = useStore();
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [name, setName] = useState('');
  const [slot, setSlot] = useState<Slot>('accessory');
  const cats = s.categories;
  const used = (id: string) => s.data.items.filter((i) => i.category_id === id).length;
  const move = async (i: number, d: -1 | 1) => {
    const a = cats[i], b = cats[i + d]; if (!a || !b) return;
    await s.saveCategory({ ...a, sort: b.sort }); await s.saveCategory({ ...b, sort: a.sort });
  };
  const open = (c: Category | 'new') => { setEditing(c); setName(c === 'new' ? '' : c.name); setSlot(c === 'new' ? 'accessory' : c.slot); };
  return (
    <div>
      <div className="row between"><h1>Categories</h1><button className="btn primary" data-testid="cat-add" onClick={() => open('new')}><Icon name="plus" /> Add</button></div>
      <p className="mute">Each category belongs to a Mix &amp; Match slot.</p>
      <div className="list">
        {cats.map((c, i) => (
          <div key={c.id} className="listrow">
            <span className="grow"><span className="t">{c.name}</span><br /><span className="small mute">{SLOT_LABEL[c.slot]} · {used(c.id)} piece{used(c.id) === 1 ? '' : 's'}</span></span>
            <button className="iconbtn" aria-label={`Move ${c.name} up`} disabled={i === 0} data-testid={`cat-up-${c.id}`} onClick={() => void move(i, -1)}><Icon name="up" /></button>
            <button className="iconbtn" aria-label={`Move ${c.name} down`} disabled={i === cats.length - 1} data-testid={`cat-down-${c.id}`} onClick={() => void move(i, 1)}><Icon name="down" /></button>
            <button className="iconbtn" aria-label={`Rename ${c.name}`} data-testid={`cat-edit-${c.id}`} onClick={() => open(c)}><Icon name="edit" /></button>
            {!c.builtin && <button className="iconbtn" aria-label={`Delete ${c.name}`} disabled={used(c.id) > 0} title={used(c.id) ? 'Move its pieces first' : undefined} data-testid={`cat-del-${c.id}`} onClick={() => void s.deleteCategory(c)}><Icon name="trash" /></button>}
          </div>
        ))}
      </div>
      {editing && (
        <Sheet title={editing === 'new' ? 'New category' : `Edit ${editing.name}`} onClose={() => setEditing(null)} testid="cat-sheet">
          <form className="stack" onSubmit={async (e) => {
            e.preventDefault(); if (!name.trim()) return;
            if (editing === 'new') {
              let id = slug(name) || 'category'; let n = 2;
              while (cats.some((c) => c.id === id)) id = `${slug(name)}-${n++}`;
              await s.saveCategory({ id, name: name.trim(), slot, sort: Math.max(0, ...cats.map((c) => c.sort)) + 1, builtin: false });
            } else await s.saveCategory({ ...editing, name: name.trim(), slot });
            setEditing(null);
          }}>
            <TextField label="Name" value={name} onChange={setName} testid="cat-name" required />
            <SelectField label="Mix & Match slot" value={slot} onChange={(v) => setSlot(v as Slot)} testid="cat-slot" options={(Object.keys(SLOT_LABEL) as Slot[]).map((k) => ({ value: k, label: SLOT_LABEL[k] }))} />
            <button className="btn primary" type="submit" data-testid="cat-save" disabled={!name.trim()}>Save</button>
          </form>
        </Sheet>
      )}
    </div>
  );
}
