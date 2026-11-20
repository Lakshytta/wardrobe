import { useStore } from '../lib/store.tsx';
import { imgUrl } from '../lib/data/index.ts';
import { Empty, Icon, Thumb } from '../components/ui.tsx';

export default function Looks() {
  const s = useStore();
  const looks = s.data.looks.filter((l) => !l.deleted_at).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const byId = new Map(s.data.items.map((i) => [i.id, i]));
  return (
    <div>
      <div className="row between"><h1>My looks</h1><a className="btn primary" href="#/studio" data-testid="looks-new"><Icon name="plus" /> New look</a></div>
      {looks.length === 0 ? (
        <Empty title="No looks saved yet" action={<a className="btn primary" href="#/studio?shuffle=Festive" data-testid="looks-empty-start">Make my first look</a>}>Put a saree, blouse and jewellery together in Mix &amp; Match, then tap Save look.</Empty>
      ) : (
        <div className="grid">
          {looks.map((l) => {
            const first = byId.get(l.item_ids[0]);
            return (
              <a key={l.id} className="tile" href={`#/look/${l.id}`} data-testid={`look-${l.id}`}>
                {l.board_url ? <img className="ph" src={imgUrl(l.board_url)} alt="" loading="lazy" style={{ objectFit: 'cover', objectPosition: 'top' }} /> : first ? <Thumb item={first} className="ph" alt="" /> : <div className="ph" />}
                <span className="meta"><span className="name">{l.name}</span><span className="small mute">{l.occasion}{l.score != null ? ` · ${l.score}/10` : ''} · {l.item_ids.length} pieces</span></span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
