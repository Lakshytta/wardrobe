import type { Item } from '../types.ts';
import { colour, COLOUR_SYNONYMS } from './colors.ts';
import { OCCASION_COLOURS, RELATED_OCCASIONS } from './pairings.ts';

export interface QueryFilters {
  colors: string[];
  categories: string[];
  occasions: string[];
  fabrics: string[];
  seasons: string[];
  favorite?: boolean;
}

export interface ParsedQuery { filters: QueryFilters; terms: string[]; hintColours: string[]; source: 'rules' }

export const CATEGORY_SYNONYMS: Record<string, string> = {
  saree: 'sarees', sarees: 'sarees', sari: 'sarees', saris: 'sarees', drape: 'sarees',
  blouse: 'blouses', blouses: 'blouses', top: 'blouses', choli: 'blouses',
  kurta: 'suits', kurtas: 'suits', suit: 'suits', suits: 'suits', anarkali: 'suits', sharara: 'suits', salwar: 'suits', 'kurta set': 'suits',
  lehenga: 'lehengas', lehengas: 'lehengas', ghagra: 'lehengas',
  dupatta: 'dupattas', dupattas: 'dupattas', shawl: 'dupattas', shawls: 'dupattas', stole: 'dupattas', chunni: 'dupattas',
  'indo-western': 'indo-western', indowestern: 'indo-western', western: 'indo-western', cape: 'indo-western', 'pre-draped': 'indo-western',
  jewellery: 'jewellery', jewelry: 'jewellery', necklace: 'jewellery', earrings: 'jewellery', jhumka: 'jewellery', jhumkas: 'jewellery', bangles: 'jewellery',
  footwear: 'footwear', shoes: 'footwear', sandals: 'footwear', heels: 'footwear', juttis: 'footwear', jutti: 'footwear', chappals: 'footwear',
  bag: 'bags', bags: 'bags', clutch: 'bags', potli: 'bags', purse: 'bags',
};

export const OCCASION_SYNONYMS: Record<string, string> = {
  mehendi: 'Mehendi', mehndi: 'Mehendi', henna: 'Mehendi',
  haldi: 'Haldi', puja: 'Puja', pooja: 'Puja', temple: 'Puja', diwali: 'Festive', festive: 'Festive', festival: 'Festive', eid: 'Festive', navratri: 'Festive',
  sangeet: 'Sangeet', wedding: 'Wedding', shaadi: 'Wedding', reception: 'Wedding guest', 'wedding guest': 'Wedding guest',
  party: 'Evening/Party', evening: 'Evening/Party', dinner: 'Evening/Party', cocktail: 'Evening/Party',
  office: 'Work', work: 'Work', meeting: 'Work', casual: 'Casual', daily: 'Daily', everyday: 'Daily', home: 'Daily',
  travel: 'Travel', trip: 'Travel', 'day function': 'Day function', lunch: 'Day function', brunch: 'Day function', kitty: 'Day function',
};

const FABRICS = ['silk', 'raw silk', 'cotton', 'georgette', 'organza', 'tissue', 'brocade', 'velvet', 'chanderi', 'net', 'linen', 'chiffon', 'crepe', 'banarasi', 'wool'];
const SEASON_WORDS: Record<string, string> = { summer: 'Summer', winter: 'Winter', monsoon: 'Monsoon', rainy: 'Monsoon' };
const STOP = new Set(['a', 'an', 'the', 'for', 'to', 'with', 'and', 'or', 'in', 'of', 'my', 'me', 'some', 'something', 'wear', 'outfit', 'outfits', 'show', 'find', 'any', 'all', 'that', 'what', 'on', 'at', 'colour', 'color', 'please']);

