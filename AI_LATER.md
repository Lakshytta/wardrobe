# Adding an AI provider later

Today every "smart" feature goes through one interface, `SmartsProvider` (`src/lib/smarts/index.ts`), with an on-device `RulesProvider`.
Every result carries `source: "rules"`, and the UI already shows a badge for it ("On-device tips" vs "AI tips").
Adding Claude means adding a second implementation. **No screen changes are needed.**

Paste the prompt below into a new Claude Code session with this repository, the Supabase connector and the Vercel connector.

---

```text
Add an AiProvider to the Wardrobe app (this repo) that uses Claude, without changing any screen.

Context
- src/lib/smarts/index.ts defines:
    interface SmartsProvider {
      readonly name: 'rules' | 'ai';
      tagPhoto(img: PixelData, ctx: { category: string }): Promise<TagResult>;
      styleCheck(itemIds: string[], occasion: string, wardrobe: Wardrobe, opts?: { month?: number }): Promise<Verdict>;
      packTrip(trip, events: WEvent[], wardrobe: Wardrobe): Promise<PackResult>;
      findGaps(wardrobe: Wardrobe, wears: Wear[]): Promise<Gap[]>;
      parseQuery(text: string): Promise<ParsedQuery>;
    }
  plus RulesProvider, smarts() and setSmartsProvider(p). All UI calls go through smarts().
- Result types: src/lib/types.ts (Verdict) and src/lib/smarts/{tagPhoto,packTrip,findGaps,parseQuery}.ts.
  Every result has `source`; AI results must set source: "ai".
- Pairing knowledge (use it in the system prompt so the AI agrees with the rules): src/lib/smarts/pairings.ts and colors.ts.

Build
1. Server: Vercel functions in /api (Node runtime), one per method: /api/smarts/style-check, /tag-photo, /pack-trip, /find-gaps, /parse-query.
   - Use the official @anthropic-ai/sdk. Read ANTHROPIC_API_KEY from a Vercel env var (Production + Preview, type "sensitive"). Never ship it to the client.
   - Use the current most capable Claude model id (check the Anthropic docs/skill). Use structured JSON output matching the TS types exactly, with tool use / JSON schema.
   - style-check: send ONLY the ids, names, colours, fabric, work, occasions of the look AND of the candidate wardrobe pieces.
     Validate the response server-side: every swaps[].with_id must be in the wardrobe ids sent, and every replace_id in the look.
     Drop invalid swaps (reuse validateSwaps from src/lib/smarts/styleCheck.ts).
   - tag-photo: accept the 480px thumbnail (≤ 300 KB, image/webp|jpeg) as base64; return name/primary_color/accent_colors/occasions/season.
     primary_color and accent_colors MUST be names from COLOURS in colors.ts (map anything else with nameColour()). palette_hex still comes from the on-device k-means.
2. Rate limits in Supabase (new migration supabase/migrations/<ts>_ai_limits.sql):
   table ai_usage(ip_hash text, day date, calls int, primary key(ip_hash, day)) with RLS enabled and NO anon policies
   (only the service role touches it). Allow ≤ 30 calls per IP per day and ≤ 500 calls per day in total.
   The functions use SUPABASE_SERVICE_ROLE_KEY (Vercel env, sensitive) and hash the IP with SHA-256 plus a salt env var.
   Over the limit → HTTP 429.
3. Client: src/lib/smarts/ai.ts with `class AiProvider implements SmartsProvider { name = 'ai' }` that POSTs to /api/smarts/*.
   Wrap it so that ANY error (network, 4xx/5xx, 429, timeout > 8 s, invalid JSON, schema mismatch) falls back to RulesProvider
   for that call. Export `FallbackProvider(ai, rules)`.
4. Turn it on in src/main.tsx: setSmartsProvider(new FallbackProvider(new AiProvider(), new RulesProvider())) only when
   import.meta.env.VITE_AI_ENABLED === '1'. If the key is missing on the server, the functions return 503 and the client falls back silently.
5. vercel.json CSP: connect-src already allows 'self', so /api works. Do not add other origins.
6. Tests:
   - Vitest: FallbackProvider uses the rules result on thrown errors, 429 and invalid shapes; swap validation strips unknown ids.
   - Playwright: route /api/smarts/** to return a fixed AI verdict (source "ai") and assert the "AI tips" badge;
     route it to 500 and assert the on-device verdict still shows.
7. Document the env vars in README.md and the new decisions in DECISIONS.md. Do not change any screen component.

Files to touch: api/smarts/*.ts (new), src/lib/smarts/ai.ts (new), src/main.tsx (one line), supabase/migrations/*_ai_limits.sql (new),
package.json (@anthropic-ai/sdk), tests/ai.test.ts (new), e2e/ai.spec.ts (new), README.md, DECISIONS.md.
```
