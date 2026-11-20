import { useEffect, useMemo, useState } from 'react';
import { useStore, useWardrobe, today } from '../lib/store.tsx';
import { smarts, type Gap } from '../lib/smarts/index.ts';
import { colour, swatchCss } from '../lib/smarts/colors.ts';
import { Empty, Thumb, fmtDate } from '../components/ui.tsx';

function Bars({ rows, label }: { rows: { key: string; label: React.ReactNode; value: number; title: string }[]; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="stack" role="table" aria-label={label} style={{ gap: 8 }}>
      {rows.map((r) => (
        <div key={r.key} className="barrow" role="row" title={r.title}>
          <span role="rowheader" className="small">{r.label}</span>
          <span className="bar" role="cell" aria-label={r.title}><i style={{ width: `${(r.value / max) * 100}%` }} /></span>
          <span role="cell" className="small" style={{ textAlign: 'right' }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

const FAMILY_SWATCH: Record<string, string> = {
  red: 'red', pink: 'pink', orange: 'orange', yellow: 'yellow', green: 'green', teal: 'teal', blue: 'blue', purple: 'purple',
  brown: 'brown', neutral: 'ivory', metallic: 'gold', multi: 'multi',
};

export default function Insights() {
  const s = useStore();
  const { items, wardrobe, categories } = useWardrobe();
  const [gaps, setGaps] = useState<Gap[] | null>(null);
  useEffect(() => { void smarts().findGaps(wardrobe, s.data.wears).then(setGaps); }, [wardrobe, s.data.wears]);

  const stats = useMemo(() => {
    const count = new Map<string, number>(); const last = new Map<string, string>();
    for (const w of s.data.wears) for (const id of w.item_ids) { count.set(id, (count.get(id) ?? 0) + 1); if ((last.get(id) ?? '') < w.date) last.set(id, w.date); }
    const ranked = items.map((i) => ({ i, n: count.get(i.id) ?? 0, last: last.get(i.id) })).sort((a, b) => b.n - a.n || a.i.name.localeCompare(b.i.name));
    const cutoff = new Date(Date.now() - 182 * 86400000).toISOString().slice(0, 10);
    const stale = ranked.filter((r) => !r.last || r.last < cutoff);
    const cpw = ranked.filter((r) => r.i.price != null).map((r) => ({ ...r, cpw: r.n ? r.i.price! / r.n : r.i.price! })).sort((a, b) => b.cpw - a.cpw);
    const fam = new Map<string, number>();
    for (const i of items) { const f = colour(i.primary_color)?.family ?? 'multi'; fam.set(f, (fam.get(f) ?? 0) + 1); }
    const cats = categories.map((c) => ({ c, n: items.filter((i) => i.category_id === c.id).length })).filter((x) => x.n > 0);
    return { ranked, stale, cpw, fam: [...fam.entries()].sort((a, b) => b[1] - a[1]), cats };
  }, [items, s.data.wears, categories]);

  if (!items.length) return <Empty title="Nothing to count yet" action={<a className="btn primary" href="#/add" data-testid="insights-add">Add photos</a>}>Add pieces and log what you wear to see insights.</Empty>;
  const worn = stats.ranked.filter((r) => r.n > 0);

  return (
    <div>
      <h1>Insights</h1>
      <p className="mute">{items.length} pieces · {s.data.wears.length} wears logged · as of {fmtDate(today())}</p>

      <section className="section card">
        <h2>What to add</h2>
        {gaps === null ? <p className="mute">Thinking…</p> : gaps.length === 0 ? <p>Your wardrobe is well balanced.</p> : (
          <ul className="list" style={{ listStyle: 'none', padding: 0 }} data-testid="v-gaps">
            {gaps.map((g, k) => <li key={k} className="okbox"><strong>{g.title}</strong><br /><span className="small">{g.why}</span><br /><span>{g.suggestion}</span></li>)}
          </ul>
        )}
      </section>

      <div className="split">
        <section className="section card">
          <h2>Most worn</h2>
          {worn.length ? <ol>{worn.slice(0, 5).map((r) => <li key={r.i.id}><a href={`#/piece/${r.i.id}`} data-testid={`ins-most-${r.i.id}`}>{r.i.name}</a> — {r.n}×</li>)}</ol>
            : <p className="mute">Log wears with “Worn today” or by marking events as worn.</p>}
          <h3>Least worn</h3>
          <ol>{[...stats.ranked].reverse().slice(0, 5).map((r) => <li key={r.i.id}><a href={`#/piece/${r.i.id}`} data-testid={`ins-least-${r.i.id}`}>{r.i.name}</a> — {r.n}×</li>)}</ol>
        </section>
        <section className="section card">
          <h2>Not worn in 6+ months</h2>
          <p className="mute small">{stats.stale.length} piece{stats.stale.length === 1 ? '' : 's'}</p>
          <div className="strip">{stats.stale.slice(0, 12).map((r) => <a key={r.i.id} href={`#/piece/${r.i.id}`} style={{ width: 96 }} data-testid={`ins-stale-${r.i.id}`} title={r.i.name}><Thumb item={r.i} alt={r.i.name} /></a>)}</div>
        </section>
      </div>

      <section className="section card">
        <h2>Cost per wear</h2>
        {stats.cpw.length ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={{ textAlign: 'left' }}>Piece</th><th style={{ textAlign: 'right' }}>Price</th><th style={{ textAlign: 'right' }}>Wears</th><th style={{ textAlign: 'right' }}>Per wear</th></tr></thead>
            <tbody>{stats.cpw.slice(0, 10).map((r) => <tr key={r.i.id}><td>{r.i.name}</td><td style={{ textAlign: 'right' }}>₹{r.i.price!.toLocaleString('en-IN')}</td><td style={{ textAlign: 'right' }}>{r.n}</td><td style={{ textAlign: 'right' }}>₹{Math.round(r.cpw).toLocaleString('en-IN')}</td></tr>)}</tbody>
          </table>
        ) : <p className="mute">Add a price to any piece (Edit → Price) to see cost per wear.</p>}
      </section>

      <div className="split">
        <section className="section card">
          <h2>Colour balance</h2>
          <Bars label="Pieces by colour family" rows={stats.fam.map(([f, n]) => ({ key: f, value: n, title: `${f}: ${n} pieces`, label: <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}><span className="swatch" style={{ background: swatchCss(FAMILY_SWATCH[f] ?? 'multi') }} />{f}</span> }))} />
        </section>
        <section className="section card">
          <h2>Categories</h2>
          <Bars label="Pieces by category" rows={stats.cats.map(({ c, n }) => ({ key: c.id, value: n, title: `${c.name}: ${n} pieces`, label: c.name }))} />
        </section>
      </div>
    </div>
  );
}