/** Plain-language search → removable filter chips + leftover fuzzy terms. */
export function parseQuery(text: string): ParsedQuery {
  const f: QueryFilters = { colors: [], categories: [], occasions: [], fabrics: [], seasons: [] };
  let s = ` ${text.toLowerCase().replace(/[^a-z0-9\- ]/g, ' ').replace(/\s+/g, ' ')} `;
  const take = (phrase: string) => {
    const re = new RegExp(`(^| )${phrase.replace(/[-]/g, '\\-')}( |$)`);
    if (re.test(s)) { s = s.replace(re, ' '); return true; }
    return false;
  };
  const add = (arr: string[], v: string) => { if (!arr.includes(v)) arr.push(v); };
  // longest phrases first so "bottle green" beats "green", "wedding guest" beats "wedding"
  const sortKeys = (o: Record<string, string>) => Object.keys(o).sort((a, b) => b.length - a.length);
  if (take('favourite') || take('favourites') || take('favorite') || take('favorites') || take('fav')) f.favorite = true;
  for (const k of sortKeys(OCCASION_SYNONYMS)) while (take(k)) add(f.occasions, OCCASION_SYNONYMS[k]);
  for (const k of sortKeys(CATEGORY_SYNONYMS)) while (take(k)) add(f.categories, CATEGORY_SYNONYMS[k]);
  for (const k of [...FABRICS].sort((a, b) => b.length - a.length)) while (take(k)) add(f.fabrics, k);
  for (const k of sortKeys(SEASON_WORDS)) while (take(k)) add(f.seasons, SEASON_WORDS[k]);
  for (const k of sortKeys(COLOUR_SYNONYMS)) while (take(k)) add(f.colors, COLOUR_SYNONYMS[k]);
  const terms = s.split(' ').filter((w) => w && !STOP.has(w));
  const hintColours = [...new Set(f.occasions.flatMap((o) => OCCASION_COLOURS[o] ?? []))];
  return { filters: f, terms, hintColours, source: 'rules' };
}

function lev(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

/** Fuzzy word match: substring, or ≤1 edit for words of 4+ letters (≤2 for 7+). */
export function fuzzyHas(haystack: string, term: string): boolean {
  if (haystack.includes(term)) return true;
  if (term.length < 4) return false;
  const tol = term.length >= 7 ? 2 : 1;
  return haystack.split(/[^a-z0-9]+/).some((w) => w.length >= 3 && lev(w, term) <= tol);
}

/** Colour filter: exact colour, or the whole family when the query is a family word (e.g. "red" matches maroon). */
export function colourMatches(item: Item, q: string): boolean {
  const cols = [item.primary_color, ...(item.accent_colors ?? [])];
  if (cols.includes(q)) return true;
  const qc = colour(q);
  const familyWords = ['red', 'green', 'blue', 'pink', 'purple', 'yellow', 'orange', 'teal'];
  if (qc && familyWords.includes(q)) return colour(item.primary_color)?.family === qc.family;
  return false;
}

export function occasionMatches(item: Item, occ: string): boolean {
  const occs = item.occasions ?? [];
  if (occs.includes(occ)) return true;
  return (RELATED_OCCASIONS[occ] ?? []).some((r) => occs.includes(r));
}

/** Apply a parsed query (all filter groups AND, values within a group OR) and rank. */
export function searchItems(items: Item[], pq: { filters: QueryFilters; terms: string[]; hintColours?: string[] }): Item[] {
  const f = pq.filters;
  const scored: { it: Item; s: number }[] = [];
  for (const it of items) {
    if (f.favorite && !it.favorite) continue;
    if (f.categories.length && !f.categories.includes(it.category_id)) continue;
    if (f.colors.length && !f.colors.some((c) => colourMatches(it, c))) continue;
    if (f.occasions.length && !f.occasions.some((o) => occasionMatches(it, o))) continue;
    if (f.fabrics.length && !f.fabrics.some((x) => (it.fabric || '').toLowerCase().includes(x))) continue;
    if (f.seasons.length && !f.seasons.some((x) => it.season === x || it.season === 'All-season')) continue;
    const hay = `${it.name} ${it.details} ${(it.tags ?? []).join(' ')} ${it.fabric} ${it.work} ${it.primary_color} ${(it.accent_colors ?? []).join(' ')}`.toLowerCase();
    if (!pq.terms.every((t) => fuzzyHas(hay, t))) continue;
    let s = 0;
    if (f.colors.includes(it.primary_color)) s += 3;
    if (f.occasions.some((o) => (it.occasions ?? []).includes(o))) s += 2;
    if ((pq.hintColours ?? []).includes(it.primary_color)) s += 1.5;
    for (const t of pq.terms) if (it.name.toLowerCase().includes(t)) s += 1;
    if (it.favorite) s += 0.2;
    scored.push({ it, s });
  }
  return scored.sort((a, b) => b.s - a.s).map((x) => x.it);
}

export function isEmptyQuery(pq: ParsedQuery): boolean {
  const f = pq.filters;
  return !pq.terms.length && !f.colors.length && !f.categories.length && !f.occasions.length && !f.fabrics.length && !f.seasons.length && !f.favorite;
}
