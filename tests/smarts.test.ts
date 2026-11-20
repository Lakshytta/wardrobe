import { describe, expect, it } from 'vitest';
import { SEED_ITEMS, DEFAULT_CATEGORIES, seedItemId, blankItem } from '../src/lib/data/seed.ts';
import { colour, nameColour, COLOURS, hexToRgb, rgbToHex, deltaE } from '../src/lib/smarts/colors.ts';
import { relationship, colourCheck } from '../src/lib/smarts/harmony.ts';
import { styleCheck, validateSwaps, applySwap } from '../src/lib/smarts/styleCheck.ts';
import { parseQuery, searchItems, fuzzyHas } from '../src/lib/smarts/parseQuery.ts';
import { repeatGuard } from '../src/lib/smarts/repeatGuard.ts';
import { packTrip, dayList } from '../src/lib/smarts/packTrip.ts';
import { findGaps, blouseSuggestions } from '../src/lib/smarts/findGaps.ts';
import { shuffleLook } from '../src/lib/smarts/shuffle.ts';
import { tagPhoto } from '../src/lib/smarts/tagPhoto.ts';
import { rng } from '../src/lib/image/palette.ts';
import { RulesProvider } from '../src/lib/smarts/index.ts';
import type { WEvent, Wear } from '../src/lib/types.ts';

const W = { items: SEED_ITEMS, categories: DEFAULT_CATEGORIES };
const id = (ref: string) => seedItemId(ref);

