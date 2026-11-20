# Wardrobe

A mobile-first family wardrobe organiser and outfit planner, built for Indian wear: sarees, separate blouses, kurta sets, dupattas, lehengas and jewellery.
Open it, pick whose wardrobe, and know what to wear in under a minute.

- **Stack:** React 18 + Vite + TypeScript, hand-written CSS, Supabase (Postgres + Storage + Realtime), Vercel.
- **Smart features** (auto-tagging, style check, packing, gap analysis, plain-language search) run **on the device** with a rule engine in `src/lib/smarts/`. There is no AI or paid API. See `AI_LATER.md` to add one later.
- **No login.** Anyone with the link can open it. Data is protected by Trash (30 days), Undo on every delete, and backups.

## Using it

### Add photos
1. Tap **Add** (the round + button).
2. Choose what you are adding (Sarees, Blouses…). Every photo in this batch gets that category.
3. Either **Use camera**: snap as many pieces as you like, then tap **Done**. Or **Pick from gallery** and choose several photos at once.
4. Photos are shrunk on the phone (max 1600 px, plus a 480 px thumbnail). The app then guesses the colours, a name, the occasions and the season.
5. If a photo looks like a piece you already have, it asks before adding it.
6. On **Check new photos**, tap ✓ **Looks right**, or **Edit** to fix the name and colours.

New pieces appear straight away on every phone that has the app open.

### Add a family member
Tap the name at the top (for example "My Wardrobe") and then **Add a family member**. Pick a name, a colour and a picture.
Tap any name in that list to switch wardrobes, or the pencil to rename or recolour it.

### Weddings and big family events (e.g. "Lakshu wedding")
The card at the top of **Home** opens the wedding page:
- **Add events** with one tap (Gaur, Haldi, Mehendi, Welcome lunch, Sangeet, After party, Shaadi, Filler suit…) or **Something else…** for any other function. Dates are optional; add them when they are fixed. Use ▲▼ to change the order.
- Open an event and tap **Add outfit option**. Pick the outfit pieces, then the **Bag** and **Jewellery** tabs. Pick photographed ones or type them in, for example "Gold potli". You can also **Build in Mix & Match** and tap **Add as option**.
- Add as many options as you like, then tap **⭐ Make final choice** on one. The page warns you if the same saree or suit is already your pick for another function.
- **Packing list from final choices** makes a tickable list of every outfit, bag and piece of jewellery you chose.
- After the wedding, tap **Delete this section** to remove the card and its events. Your clothes stay in your wardrobe. Undo is available for a few seconds.
- To plan another one, use **Plan a wedding or big family event** on Home.

### Back up and restore
**☰ More → Backup & restore → Download backup** saves one JSON file with that person's pieces, looks, events, wears and trips.
Photos stay online; the backup keeps their links.
**Choose backup file** adds everything from a backup into the wardrobe you are looking at. It updates matching pieces and never deletes anything.

### Tune the pairing rules
All the Indian-wear knowledge is data in **`src/lib/smarts/pairings.ts`**. You can tune it without touching any logic:

| What | Where in `pairings.ts` |
|---|---|
| How much each colour relationship scores (neutral, complementary, tonal, clash…) | `HARMONY_SCORE` |
| Saree ↔ blouse bonuses (border pick-up, matching body, gold/brocade universal) | `SAREE_BLOUSE_RULES` |
| Fabric weights and good/bad fabric pairs | `FABRIC_WEIGHT`, `FABRIC_PAIRS` |
| How dressy each occasion is, and which words make a piece dressier | `OCCASION_FORMALITY`, `FORMALITY_WORDS` |
| Default occasions per category/colour when auto-tagging | `CATEGORY_DEFAULTS`, `COLOUR_OCCASIONS` |
| Occasion colour hints (mehendi → green/yellow…) and related occasions | `OCCASION_COLOURS`, `RELATED_OCCASIONS` |
| Jewellery and footwear wording, packing extras, verdict sentences | `JEWELLERY_TEXT`, `FOOTWEAR_TEXT`, `PACKING_ESSENTIALS`, `VERDICT_TEMPLATES` |

Colours (name → hex → family → metal tone, plus synonyms used by search) live in **`src/lib/smarts/colors.ts`**, the one source of truth.
Run `npm test` after a change: the golden cases in `tests/smarts.test.ts` make sure classic pairings still score well.

### Redeploy
Every push to the production branch of `Lakshytta/wardrobe` deploys automatically on Vercel (project **wardrobe**).
To redeploy without code changes, open the project in Vercel → Deployments → ⋯ → Redeploy.

## Developing

```bash
npm ci
```

```bash
cp .env.example .env.local   # Supabase URL + publishable key (public values)
```

```bash
npm run dev                  # http://localhost:5173 (add ?demo=1 to use the in-browser demo data)
```

```bash
npm test                     # Vitest: rule engine, colours, k-means, pHash, resize
```

```bash
npx playwright test --trace off   # e2e on the in-browser MemoryAdapter, 390×844 and 1280×800, light and dark
```

### Layout
```
src/lib/smarts/      rule engine (SmartsProvider + RulesProvider), colors.ts, pairings.ts
src/lib/image/       k-means palette, pHash, resize maths, browser compression
src/lib/data/        DataAdapter: SupabaseAdapter (prod, offline queue) and MemoryAdapter (tests/demo)
src/screens/         one file per screen;  src/components/ shared UI
supabase/migrations/ schema, RLS, realtime, storage bucket;  supabase/seed.sql the 31 seed pieces
scripts/             extract-base.mjs (photos from the reference HTML), seed-images.mjs, seed-sql.mjs
e2e/                 Playwright specs; coverage.spec.ts checks every data-testid CTA was exercised
```

### Re-creating the seed photos
```bash
node scripts/extract-base.mjs path/to/my-wardrobe-app.html && npm run seed:images && npm run seed:sql
```
