import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, useWardrobe, nowIso } from '../lib/store.tsx';
import { navigate, useRoute } from '../lib/router.ts';
import { uuid } from '../lib/data/adapter.ts';
import type { Item, Look, Slot, Verdict } from '../lib/types.ts';
import { DEFAULT_OCCASIONS, CARE_LABEL } from '../lib/types.ts';
import { smarts } from '../lib/smarts/index.ts';
import { colourCheck } from '../lib/smarts/harmony.ts';
import { applySwap } from '../lib/smarts/styleCheck.ts';
import { shuffleLook } from '../lib/smarts/shuffle.ts';
import { repeatGuard } from '../lib/smarts/repeatGuard.ts';
import { occasionMatches } from '../lib/smarts/parseQuery.ts';
import { slotOf } from '../lib/smarts/wardrobe.ts';
import { prettyColour } from '../lib/smarts/colors.ts';
import { canvasToPng, drawBoard, sharePng, downloadBlob } from '../lib/board.ts';
import { Icon, ItemTile, Sheet, Swatch, TextField, SelectField, Thumb, slug } from '../components/ui.tsx';

const SLOTS: { id: Slot; label: string; hint: string }[] = [
  { id: 'main', label: 'Main', hint: 'Saree, suit, lehenga' },
  { id: 'top', label: 'Blouse / Top', hint: 'For sarees & lehengas' },
  { id: 'layer', label: 'Dupatta / Layer', hint: 'Dupatta or shawl' },
  { id: 'accessory', label: 'Accessories', hint: 'Jewellery, shoes, bags' },
];

