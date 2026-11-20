import { useState } from 'react';
import { useStore, today } from '../lib/store.tsx';
import { back, navigate } from '../lib/router.ts';
import { imgUrl } from '../lib/data/index.ts';
import { uuid } from '../lib/data/adapter.ts';
import { DEFAULT_OCCASIONS } from '../lib/types.ts';
import { Empty, Icon, ItemTile, Sheet, TextField, SelectField, fmtDate } from '../components/ui.tsx';
import { VerdictCard } from './Studio.tsx';

export default function LookDetail({ id }: { id: string }) {
  const s = useStore();
  const look = s.data.looks.find((l) => l.id === id);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(look?.name ?? '');
  const [occ, setOcc] = useState(look?.occasion ?? 'Festive');
  const [notes, setNotes] = useState(look?.notes ?? '');
  if (!look) return <Empty title="Look not found" action={<a className="btn" href="#/looks" data-testid="look-missing-back">All looks</a>} />;
  const byId = new Map(s.data.items.map((i) => [i.id, i]));
  const pieces = look.item_ids.map((x) => byId.get(x)).filter((x) => !!x);
  const events = s.data.events.filter((e) => e.look_id === look.id);
  const wears = s.data.wears.filter((w) => w.look_id === look.id);
  return (
    <div>
      <div className="row between">
        <button className="btn ghost" onClick={() => back('/looks')} data-testid="look-back"><Icon name="back" /> Back</button>
        <div className="row">
          <button className="iconbtn" aria-label="Rename" data-testid="look-edit" onClick={() => { setName(look.name); setOcc(look.occasion); setNotes(look.notes); setEditing(true); }}><Icon name="edit" /></button>
          <button className="iconbtn" aria-label="Delete look" data-testid="look-delete" onClick={async () => { await s.trashLook(look); navigate('/looks'); }}><Icon name="trash" /></button>
        </div>
      </div>
      {look.deleted_at && <div className="warnbox row between"><span>This look is in Trash.</span><button className="btn small" data-testid="look-restore" onClick={() => void s.restoreLook(look)}>Restore</button></div>}
      <h1>{look.name}</h1>
      <p className="mute">{look.occasion}{look.score != null ? ` · ${look.score}/10` : ''}{wears.length ? ` · worn ${wears.length}×` : ''}</p>
      {look.notes && <p>{look.notes}</p>}
      <div className="split">
        <div>{look.board_url && <img className="board-preview" src={imgUrl(look.board_url)} alt={`Board for ${look.name}`} />}</div>
        <div className="stack">
          <div className="row">
            <a className="btn primary" href={`#/studio?look=${look.id}`} data-testid="look-open-studio"><Icon name="match" /> Change pieces</a>
            <a className="btn" href={`#/plan?new=1&look=${look.id}`} data-testid="look-plan"><Icon name="calendar" /> Plan for an event</a>
            <button className="btn" data-testid="look-worn" onClick={async () => {
              await s.saveWear({ id: uuid(), profile_id: look.profile_id, date: today(), item_ids: look.item_ids, look_id: look.id, event_id: null, note: '' });
              s.toast(`Marked “${look.name}” as worn today`);
            }}><Icon name="check" /> Worn today</button>
          </div>
          {events.length > 0 && <p className="small">Planned for: {events.map((e) => <a key={e.id} href={`#/event/${e.id}`} data-testid={`look-event-${e.id}`}>{e.title} ({fmtDate(e.date)}) </a>)}</p>}
          <div className="grid">{pieces.map((i) => <ItemTile key={i!.id} item={i!} href={`#/piece/${i!.id}`} testid={`look-piece-${i!.id}`} />)}</div>
        </div>
      </div>
      {look.verdict && <VerdictCard v={look.verdict} byId={byId} />}
      {editing && (
        <Sheet title="Edit look" onClose={() => setEditing(false)} marker="look-edit-sheet">
          <form className="stack" onSubmit={async (e) => { e.preventDefault(); await s.saveLook({ ...look, name: name.trim() || look.name, occasion: occ, notes }); setEditing(false); s.toast('Look updated'); }}>
            <TextField label="Name" value={name} onChange={setName} testid="look-edit-name" />
            <SelectField label="Occasion" value={occ} onChange={setOcc} testid="look-edit-occasion" options={DEFAULT_OCCASIONS.map((o) => ({ value: o, label: o }))} />
            <label className="field">Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="look-edit-notes" /></label>
            <button className="btn primary" type="submit" data-testid="look-edit-save">Save</button>
          </form>
        </Sheet>
      )}
    </div>
  );
}