describe('colour table', () => {
  it('has unique names and valid hexes, one source of truth', () => {
    const names = COLOURS.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    for (const c of COLOURS) expect(c.hex).toMatch(/^#[0-9A-F]{6}$/i);
  });
  it('uses the verified swatches from the brief', () => {
    expect(colour('rust')!.hex).toBe('#B5532B');
    expect(colour('maroon')!.hex).toBe('#7A1F2B');
    expect(colour('magenta')!.hex).toBe('#C2187A');
    expect(colour('turquoise')!.hex).toBe('#1FB5B0');
  });
  it('round-trips hex', () => {
    expect(rgbToHex(hexToRgb('#0b6b62'))).toBe('#0B6B62');
    expect(deltaE([0, 0, 0], [0, 0, 0])).toBe(0);
  });
  it('names colours perceptually', () => {
    expect(nameColour('#047F49').name).toBe('green');
    expect(nameColour('#1A2A55').name).toBe('navy');
    expect(nameColour('#7B1E2C').name).toBe('maroon');
    expect(nameColour('#F1EBDC').name).toBe('ivory');
    expect(nameColour('#C9A04A').name).toBe('gold');
    expect(nameColour('#B5532B').name).toBe('rust');
    expect(nameColour('#D11F80').name).toBe('magenta');
  });
  it('every seed colour is in the table', () => {
    for (const it of SEED_ITEMS) for (const c of [it.primary_color, ...it.accent_colors]) expect(colour(c), c).toBeTruthy();
  });
});

describe('harmony', () => {
  it('classifies relationships', () => {
    expect(relationship('green', 'gold')).toBe('neutral');
    expect(relationship('navy', 'navy')).toBe('tonal');
    expect(relationship('red', 'maroon')).toBe('tonal');
    expect(relationship('green', 'magenta')).toBe('complementary');
    expect(relationship('yellow', 'orange')).toBe('analogous');
    expect(relationship('multi', 'red')).toBe('multi');
  });
  it('colour check lists every pair', () => {
    const r = colourCheck(['green', 'gold', 'magenta']);
    expect(r).toHaveLength(3);
    expect(r.every((p) => typeof p.ok === 'boolean')).toBe(true);
  });
});

describe('style check (golden cases from the seed catalogue)', () => {
  it('bottle-green Parsi gara + ivory/gold brocade blouse scores ≥ 8', () => {
    const v = styleCheck([id('p4831'), id('p4847')], 'Wedding', W);
    expect(v.score).toBeGreaterThanOrEqual(8);
    expect(v.source).toBe('rules');
    expect(v.verdict.toLowerCase()).toContain('green');
    expect(v.verdict.toLowerCase()).toContain('gold');
  });
  it('navy Parsi gara + magenta blouse scores lower than + navy brocade-yoke blouse', () => {
    const magenta = styleCheck([id('p4830'), id('p4843')], 'Festive', W).score;
    const navy = styleCheck([id('p4830'), id('p4849')], 'Festive', W).score;
    expect(magenta).toBeLessThan(navy);
  });
  it('rust Kalamkari + gold tissue blouse is a strong pairing', () => {
    expect(styleCheck([id('p4841'), id('p4850')], 'Festive', W).score).toBeGreaterThanOrEqual(8);
  });
  it('is deterministic', () => {
    const a = styleCheck([id('p4830'), id('p4843')], 'Festive', W);
    const b = styleCheck([id('p4830'), id('p4843')], 'Festive', W);
    expect(a).toEqual(b);
  });
  it('flags under-dressing a casual print for a wedding', () => {
    const v = styleCheck([id('p4835')], 'Wedding', W);
    expect(v.occasion_fit.toLowerCase()).toContain('simple');
  });
  it('warns about velvet in summer', () => {
    const v = styleCheck([id('p4822')], 'Wedding', W, { month: 5 });
    expect(v.change.join(' ').toLowerCase()).toContain('warm');
  });
  it('gives jewellery and footwear tips citing metal tones', () => {
    const v = styleCheck([id('p4831'), id('p4847')], 'Wedding', W);
    expect(v.jewellery.length).toBeGreaterThan(0);
    expect(v.jewellery.join(' ').toLowerCase()).toMatch(/gold|pearl|kundan/);
    expect(v.footwear.length).toBeGreaterThan(0);
  });
  it('offers a blouse when a saree is checked alone', () => {
    const v = styleCheck([id('p4841')], 'Festive', W);
    expect(v.swaps.length).toBeGreaterThan(0);
    expect(v.swaps[0].replace_id).toBeNull();
    expect(SEED_ITEMS.find((i) => i.id === v.swaps[0].with_id)!.category_id).toBe('blouses');
  });
});

describe('swaps only reference the wardrobe', () => {
  it('every swap with_id is in the wardrobe and every replace_id in the look', () => {
    for (const s of SEED_ITEMS.filter((i) => i.category_id === 'sarees')) {
      for (const b of SEED_ITEMS.filter((i) => i.category_id === 'blouses')) {
        const ids = [s.id, b.id];
        const v = styleCheck(ids, 'Festive', W);
        for (const sw of v.swaps) {
          expect(SEED_ITEMS.some((i) => i.id === sw.with_id)).toBe(true);
          expect(sw.replace_id === null || ids.includes(sw.replace_id)).toBe(true);
        }
      }
    }
  });
  it('validateSwaps strips invented ids', () => {
    const out = validateSwaps([{ replace_id: id('p4843'), with_id: 'made-up' }, { replace_id: 'x', with_id: id('p4847') }, { replace_id: id('p4843'), with_id: id('p4847') }], [id('p4830'), id('p4843')], W);
    expect(out).toEqual([{ replace_id: id('p4843'), with_id: id('p4847') }]);
  });
  it('a swap improves the score when applied', () => {
    const ids = [id('p4830'), id('p4843')];
    const v = styleCheck(ids, 'Festive', W);
    expect(v.swaps.length).toBeGreaterThan(0);
    const after = styleCheck(applySwap(ids, v.swaps[0]), 'Festive', W);
    expect(after.score).toBeGreaterThan(v.score);
  });
  it('ignores pieces that are away at the tailor', () => {
    const items = SEED_ITEMS.map((i) => (i.id === id('p4849') ? { ...i, care_status: 'tailor' as const } : i));
    const v = styleCheck([id('p4830'), id('p4843')], 'Festive', { items, categories: DEFAULT_CATEGORIES });
    expect(v.swaps.some((s) => s.with_id === id('p4849'))).toBe(false);
  });
});

describe('search parser', () => {
  it('green for mehendi → colour + occasion chips', () => {
    const q = parseQuery('green for mehendi');
    expect(q.filters.colors).toEqual(['green']);
    expect(q.filters.occasions).toEqual(['Mehendi']);
    expect(q.terms).toEqual([]);
    const res = searchItems(SEED_ITEMS, q);
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((r) => r.primary_color === 'green' || r.accent_colors.includes('green') || r.primary_color === 'olive')).toBe(true);
  });
  it('navy blouse', () => {
    const q = parseQuery('navy blouse');
    expect(q.filters).toMatchObject({ colors: ['navy'], categories: ['blouses'] });
    expect(searchItems(SEED_ITEMS, q).map((i) => i.name)).toEqual(['Navy brocade-yoke blouse']);
  });
  it('synonyms: emerald → green, kurta → suits, dupatta → dupattas, office → Work', () => {
    expect(parseQuery('emerald').filters.colors).toEqual(['green']);
    expect(parseQuery('kurta').filters.categories).toEqual(['suits']);
    expect(parseQuery('dupatta').filters.categories).toEqual(['dupattas']);
    expect(parseQuery('office').filters.occasions).toEqual(['Work']);
    expect(parseQuery('wine saree').filters.colors).toEqual(['maroon']);
    expect(parseQuery('bottle green saree').filters.colors).toEqual(['green']);
  });
  it('puja hints ivory/red/yellow', () => {
    expect(parseQuery('puja').hintColours).toEqual(expect.arrayContaining(['ivory', 'red', 'yellow']));
  });
  it('red family includes maroon', () => {
    const res = searchItems(SEED_ITEMS, parseQuery('red kurta'));
    expect(res.some((r) => r.primary_color === 'maroon')).toBe(true);
  });
  it('fuzzy matches typos', () => {
    expect(fuzzyHas('parsi gara embroidery', 'embroidry')).toBe(true);
    expect(searchItems(SEED_ITEMS, parseQuery('chikenkari')).length).toBeGreaterThan(0);
    expect(fuzzyHas('silk', 'xyz')).toBe(false);
  });
});