export default function Studio() {
  const s = useStore();
  const { query } = useRoute();
  const { items, wardrobe, categories } = useWardrobe();
  const look = s.data.looks.find((l) => l.id === query.get('look'));
  const event = s.data.events.find((e) => e.id === query.get('event'));
  const [ids, setIds] = useState<string[]>(() => look?.item_ids ?? (query.get('with') ?? '').split(',').filter(Boolean));
  const [occasion, setOccasion] = useState<string>(look?.occasion || event?.occasion || query.get('shuffle') || 'Festive');
  const [active, setActive] = useState<Slot>('main');
  const [fitOnly, setFitOnly] = useState(true);
  const [verdict, setVerdict] = useState<Verdict | null>(look?.verdict ?? null);
  const [board, setBoard] = useState<{ url: string; blob: Blob } | null>(null);
  const [saving, setSaving] = useState(false);
  const byId = useMemo(() => new Map(s.data.items.map((i) => [i.id, i])), [s.data.items]);
  const chosen = ids.map((id) => byId.get(id)).filter((x): x is Item => !!x);
  const inSlot = (slot: Slot) => chosen.filter((i) => slotOf(i, categories) === slot);

  useEffect(() => {
    const sh = query.get('shuffle');
    if (sh && !look) { const occ = DEFAULT_OCCASIONS.includes(sh as any) ? sh : 'Daily'; setOccasion(occ); setIds(shuffleLook(occ, wardrobe)); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // any change invalidates the check & board
  const recheck = useRef(false);
  useEffect(() => {
    setBoard(null);
    if (recheck.current) { recheck.current = false; void runCheck(); return; }
    if (!look || ids.join() !== look.item_ids.join() || occasion !== look.occasion) setVerdict(null);
  }, [ids.join(), occasion]); // eslint-disable-line

  const pick = (it: Item) => {
    const slot = slotOf(it, categories);
    setIds((cur) => {
      if (cur.includes(it.id)) return cur.filter((x) => x !== it.id);
      if (slot === 'accessory') return [...cur, it.id].slice(-6);
      const without = cur.filter((x) => { const o = byId.get(x); return !o || slotOf(o, categories) !== slot; });
      return slot === 'main' ? [it.id, ...without] : [...without, it.id];
    });
  };

  const tray = items
    .filter((i) => slotOf(i, categories) === active)
    .filter((i) => !fitOnly || active === 'accessory' || occasionMatches(i, occasion))
    .sort((a, b) => Number(a.care_status !== 'in_wardrobe') - Number(b.care_status !== 'in_wardrobe'));

  const colours = chosen.filter((i) => slotOf(i, categories) !== 'accessory').map((i) => i.primary_color);
  const check = colourCheck([...new Set(colours)]);
  const warnings = event ? repeatGuard(ids, event.date, event.people, s.data.wears, s.data.events, wardrobe, { ignoreEventId: event.id }) : [];
  const away = chosen.filter((i) => i.care_status !== 'in_wardrobe');

  const runCheck = async () => setVerdict(await smarts().styleCheck(ids, occasion, wardrobe, { month: event ? Number(event.date.slice(5, 7)) : new Date().getMonth() + 1 }));
  const makeBoard = async () => {
    const c = await drawBoard(chosen, { title: look?.name || `${occasion} look`, occasion, score: verdict?.score ?? null, verdict: verdict?.verdict });
    const blob = await canvasToPng(c);
    if (board) URL.revokeObjectURL(board.url);
    const b = { url: URL.createObjectURL(blob), blob }; setBoard(b); return b;
  };

  return (
    <div>
      <div className="row between">
        <h1>{look ? `Edit “${look.name}”` : 'Mix & Match'}</h1>
        <a className="btn small" href="#/looks" data-testid="studio-looks"><Icon name="look" /> My looks</a>
      </div>
      {event && <p className="okbox">Planning for <strong>{event.title}</strong> on {event.date}. <a href={`#/event/${event.id}`} data-testid="studio-event-back">Back to event</a></p>}

      <div className="row" style={{ marginBottom: 12 }}>
        <div style={{ minWidth: 200, flex: 1 }}>
          <SelectField label="Occasion" value={occasion} onChange={setOccasion} testid="studio-occasion" options={DEFAULT_OCCASIONS.map((o) => ({ value: o, label: o }))} />
        </div>
        <div className="row" style={{ alignSelf: 'flex-end' }}>
          <button className="btn" data-testid="studio-shuffle" onClick={() => setIds(shuffleLook(occasion, wardrobe))}><Icon name="shuffle" /> Shuffle</button>
          <button className="btn ghost" data-testid="studio-clear" disabled={!ids.length} onClick={() => setIds([])}>Clear</button>
        </div>
      </div>

      <div className="slots" role="tablist" aria-label="Outfit slots">
        {SLOTS.map((sl) => {
          const its = inSlot(sl.id);
          return (
            <button key={sl.id} role="tab" aria-selected={active === sl.id} className={`slot${active === sl.id ? ' active' : ''}`} onClick={() => setActive(sl.id)} data-testid={`slot-${sl.id}`}>
              {its[0] ? <Thumb item={its[0]} alt="" /> : <span style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--mute)' }}><Icon name="plus" /></span>}
              <span className="lbl">{sl.label}<small>{its.length ? its.map((i) => i.name).join(', ') : sl.hint}</small></span>
            </button>
          );
        })}
      </div>

      <section className="section" aria-label={`Choose ${SLOTS.find((x) => x.id === active)!.label}`}>
        <div className="row between">
          <h3 style={{ margin: 0 }}>Choose {SLOTS.find((x) => x.id === active)!.label.toLowerCase()}</h3>
          {active !== 'accessory' && <button className="chip" aria-pressed={fitOnly} onClick={() => setFitOnly((v) => !v)} data-testid="tray-fit">Suits {occasion}</button>}
        </div>
        {tray.length ? (
          <div className="tray" role="tabpanel">
            {tray.map((i) => (
              <div key={i.id} className="stack" style={{ gap: 2 }}>
                <ItemTile item={i} selected={ids.includes(i.id)} onClick={() => pick(i)} testid={`tray-${i.id}`} />
              </div>
            ))}
          </div>
        ) : <p className="mute">{active === 'accessory' ? 'No jewellery, footwear or bags yet — add some from the Add tab.' : fitOnly ? `Nothing here is tagged for ${occasion}. Turn off “Suits ${occasion}” to see everything.` : 'Nothing in this slot yet.'}</p>}
      </section>

      {away.length > 0 && <p className="warnbox">{away.map((i) => `${i.name} is ${CARE_LABEL[i.care_status].toLowerCase()}`).join('. ')}.</p>}
      {warnings.length > 0 && <div className="warnbox" role="alert" data-testid="v-repeat-warning"><strong>Worn recently:</strong>{warnings.map((w, k) => <p key={k} style={{ margin: '4px 0 0' }}>{w.text}</p>)}</div>}

      {check.length > 0 && (
        <section className="section card" aria-labelledby="cc-h">
          <h3 id="cc-h">Colour check</h3>
          <ul className="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {check.map((p) => (
              <li key={`${p.a}-${p.b}`} className="row" style={{ gap: 8 }}>
                <Swatch name={p.a} /><Swatch name={p.b} />
                <strong>{p.label}</strong><span className="small mute">{prettyColour(p.a)} + {prettyColour(p.b)}: {p.text}</span>
                <span className={`tag ${p.ok ? 'ok' : 'warn'}`}>{p.ok ? 'Works' : 'Careful'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="row" style={{ margin: '12px 0' }}>
        <button className="btn primary" data-testid="studio-stylecheck" disabled={!ids.length} onClick={runCheck}><Icon name="sparkle" /> Style check</button>
        <button className="btn" data-testid="studio-board" disabled={!ids.length} onClick={makeBoard}><Icon name="image" /> Make board</button>
        <button className="btn" data-testid="studio-save" disabled={!ids.length} onClick={() => setSaving(true)}><Icon name="check" /> Save look</button>
      </div>

      {verdict && <VerdictCard v={verdict} byId={byId} onApply={(sw) => { recheck.current = true; setIds((cur) => applySwap(cur, sw)); }} />}

      {board && (
        <section className="section">
          <h3>Board</h3>
          <img className="board-preview" src={board.url} alt="Board of the chosen pieces and colours" style={{ maxWidth: 420 }} />
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn" data-testid="board-download" onClick={() => downloadBlob(board.blob, `${slug(look?.name || occasion)}-look.png`)}><Icon name="download" /> Save picture</button>
            <button className="btn primary" data-testid="board-share" onClick={async () => {
              const r = await sharePng(board.blob, look?.name || `${occasion} look`, verdict?.verdict ?? 'My outfit');
              if (r === 'downloaded') s.toast('Sharing is not available here, so the picture was saved instead.');
            }}><Icon name="share" /> Share (WhatsApp…)</button>
          </div>
        </section>
      )}

      {saving && (
        <SaveLookSheet initial={look} occasion={occasion} onClose={() => setSaving(false)} onSave={async ({ name, occasion: occ, notes }) => {
          let v = verdict;
          if (!v) { v = await smarts().styleCheck(ids, occ, wardrobe); setVerdict(v); }
          const id = look?.id ?? uuid();
          const c = await drawBoard(chosen, { title: name, occasion: occ, score: v.score, verdict: v.verdict });
          const blob = await canvasToPng(c);
          let board_url = '';
          try { board_url = await s.adapter.uploadImage(s.profileId, id, 'board', blob); } catch { /* board is optional */ }
          const row: Look = {
            id, profile_id: s.profileId, name, occasion: occ, notes, item_ids: ids, verdict: v, score: Math.round(v.score), board_url,
            created_at: look?.created_at ?? nowIso(), updated_at: nowIso(), deleted_at: null,
          };
          await s.saveLook(row);
          if (event) await s.saveEvent({ ...event, look_id: id });
          setSaving(false);
          s.toast(`Look “${name}” saved`);
          navigate(event ? `/event/${event.id}` : `/look/${id}`, { replace: true });
        }} />
      )}
    </div>
  );
}

export function VerdictCard({ v, byId, onApply }: { v: Verdict; byId: Map<string, Item>; onApply?: (s: Verdict['swaps'][number]) => void }) {
  return (
    <section className="section card verdict-card" aria-labelledby="v-h" data-testid="v-verdict">
      <div className="row between">
        <h3 id="v-h" style={{ margin: 0 }}>Style check</h3>
        <span className="badge" title="Worked out on this phone from colour and fabric rules">{v.source === 'rules' ? 'On-device tips' : 'AI tips'}</span>
      </div>
      <div className="row" style={{ alignItems: 'baseline', margin: '8px 0' }}>
        <span className="score" data-testid="v-score">{v.score}</span><span className="mute">/ 10</span>
      </div>
      <p><strong>{v.verdict}</strong></p>
      {v.occasion_fit && <p className="small">{v.occasion_fit}</p>}
      {v.works.length > 0 && <><h4>What works</h4><ul>{v.works.map((w, i) => <li key={i}>{w}</li>)}</ul></>}
      {v.change.length > 0 && <><h4>What to change</h4><ul>{v.change.map((w, i) => <li key={i}>{w}</li>)}</ul></>}
      {v.swaps.length > 0 && (
        <>
          <h4>Try instead (from your wardrobe)</h4>
          <div className="list">
            {v.swaps.map((sw) => {
              const w = byId.get(sw.with_id);
              if (!w) return null;
              return (
                <div key={`${sw.replace_id}-${sw.with_id}`} className="listrow">
                  <Thumb item={w} alt="" />
                  <span className="grow small">{sw.replace_id ? <>Swap <strong>{byId.get(sw.replace_id)?.name}</strong> for </> : 'Add '}<strong>{w.name}</strong><br /><span className="mute">{sw.why}</span></span>
                  {onApply && <button className="btn small primary" data-testid={`swap-apply-${sw.with_id}`} onClick={() => onApply(sw)}>Apply</button>}
                </div>
              );
            })}
          </div>
        </>
      )}
      {v.jewellery.length > 0 && <><h4>Jewellery</h4><ul>{v.jewellery.map((w, i) => <li key={i}>{w}</li>)}</ul></>}
      {v.footwear.length > 0 && <><h4>Footwear</h4><ul>{v.footwear.map((w, i) => <li key={i}>{w}</li>)}</ul></>}
    </section>
  );
}

function SaveLookSheet({ initial, occasion, onClose, onSave }: { initial?: Look; occasion: string; onClose: () => void; onSave: (v: { name: string; occasion: string; notes: string }) => Promise<void> }) {
  const [name, setName] = useState(initial?.name ?? `${occasion} look`);
  const [occ, setOcc] = useState(initial?.occasion || occasion);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [busy, setBusy] = useState(false);
  return (
    <Sheet title="Save this look" onClose={onClose} marker="save-look-sheet">
      <form className="stack" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await onSave({ name: name.trim() || 'My look', occasion: occ, notes }); } finally { setBusy(false); } }}>
        <TextField label="Name" value={name} onChange={setName} testid="look-name" required />
        <SelectField label="Occasion" value={occ} onChange={setOcc} testid="look-occasion" options={DEFAULT_OCCASIONS.map((o) => ({ value: o, label: o }))} />
        <label className="field">Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="look-notes" placeholder="e.g. Wear with the kundan set" /></label>
        <button className="btn primary" type="submit" disabled={busy} data-testid="look-save">{busy ? 'Saving…' : 'Save look'}</button>
      </form>
    </Sheet>
  );
}
