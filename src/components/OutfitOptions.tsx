import { useMemo, useState } from 'react';
import type { Item, OutfitOption, WEvent } from '../lib/types.ts';
import { useWardrobe } from '../lib/store.tsx';
import { uuid } from '../lib/data/adapter.ts';
import { scoreLook } from '../lib/smarts/styleCheck.ts';
import { slotOf } from '../lib/smarts/wardrobe.ts';
import { Icon, ItemTile, Sheet, TextField, Thumb } from './ui.tsx';

export function blankOption(): OutfitOption {
  return { id: uuid(), item_ids: [], bag_id: null, jewellery_ids: [], bag_note: '', jewellery_note: '', note: '', chosen: false };
}

/** Every piece an option uses (outfit + bag + jewellery). */
export function optionItemIds(o: OutfitOption): string[] {
  return [...o.item_ids, ...(o.bag_id ? [o.bag_id] : []), ...o.jewellery_ids];
}

/** Splits a set of chosen pieces (e.g. from Mix & Match) into outfit / bag / jewellery. */
export function optionFromItems(ids: string[], byId: Map<string, Item>): OutfitOption {
  const o = blankOption();
  for (const id of ids) {
    const it = byId.get(id);
    if (!it) continue;
    if (it.category_id === 'bags' && !o.bag_id) o.bag_id = id;
    else if (it.category_id === 'jewellery') o.jewellery_ids.push(id);
    else o.item_ids.push(id);
  }
  return o;
}

type Tab = 'outfit' | 'bag' | 'jewellery';

export function OptionEditor({ event, initial, onClose, onSave }: { event: WEvent; initial: OutfitOption; onClose: () => void; onSave: (o: OutfitOption) => void }) {
  const { items, categories, wardrobe } = useWardrobe();
  const [o, setO] = useState<OutfitOption>(initial);
  const [tab, setTab] = useState<Tab>('outfit');
  const [cat, setCat] = useState<string>('all');
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const outfitCats = categories.filter((c) => c.slot !== 'accessory' || c.id === 'footwear');
  const pool = tab === 'bag' ? items.filter((i) => i.category_id === 'bags')
    : tab === 'jewellery' ? items.filter((i) => i.category_id === 'jewellery')
    : items.filter((i) => outfitCats.some((c) => c.id === i.category_id) && (cat === 'all' || i.category_id === cat));
  const outfit = o.item_ids.map((id) => byId.get(id)).filter((x): x is Item => !!x);
  const score = outfit.some((i) => slotOf(i, categories) === 'main') ? scoreLook(outfit, event.occasion, wardrobe).score : null;

  const toggle = (it: Item) => setO((cur) => {
    if (tab === 'bag') return { ...cur, bag_id: cur.bag_id === it.id ? null : it.id };
    if (tab === 'jewellery') return { ...cur, jewellery_ids: cur.jewellery_ids.includes(it.id) ? cur.jewellery_ids.filter((x) => x !== it.id) : [...cur.jewellery_ids, it.id] };
    if (cur.item_ids.includes(it.id)) return { ...cur, item_ids: cur.item_ids.filter((x) => x !== it.id) };
    // one piece per slot (main / blouse / dupatta), like Mix & Match
    const slot = slotOf(it, categories);
    const keep = slot === 'accessory' ? cur.item_ids : cur.item_ids.filter((x) => { const p = byId.get(x); return !p || slotOf(p, categories) !== slot; });
    return { ...cur, item_ids: slot === 'main' ? [it.id, ...keep] : [...keep, it.id] };
  });
  const selected = (it: Item) => (tab === 'bag' ? o.bag_id === it.id : tab === 'jewellery' ? o.jewellery_ids.includes(it.id) : o.item_ids.includes(it.id));
  const counts = { outfit: o.item_ids.length, bag: o.bag_id ? 1 : 0, jewellery: o.jewellery_ids.length };

  return (
    <Sheet title={`Outfit option · ${event.title}`} onClose={onClose} marker="option-sheet">
      <div className="stack">
        <div className="chips" role="tablist" aria-label="What to choose">
          {(['outfit', 'bag', 'jewellery'] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={`chip${tab === t ? ' on' : ''}`} onClick={() => setTab(t)} data-testid={`option-tab-${t}`}>
              {t === 'outfit' ? 'Outfit' : t === 'bag' ? 'Bag' : 'Jewellery'}{counts[t] ? ` (${counts[t]})` : ''}
            </button>
          ))}
        </div>
        {tab === 'outfit' && (
          <div className="chips scroll" aria-label="Category">
            <button className="chip" aria-pressed={cat === 'all'} onClick={() => setCat('all')} data-testid="option-cat-all">All</button>
            {outfitCats.filter((c) => items.some((i) => i.category_id === c.id)).map((c) => (
              <button key={c.id} className="chip" aria-pressed={cat === c.id} onClick={() => setCat(c.id)} data-testid={`option-cat-${c.id}`}>{c.name}</button>
            ))}
          </div>
        )}
        {pool.length ? (
          <div className="tray" role="tabpanel">
            {pool.map((it) => <ItemTile key={it.id} item={it} selected={selected(it)} onClick={() => toggle(it)} testid={`option-pick-${it.id}`} />)}
          </div>
        ) : (
          <p className="mute small">{tab === 'bag' ? 'No bags photographed yet — add them from Add (category Bags), or just write it below.' : tab === 'jewellery' ? 'No jewellery photographed yet — add it from Add (category Jewellery), or just write it below.' : 'Nothing here yet.'}</p>
        )}
        {tab === 'bag' && <TextField label="Bag (if not photographed)" value={o.bag_note} onChange={(v) => setO({ ...o, bag_note: v })} testid="option-bag-note" placeholder="e.g. Gold potli from Jaipur" />}
        {tab === 'jewellery' && <TextField label="Jewellery notes" value={o.jewellery_note} onChange={(v) => setO({ ...o, jewellery_note: v })} testid="option-jewellery-note" placeholder="e.g. Mum's kundan set + maang tikka" />}
        <TextField label="Note" value={o.note} onChange={(v) => setO({ ...o, note: v })} testid="option-note" placeholder="e.g. Get the blouse altered" />
        <div className="okbox small" data-testid="v-option-summary">
          <strong>This option:</strong> {outfit.map((i) => i.name).join(' + ') || 'no outfit yet'}
          {' · '}Bag: {o.bag_id ? byId.get(o.bag_id)?.name : o.bag_note || '—'}
          {' · '}Jewellery: {[...o.jewellery_ids.map((id) => byId.get(id)?.name), o.jewellery_note].filter(Boolean).join(', ') || '—'}
          {score != null && <> · Style score <strong>{score}/10</strong> for {event.occasion}</>}
        </div>
        <div className="row end">
          <button className="btn" onClick={onClose} data-testid="option-cancel">Cancel</button>
          <button className="btn primary" onClick={() => onSave(o)} data-testid="option-save" disabled={!o.item_ids.length && !o.bag_id && !o.jewellery_ids.length && !o.bag_note && !o.jewellery_note && !o.note}>Save option</button>
        </div>
      </div>
    </Sheet>
  );
}

