import { useMemo, useState } from 'react';
import { useStore, useWardrobe } from '../lib/store.tsx';
import { navigate, useRoute } from '../lib/router.ts';
import { parseQuery, searchItems, type QueryFilters } from '../lib/smarts/parseQuery.ts';
import { COLOURS, prettyColour } from '../lib/smarts/colors.ts';
import { DEFAULT_OCCASIONS, SEASONS } from '../lib/types.ts';
import { Empty, Icon, ItemTile, Swatch, Thumb, slug } from '../components/ui.tsx';

const FABRICS = ['silk', 'raw silk', 'georgette', 'organza', 'tissue', 'brocade', 'velvet', 'chanderi', 'cotton', 'net', 'crepe'];
const KEYS = ['cat', 'color', 'occ', 'fabric', 'season'] as const;
type K = (typeof KEYS)[number];
const FKEY: Record<K, keyof QueryFilters> = { cat: 'categories', color: 'colors', occ: 'occasions', fabric: 'fabrics', season: 'seasons' };

function readView(): 'grid' | 'one' { try { return localStorage.getItem('closet-view') === 'one' ? 'one' : 'grid'; } catch { return 'grid'; } }

export default function Closet() {
  const { query } = useRoute();
  const s = useStore();
  const { items, categories } = useWardrobe();
  const [text, setText] = useState(query.get('t') ?? '');
  const [view, setView] = useState<'grid' | 'one'>(readView);
  const [idx, setIdx] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // legacy ?q= (from home "favourites") → parse once
  const q0 = query.get('q');
  const list = (k: string) => (query.get(k) ?? '').split(',').filter(Boolean);
  const filters: QueryFilters = {
    categories: list('cat'), colors: list('color'), occasions: list('occ'), fabrics: list('fabric'), seasons: list('season'),
    favorite: query.get('fav') === '1',
  };
  let terms = (query.get('t') ?? '').split(' ').filter(Boolean);
  if (q0) {
    const pq = parseQuery(q0);
    for (const k of KEYS) filters[FKEY[k]] = [...new Set([...(filters[FKEY[k]] as string[]), ...(pq.filters[FKEY[k]] as string[])])] as any;
    filters.favorite = filters.favorite || pq.filters.favorite;
    terms = [...terms, ...pq.terms];
  }
  const hint = parseQuery(filters.occasions.join(' ').toLowerCase()).hintColours;
  const any = KEYS.some((k) => (filters[FKEY[k]] as string[]).length) || filters.favorite || terms.length > 0;
  const results = useMemo(() => searchItems(items, { filters, terms, hintColours: hint }), [items, query.toString()]); // eslint-disable-line

  const setParams = (next: Partial<Record<K | 't' | 'fav', string[]>>) => {
    const p = new URLSearchParams();
    const cur: Record<string, string[]> = { cat: filters.categories, color: filters.colors, occ: filters.occasions, fabric: filters.fabrics, season: filters.seasons, t: terms, fav: filters.favorite ? ['1'] : [] };
    for (const [k, v] of Object.entries({ ...cur, ...next })) if (v.length) p.set(k, k === 't' ? v.join(' ') : v.join(','));
    navigate(`/closet${p.toString() ? `?${p}` : ''}`, { replace: true });
    setIdx(0);
  };
  const toggle = (k: K, v: string) => {
    const cur = filters[FKEY[k]] as string[];
    setParams({ [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };
  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const pq = parseQuery(text);
    const merged: Partial<Record<K | 't' | 'fav', string[]>> = { t: pq.terms };
    for (const k of KEYS) merged[k] = [...new Set([...(filters[FKEY[k]] as string[]), ...(pq.filters[FKEY[k]] as string[])])];
    if (pq.filters.favorite) merged.fav = ['1'];
    setText('');
    setParams(merged);
  };
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;
  const chips: { k: K | 't' | 'fav'; v: string; label: React.ReactNode }[] = [
    ...filters.categories.map((v) => ({ k: 'cat' as const, v, label: catName(v) })),
    ...filters.colors.map((v) => ({ k: 'color' as const, v, label: <><Swatch name={v} />{prettyColour(v)}</> })),
    ...filters.occasions.map((v) => ({ k: 'occ' as const, v, label: v })),
    ...filters.fabrics.map((v) => ({ k: 'fabric' as const, v, label: v })),
    ...filters.seasons.map((v) => ({ k: 'season' as const, v, label: v })),
    ...terms.map((v) => ({ k: 't' as const, v, label: `“${v}”` })),
    ...(filters.favorite ? [{ k: 'fav' as const, v: '1', label: '♥ Favourites' }] : []),
  ];
  const removeChip = (c: (typeof chips)[number]) => {
    if (c.k === 'fav') return setParams({ fav: [] });
    if (c.k === 't') return setParams({ t: terms.filter((x) => x !== c.v) });
    toggle(c.k, c.v);
  };
  const changeView = (v: 'grid' | 'one') => { setView(v); try { localStorage.setItem('closet-view', v); } catch { /* */ } };
  const usedColours = COLOURS.filter((c) => items.some((i) => i.primary_color === c.name || i.accent_colors.includes(c.name)));
  const cur = results[Math.min(idx, results.length - 1)];

  return (
    <div>
      <h1>Closet</h1>
      <form role="search" onSubmit={onSearch} className="row" style={{ flexWrap: 'nowrap', marginBottom: 10 }}>
        <label className="sr-only" htmlFor="closet-search">Search in plain words</label>
        <input id="closet-search" type="search" placeholder='Try "green for mehendi" or "navy blouse"' value={text} onChange={(e) => setText(e.target.value)} data-testid="closet-search" />
        <button className="btn primary" type="submit" data-testid="closet-search-go" aria-label="Search"><Icon name="search" /></button>
      </form>

      {chips.length > 0 && (
        <div className="chips" style={{ marginBottom: 10 }} aria-label="Active filters">
          {chips.map((c) => (
            <button key={`${c.k}-${c.v}`} className="chip on" onClick={() => removeChip(c)} data-testid={`filter-chip-${c.k}-${slug(c.v)}`} aria-label={`Remove filter ${typeof c.label === 'string' ? c.label : c.v}`}>
              {c.label}<span className="x" aria-hidden="true">×</span>
            </button>
          ))}
          <button className="chip" onClick={() => navigate('/closet', { replace: true })} data-testid="filter-clear">Clear all</button>
        </div>
      )}

      <div className="row between" style={{ marginBottom: 10 }}>
        <button className="btn small" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters} data-testid="closet-toggle-filters"><Icon name="tag" /> {showFilters ? 'Hide filters' : 'Filters'}</button>
        <div className="row" role="group" aria-label="View">
          <button className="iconbtn" aria-label="Grid view" aria-pressed={view === 'grid'} onClick={() => changeView('grid')} data-testid="view-grid" style={view === 'grid' ? { background: 'var(--tint)' } : undefined}><Icon name="grid" /></button>
          <button className="iconbtn" aria-label="One by one" aria-pressed={view === 'one'} onClick={() => changeView('one')} data-testid="view-one" style={view === 'one' ? { background: 'var(--tint)' } : undefined}><Icon name="single" /></button>
        </div>
      </div>

      {(showFilters || !any) && (
        <div className="stack" style={{ marginBottom: 16 }}>
          {!any && (
            <div className="cat-tiles">
              {categories.map((c) => {
                const inCat = items.filter((i) => i.category_id === c.id);
                return (
                  <button key={c.id} className="cat-tile" onClick={() => toggle('cat', c.id)} data-testid={`cat-tile-${c.id}`}>
                    {inCat[0] && <Thumb item={inCat[0]} alt="" />}
                    <span>{c.name}<small>{inCat.length} piece{inCat.length === 1 ? '' : 's'}</small></span>
                  </button>
                );
              })}
            </div>
          )}
          <div>
            <h3>Colour</h3>
            <div className="chips">
              {usedColours.map((c) => (
                <button key={c.name} className="chip" aria-pressed={filters.colors.includes(c.name)} onClick={() => toggle('color', c.name)} data-testid={`color-chip-${c.name}`}>
                  <Swatch name={c.name} />{prettyColour(c.name)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3>Occasion</h3>
            <div className="chips">
              {DEFAULT_OCCASIONS.map((o) => <button key={o} className="chip" aria-pressed={filters.occasions.includes(o)} onClick={() => toggle('occ', o)} data-testid={`occ-chip-${slug(o)}`}>{o}</button>)}
            </div>
          </div>
          <div>
            <h3>Season</h3>
            <div className="chips">
              {SEASONS.map((o) => <button key={o} className="chip" aria-pressed={filters.seasons.includes(o)} onClick={() => toggle('season', o)} data-testid={`season-chip-${slug(o)}`}>{o}</button>)}
            </div>
          </div>
          <div>
            <h3>Fabric</h3>
            <div className="chips">
              {FABRICS.map((o) => <button key={o} className="chip" aria-pressed={filters.fabrics.includes(o)} onClick={() => toggle('fabric', o)} data-testid={`fabric-chip-${slug(o)}`}>{o}</button>)}
            </div>
          </div>
          {showFilters && <button className="chip" aria-pressed={!!filters.favorite} onClick={() => setParams({ fav: filters.favorite ? [] : ['1'] })} data-testid="fav-chip">♥ Favourites only</button>}
        </div>
      )}

      <p className="mute" role="status" data-testid="v-result-count">{any ? `${results.length} match${results.length === 1 ? '' : 'es'}` : `All ${items.length} pieces`}</p>

      {results.length === 0 ? (
        items.length === 0
          ? <Empty title="Your closet is empty" action={<a className="btn primary" href="#/add" data-testid="closet-empty-add">Add your first photos</a>}>Snap a few pieces and they will appear here.</Empty>
          : <Empty title="Nothing matches" action={<button className="btn" onClick={() => navigate('/closet', { replace: true })} data-testid="closet-empty-clear">Clear filters</button>}>Try removing a filter, or search with different words.{s.data.items.some((i) => i.status === 'trashed') ? ' Deleted pieces are in Trash.' : ''}</Empty>
      ) : view === 'grid' ? (
        <div className="grid">{results.map((i) => <ItemTile key={i.id} item={i} href={`#/piece/${i.id}`} testid={`tile-${i.id}`} />)}</div>
      ) : cur && (
        <div className="onebyone">
          <a href={`#/piece/${cur.id}`} data-testid="one-open"><Thumb item={cur} full alt={cur.name} /></a>
          <div className="row between">
            <button className="btn" disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))} data-testid="one-prev"><Icon name="back" /> Previous</button>
            <span className="mute">{Math.min(idx, results.length - 1) + 1} of {results.length}</span>
            <button className="btn" disabled={idx >= results.length - 1} onClick={() => setIdx((i) => Math.min(results.length - 1, i + 1))} data-testid="one-next">Next <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}><Icon name="back" /></span></button>
          </div>
          <h2>{cur.name}</h2>
          <p className="mute">{cur.details}</p>
        </div>
      )}
    </div>
  );
}
