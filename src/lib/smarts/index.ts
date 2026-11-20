// SmartsProvider: the ONE interface every "smart" feature in the UI goes through.
// RulesProvider is the on-device implementation. A future AiProvider implements the same
// interface (see AI_LATER.md) and the UI does not change.
import type { Trip, Verdict, WEvent, Wear } from '../types.ts';
import type { PixelData } from '../image/palette.ts';
import { tagPhoto, type TagContext, type TagResult } from './tagPhoto.ts';
import { styleCheck } from './styleCheck.ts';
import { packTrip, type PackResult } from './packTrip.ts';
import { findGaps, type Gap } from './findGaps.ts';
import { parseQuery, type ParsedQuery } from './parseQuery.ts';
import type { Wardrobe } from './wardrobe.ts';

export type { TagResult, PackResult, Gap, ParsedQuery, Wardrobe };

export interface SmartsProvider {
  readonly name: 'rules' | 'ai';
  tagPhoto(img: PixelData, ctx: TagContext): Promise<TagResult>;
  styleCheck(itemIds: string[], occasion: string, wardrobe: Wardrobe, opts?: { month?: number }): Promise<Verdict>;
  packTrip(trip: Pick<Trip, 'start_date' | 'end_date' | 'name'>, events: WEvent[], wardrobe: Wardrobe): Promise<PackResult>;
  findGaps(wardrobe: Wardrobe, wears: Wear[]): Promise<Gap[]>;
  parseQuery(text: string): Promise<ParsedQuery>;
}

export class RulesProvider implements SmartsProvider {
  readonly name = 'rules' as const;
  async tagPhoto(img: PixelData, ctx: TagContext) { return tagPhoto(img, ctx); }
  async styleCheck(itemIds: string[], occasion: string, wardrobe: Wardrobe, opts?: { month?: number }) { return styleCheck(itemIds, occasion, wardrobe, opts); }
  async packTrip(trip: Pick<Trip, 'start_date' | 'end_date' | 'name'>, events: WEvent[], wardrobe: Wardrobe) { return packTrip(trip, events, wardrobe); }
  async findGaps(wardrobe: Wardrobe, wears: Wear[]) { return findGaps(wardrobe, wears); }
  async parseQuery(text: string) { return parseQuery(text); }
}

let provider: SmartsProvider = new RulesProvider();
export function smarts(): SmartsProvider { return provider; }
export function setSmartsProvider(p: SmartsProvider) { provider = p; }