/** Small row of thumbnails for an option (outfit, then bag, then jewellery). */
export function OptionThumbs({ o, byId, size = 56 }: { o: OutfitOption; byId: Map<string, Item>; size?: number }) {
  const its = optionItemIds(o).map((id) => byId.get(id)).filter((x): x is Item => !!x);
  if (!its.length) return null;
  return (
    <span className="row" style={{ gap: 4 }}>
      {its.map((i) => <span key={i.id} style={{ width: size, height: size, borderRadius: 8, overflow: 'hidden', flex: 'none' }} title={i.name}><Thumb item={i} alt={i.name} /></span>)}
    </span>
  );
}

export function OptionCard({ o, index, event, byId, otherPicks, onEdit, onChoose, onDelete }: {
  o: OutfitOption; index: number; event: WEvent; byId: Map<string, Item>; otherPicks: Map<string, string>;
  onEdit: () => void; onChoose: () => void; onDelete: () => void;
}) {
  const { wardrobe, categories } = useWardrobe();
  const outfit = o.item_ids.map((id) => byId.get(id)).filter((x): x is Item => !!x);
  const bag = o.bag_id ? byId.get(o.bag_id) : undefined;
  const jewels = o.jewellery_ids.map((id) => byId.get(id)).filter((x): x is Item => !!x);
  const hasMain = outfit.some((i) => slotOf(i, categories) === 'main');
  const score = hasMain ? scoreLook(outfit, event.occasion, wardrobe).score : null;
  const clash = outfit.filter((i) => slotOf(i, categories) === 'main' && otherPicks.has(i.id)).map((i) => `${i.name} is already your pick for ${otherPicks.get(i.id)}`);
  return (
    <article className="card stack" style={{ gap: 8, borderColor: o.chosen ? 'var(--accent)' : undefined, borderWidth: o.chosen ? 2 : 1 }} data-testid={`v-option-${o.id}`}>
      <div className="row between">
        <strong>{o.chosen ? '⭐ Final choice' : `Option ${index + 1}`}</strong>
        {score != null && <span className="tag ok">Style {score}/10</span>}
      </div>
      <div className="stack" style={{ gap: 6 }}>
        <div><span className="small mute">Outfit</span><br />{outfit.length ? <span className="row" style={{ gap: 6 }}>{outfit.map((i) => <a key={i.id} href={`#/piece/${i.id}`} data-testid={`option-piece-${i.id}`} style={{ width: 72 }} title={i.name}><Thumb item={i} alt={i.name} /></a>)}</span> : <span className="mute">Not picked yet</span>}</div>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div className="grow"><span className="small mute">Bag</span><br />{bag ? <span className="row" style={{ gap: 6 }}><span style={{ width: 56 }}><Thumb item={bag} alt={bag.name} /></span>{bag.name}</span> : o.bag_note || <span className="mute">—</span>}</div>
          <div className="grow"><span className="small mute">Jewellery</span><br />
            {jewels.length > 0 && <span className="row" style={{ gap: 4 }}>{jewels.map((j) => <span key={j.id} style={{ width: 56 }} title={j.name}><Thumb item={j} alt={j.name} /></span>)}</span>}
            {o.jewellery_note || (!jewels.length && <span className="mute">—</span>)}
          </div>
        </div>
        {o.note && <p className="small" style={{ margin: 0 }}>{o.note}</p>}
        {clash.length > 0 && <p className="warnbox small" style={{ margin: 0 }}>{clash.join('. ')}.</p>}
      </div>
      <div className="row end">
        <button className="btn small danger" onClick={onDelete} data-testid={`option-delete-${o.id}`} aria-label={`Delete option ${index + 1}`}><Icon name="trash" /></button>
        <button className="btn small" onClick={onEdit} data-testid={`option-edit-${o.id}`}><Icon name="edit" /> Edit</button>
        <button className={`btn small${o.chosen ? '' : ' primary'}`} onClick={onChoose} data-testid={`option-choose-${o.id}`}>{o.chosen ? 'Undo final choice' : '⭐ Make final choice'}</button>
      </div>
    </article>
  );
}
