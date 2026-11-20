import { useMemo, useState } from 'react';
import { useStore, useWardrobe, today } from '../lib/store.tsx';
import { back, navigate } from '../lib/router.ts';
import { imgUrl } from '../lib/data/index.ts';
import { uuid } from '../lib/data/adapter.ts';
import { CARE_LABEL } from '../lib/types.ts';
import { prettyColour } from '../lib/smarts/colors.ts';
import { scoreLook } from '../lib/smarts/styleCheck.ts';
import { available, slotOf } from '../lib/smarts/wardrobe.ts';
import { Empty, Icon, ItemTile, PhotoZoom, Sheet, Swatch, fmtDate, daysFrom } from '../components/ui.tsx';
import { CareForm, ItemForm, downloadText, icsFor } from '../components/ItemForm.tsx';

export default function Piece({ id }: { id: string }) {
  const s = useStore();
  const { wardrobe, categories } = useWardrobe();
  const item = s.data.items.find((i) => i.id === id);
  const [sheet, setSheet] = useState<'edit' | 'care' | null>(null);

  const pairs = useMemo(() => {
    if (!item) return [];
    const slot = slotOf(item, categories);
    const want = slot === 'main' ? (item.category_id === 'sarees' || item.category_id === 'lehengas' ? ['top'] : ['layer']) : slot === 'top' || slot === 'layer' ? ['main'] : [];
    return available(wardrobe.items)
      .filter((o) => o.id !== item.id && want.includes(slotOf(o, categories)))
      .filter((o) => slot !== 'top' || o.category_id === 'sarees' || o.category_id === 'lehengas')
      .map((o) => ({ o, sc: scoreLook(slot === 'main' ? [item, o] : [o, item], o.occasions[0] ?? 'Festive', wardrobe).score }))
      .filter((x) => x.sc >= 7).sort((a, b) => b.sc - a.sc).slice(0, 6);
  }, [item, wardrobe, categories]);

  if (!item) return <Empty title="This piece isn't here" action={<a className="btn" href="#/closet" data-testid="piece-missing-closet">Back to closet</a>}>It may have been deleted, or belongs to another family member.</Empty>;

  const wears = s.data.wears.filter((w) => w.item_ids.includes(item.id)).sort((a, b) => b.date.localeCompare(a.date));
  const cat = categories.find((c) => c.id === item.category_id);
  const away = item.care_status !== 'in_wardrobe';
  const due = item.care_due ? daysFrom(item.care_due) : null;
  const visibleTags = item.tags.filter((t) => !/^p\d{4}$/.test(t));

  return (
    <div>
      <div className="row between no-print" style={{ marginBottom: 8 }}>
        <button className="btn ghost" onClick={() => back('/closet')} data-testid="piece-back"><Icon name="back" /> Back</button>
        <div className="row">
          <button className="iconbtn" aria-label={item.favorite ? 'Remove from favourites' : 'Add to favourites'} aria-pressed={item.favorite} data-testid="piece-fav"
            onClick={() => void s.saveItem({ ...item, favorite: !item.favorite })} style={{ color: 'var(--danger)' }}><Icon name={item.favorite ? 'heartFill' : 'heart'} /></button>
          <button className="iconbtn" aria-label="Edit" data-testid="piece-edit" onClick={() => setSheet('edit')}><Icon name="edit" /></button>
          <button className="iconbtn" aria-label="Delete" data-testid="piece-delete" onClick={async () => { await s.trashItem(item); navigate('/closet'); }}><Icon name="trash" /></button>
        </div>
      </div>

      {item.status === 'trashed' && (
        <div className="warnbox row between" style={{ marginBottom: 12 }}>
          <span>This piece is in Trash.</span>
          <button className="btn small" data-testid="piece-restore" onClick={() => void s.restoreItem(item)}>Restore</button>
        </div>
      )}

      <div className="split">
        <div>
          <PhotoZoom src={imgUrl(item.image_url || item.thumb_url)} alt={item.name} />
          {item.palette_hex.length > 0 && (
            <div className="row" style={{ marginTop: 10, gap: 6 }} aria-label="Colours in the photo">
              {item.palette_hex.map((h) => <span key={h} className="swatch big" style={{ background: h, borderRadius: 8 }} title={h} />)}
            </div>
          )}
        </div>
        <div className="stack">
          <div>
            <p className="mute" style={{ margin: 0 }}>{cat?.name}</p>
            <h1 style={{ marginBottom: 4 }}>{item.name}</h1>
            {item.details && <p>{item.details}</p>}
          </div>
          <div className="row">
            <span className="row" style={{ gap: 6 }}><Swatch name={item.primary_color} big /><strong>{prettyColour(item.primary_color)}</strong></span>
            {item.accent_colors.map((c) => <span key={c} className="row" style={{ gap: 4 }}><Swatch name={c} />{prettyColour(c)}</span>)}
          </div>
          <dl className="kv">
            {item.fabric && <><dt>Fabric</dt><dd>{item.fabric}</dd></>}
            {item.work && <><dt>Work</dt><dd>{item.work}</dd></>}
            <dt>Season</dt><dd>{item.season}</dd>
            {item.occasions.length > 0 && <><dt>Wear for</dt><dd>{item.occasions.join(', ')}</dd></>}
            {item.price != null && <><dt>Price</dt><dd>₹{item.price.toLocaleString('en-IN')}{wears.length ? ` · ₹${Math.round(item.price / wears.length).toLocaleString('en-IN')} per wear` : ''}</dd></>}
          </dl>
          {visibleTags.length > 0 && <div className="chips">{visibleTags.map((t) => <span key={t} className="tag">{t}</span>)}</div>}

          <div className={away ? 'warnbox' : 'okbox'}>
            <div className="row between">
              <span><strong>{CARE_LABEL[item.care_status]}</strong>
                {item.care_status === 'lent' && item.lent_to && <> to {item.lent_to}</>}
                {item.care_contact && <> · {item.care_contact}</>}
                {due !== null && <> · {due < 0 ? `overdue by ${-due} day${due === -1 ? '' : 's'}` : `due ${fmtDate(item.care_due)}`}</>}
                {item.care_cost != null && <> · ₹{item.care_cost}</>}
              </span>
              <button className="btn small" onClick={() => setSheet('care')} data-testid="piece-care">{away ? 'Update' : 'Send to tailor / lend'}</button>
            </div>
            {item.care_note && <p className="small" style={{ margin: '6px 0 0' }}>{item.care_note}</p>}
            {away && item.care_due && (
              <button className="btn small ghost" data-testid="piece-reminder" style={{ marginTop: 6 }}
                onClick={() => downloadText(`${item.name}-reminder.ics`, icsFor(item.care_status === 'lent' ? `Get back: ${item.name} from ${item.lent_to}` : `Collect: ${item.name}`, item.care_due!, item.care_note), 'text/calendar')}>
                <Icon name="calendar" /> Add reminder to my calendar
              </button>
            )}
          </div>

          <div className="row">
            <a className="btn primary" href={`#/studio?with=${item.id}`} data-testid="piece-style"><Icon name="sparkle" /> Style this</a>
            <button className="btn" data-testid="piece-worn" onClick={async () => {
              await s.saveWear({ id: uuid(), profile_id: item.profile_id, date: today(), item_ids: [item.id], look_id: null, event_id: null, note: '' });
              s.toast(`Marked “${item.name}” as worn today`);
            }}><Icon name="check" /> Worn today</button>
          </div>
        </div>
      </div>

      <section className="section">
        <h2>Pairs well with</h2>
        {pairs.length ? <div className="grid">{pairs.map(({ o, sc }) => (
          <div key={o.id} className="stack" style={{ gap: 4 }}>
            <ItemTile item={o} href={`#/studio?with=${item.id},${o.id}`} testid={`pair-${o.id}`} />
            <span className="small mute">{sc}/10 together</span>
          </div>
        ))}</div> : <p className="mute">Nothing scores 7+ with this yet. Try <a href={`#/studio?with=${item.id}`} data-testid="piece-pairs-studio">Mix &amp; Match</a> or see gaps in <a href="#/insights" data-testid="piece-pairs-insights">Insights</a>.</p>}
      </section>

      <section className="section">
        <h2>Wear history</h2>
        {wears.length ? (
          <ul className="list" style={{ listStyle: 'none', padding: 0 }}>
            {wears.map((w) => {
              const ev = s.data.events.find((e) => e.id === w.event_id);
              return (
                <li key={w.id} className="listrow">
                  <span className="grow"><span className="t">{fmtDate(w.date)}</span>{ev && <span className="mute"> · {ev.title}</span>}</span>
                  <button className="iconbtn" aria-label={`Remove wear on ${fmtDate(w.date)}`} data-testid={`wear-del-${w.id}`} onClick={() => void s.deleteWear(w)}><Icon name="close" /></button>
                </li>
              );
            })}
          </ul>
        ) : <p className="mute">Not worn yet. Tap “Worn today”, or plan it for an event.</p>}
      </section>

      {sheet === 'edit' && <Sheet title="Edit piece" onClose={() => setSheet(null)} marker="edit-sheet"><ItemForm item={item} onCancel={() => setSheet(null)} onSave={async (i) => { await s.saveItem(i); setSheet(null); s.toast('Saved'); }} /></Sheet>}
      {sheet === 'care' && <Sheet title="Where is it?" onClose={() => setSheet(null)} marker="care-sheet"><CareForm item={item} onSave={async (i) => { await s.saveItem(i); setSheet(null); s.toast('Status updated'); }} /></Sheet>}
    </div>
  );
}
