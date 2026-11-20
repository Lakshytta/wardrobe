import { useStore } from '../lib/store.tsx';
import { Empty, Thumb } from '../components/ui.tsx';

const left = (d: string | null) => Math.max(0, 30 - Math.floor((Date.now() - Date.parse(d ?? '')) / 86400000));

export default function Trash() {
  const s = useStore();
  const items = s.data.items.filter((i) => i.status === 'trashed');
  const looks = s.data.looks.filter((l) => l.deleted_at);
  return (
    <div>
      <div className="row between">
        <h1>Trash</h1>
        {(items.length + looks.length) > 0 && <button className="btn danger" data-testid="trash-empty" onClick={async () => {
          if (!confirm(`Delete ${items.length + looks.length} thing(s) forever? This cannot be undone.`)) return;
          for (const i of items) await s.purgeItem(i);
          for (const l of looks) await s.purgeLook(l);
          s.toast('Trash emptied');
        }}>Empty trash</button>}
      </div>
      <p className="mute">Things stay here for 30 days, then are deleted for good.</p>
      {items.length + looks.length === 0 ? <Empty title="Trash is empty">Deleted pieces and looks will wait here for 30 days.</Empty> : (
        <div className="list">
          {items.map((i) => (
            <div key={i.id} className="listrow">
              <Thumb item={i} alt="" />
              <span className="grow"><span className="t">{i.name}</span><br /><span className="small mute">Piece · {left(i.deleted_at)} days left</span></span>
              <button className="btn small primary" data-testid={`trash-restore-${i.id}`} onClick={() => void s.restoreItem(i)}>Restore</button>
              <button className="btn small danger" data-testid={`trash-purge-${i.id}`} onClick={async () => { if (confirm(`Delete “${i.name}” forever?`)) { await s.purgeItem(i); s.toast('Deleted for good'); } }}>Delete</button>
            </div>
          ))}
          {looks.map((l) => (
            <div key={l.id} className="listrow">
              <span className="grow"><span className="t">{l.name}</span><br /><span className="small mute">Look · {left(l.deleted_at)} days left</span></span>
              <button className="btn small primary" data-testid={`trash-restore-look-${l.id}`} onClick={() => void s.restoreLook(l)}>Restore</button>
              <button className="btn small danger" data-testid={`trash-purge-look-${l.id}`} onClick={async () => { if (confirm(`Delete look “${l.name}” forever?`)) { await s.purgeLook(l); s.toast('Deleted for good'); } }}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