describe('repeat guard', () => {
  const ev = (o: Partial<WEvent>): WEvent => ({ id: 'e', profile_id: '', title: 'Diwali', date: '2026-11-01', occasion: 'Festive', people: [], look_id: null, notes: '', worn: true, ...o });
  const wear = (o: Partial<Wear>): Wear => ({ id: 'w', profile_id: '', date: '2026-11-01', item_ids: [], look_id: null, event_id: null, note: '', ...o });
  it('warns on same people', () => {
    const events = [ev({ id: 'e1', people: ['Sharma family'], date: '2025-01-01' })];
    const wears = [wear({ event_id: 'e1', date: '2025-01-01', item_ids: [id('p4831')] })];
    const r = repeatGuard([id('p4831'), id('p4847')], '2026-12-01', ['sharma family'], wears, events, W);
    expect(r[0].kind).toBe('people');
  });
  it('warns within 90 days, not after', () => {
    const wears = [wear({ date: '2026-10-01', item_ids: [id('p4831')] })];
    expect(repeatGuard([id('p4831')], '2026-12-01', [], wears, [], W)).toHaveLength(1);
    expect(repeatGuard([id('p4831')], '2027-03-01', [], wears, [], W)).toHaveLength(0);
    expect(repeatGuard([id('p4831')], '2026-12-01', [], wears, [], W, { windowDays: 30 })).toHaveLength(0);
  });
  it('only watches the main piece, not the blouse', () => {
    const wears = [wear({ date: '2026-11-15', item_ids: [id('p4847')] })];
    expect(repeatGuard([id('p4831'), id('p4847')], '2026-12-01', [], wears, [], W)).toHaveLength(0);
  });
});

describe('packing', () => {
  const events: WEvent[] = [
    { id: 'a', profile_id: '', title: 'Mehendi', date: '2026-12-10', occasion: 'Mehendi', people: [], look_id: null, notes: '', worn: false },
    { id: 'b', profile_id: '', title: 'Sangeet', date: '2026-12-11', occasion: 'Sangeet', people: [], look_id: null, notes: '', worn: false },
    { id: 'c', profile_id: '', title: 'Wedding', date: '2026-12-12', occasion: 'Wedding', people: [], look_id: null, notes: '', worn: false },
    { id: 'd', profile_id: '', title: 'Reception', date: '2026-12-12', occasion: 'Wedding guest', people: [], look_id: null, notes: '', worn: false },
  ];
  it('covers every event with a 7+ outfit using few pieces', () => {
    const r = packTrip({ name: 'Jaipur', start_date: '2026-12-10', end_date: '2026-12-12' }, events, W);
    expect(r.outfits).toHaveLength(4);
    for (const o of r.outfits) expect(o.item_ids.length).toBeGreaterThan(0);
    expect(r.items.length).toBeLessThanOrEqual(8);
    expect(r.why).toMatch(/outfit/);
    for (const o of r.outfits) for (const i of o.item_ids) expect(r.items).toContain(i);
  });
  it('maximises mix-and-match: blouses are reused across sarees', () => {
    const sareeOnly = { items: SEED_ITEMS.filter((i) => ['sarees', 'blouses'].includes(i.category_id)), categories: DEFAULT_CATEGORIES };
    const r = packTrip({ name: 'x', start_date: '2026-12-10', end_date: '2026-12-12' }, events, sareeOnly);
    const sarees = r.items.filter((x) => SEED_ITEMS.find((i) => i.id === x)!.category_id === 'sarees').length;
    const blouses = r.items.filter((x) => SEED_ITEMS.find((i) => i.id === x)!.category_id === 'blouses').length;
    expect(sarees + blouses).toBeLessThan(events.length * 2);
  });
  it('builds a day-by-day list without events', () => {
    expect(dayList('2026-12-01', '2026-12-03')).toEqual(['2026-12-01', '2026-12-02', '2026-12-03']);
    const r = packTrip({ name: 'x', start_date: '2026-12-01', end_date: '2026-12-03' }, [], W);
    expect(r.outfits).toHaveLength(3);
  });
});

describe('gaps', () => {
  it('finds the missing neutral dupatta and missing jewellery', () => {
    const g = findGaps(W, []);
    const titles = g.map((x) => x.title);
    expect(titles).toContain('No ivory or gold dupatta for festive suits');
    expect(titles).toContain('No jewellery added yet');
    expect(g.every((x) => x.source === 'rules')).toBe(true);
  });
  it('flags a saree with no 7+ blouse and suggests colours', () => {
    const items = [SEED_ITEMS.find((i) => i.id === id('p4841'))!, blankItem({ id: 'b1', category_id: 'blouses', primary_color: 'purple', fabric: 'Cotton' })];
    const g = findGaps({ items, categories: DEFAULT_CATEGORIES }, []);
    const gap = g.find((x) => x.title.includes('rust kalamkari'))!;
    expect(gap).toBeTruthy();
    expect(gap.suggestion).toMatch(/raw-silk blouse would pair well/);
    expect(blouseSuggestions(items[0], { items }).length).toBe(2);
  });
  it('lists pieces not worn for 6+ months', () => {
    const wears: Wear[] = [{ id: 'w', profile_id: '', date: '2026-01-01', item_ids: [id('p4831')], look_id: null, event_id: null, note: '' }];
    const g = findGaps(W, wears, { today: '2026-11-20' });
    expect(g.some((x) => /not worn in 6\+ months/.test(x.title))).toBe(true);
  });
});

describe('shuffle', () => {
  it('returns a main piece fit for the occasion, deterministic with a seeded rand', () => {
    const a = shuffleLook('Wedding', W, rng(1));
    const b = shuffleLook('Wedding', W, rng(1));
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
  });
});

describe('tagPhoto', () => {
  function solid(hexes: string[], w = 60, h = 60) {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const [r, g, b] = hexToRgb(hexes[Math.floor((x / w) * hexes.length)]);
      const i = (y * w + x) * 4; data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
    return { data, width: w, height: h };
  }
  it('names a green saree on a white floor', () => {
    const r = tagPhoto(solid(['#FFFFFF', '#1E7A4A', '#1E7A4A', '#FFFFFF']), { category: 'sarees' });
    expect(r.primary_color).toBe('green');
    expect(r.name).toBe('Green saree');
    expect(r.occasions).toContain('Mehendi');
    expect(r.palette_hex[0]).toMatch(/^#/);
  });
  it('picks up a gold accent', () => {
    const r = tagPhoto(solid(['#7A1F2B', '#7A1F2B', '#C9A24B']), { category: 'blouses' });
    expect(r.primary_color).toBe('maroon');
    expect(r.accent_colors).toContain('gold');
    expect(r.name).toBe('Maroon blouse');
  });
});

describe('RulesProvider', () => {
  it('implements every method and tags results as rules', async () => {
    const p = new RulesProvider();
    expect((await p.parseQuery('red saree')).source).toBe('rules');
    expect((await p.styleCheck([id('p4831')], 'Festive', W)).source).toBe('rules');
    expect((await p.packTrip({ name: '', start_date: '2026-12-01', end_date: '2026-12-01' }, [], W)).source).toBe('rules');
    expect((await p.findGaps(W, []))[0].source).toBe('rules');
  });
});
