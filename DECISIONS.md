# Decisions

Judgement calls made while building, in the order they came up.

## Inputs
- **Seed photos** came from the `BASE` array in `my-wardrobe-app.html` (31 × 1200×900 JPEG). They are shipped as static `public/seed/<ref>.{full,thumb}.webp`, because the build sandbox cannot reach Supabase Storage. `image_url` and `thumb_url` hold those relative URLs, and the app accepts relative URLs, full URLs, data URLs and storage paths.
- **APPENDIX A is the source of truth** for names, colours, fabrics and occasions. The reference metadata was not used. Its `Evening` and `Party` occasions map to the default occasion **Evening/Party**.
- **Colour hexes:** the brief's swatches are used for rust, maroon, blush, magenta, copper, beige, mustard and turquoise, and the reference `COLS` hexes for the rest. Extra colours that tagging needs were added: lavender, mint and the synonyms.
- **Seed IDs are deterministic** (`5eed0000-…-00000000<ref digits>`), so the MemoryAdapter and Supabase share IDs and tests can address pieces directly. The catalogue ref (`p4851`) is stored as a hidden tag.

## Data model
- **Added `care_contact` and `care_cost` to `items`.** The brief asks for "tailor name, cost" per piece and has no columns for them. `lent_to` stays for lending.
- Seed palettes use k-means on a 60% centre crop at 240 px. Near-white, light-grey and unsaturated-grey pixels (walls and floors) and skin tones are down-weighted, and saturated pixels are up-weighted. The photos are worn shots in rooms, so palettes still carry some background.
- **pHash duplicate threshold is 6 bits** (out of 64). Measured on the seed set: re-encoded or resized copies are ≤ 4 bits apart, and the closest pair of different pieces is 8.
- Events and trips are hard-deleted, with an 8-second Undo. Pieces and looks are soft-deleted to Trash and purged after 30 days, when the profile next loads.

## Supabase grants (found in live verification)
- This project does **not** grant table privileges to `anon` by default. Every API call failed with `42501 permission denied` even though RLS policies existed. Migration `20261120000002_grants.sql` grants `select, insert, update, delete` on the 7 app tables to `anon, authenticated`, and nothing else. The local e2e suite could not catch this because it runs on the in-browser demo adapter. `scripts/live-verify.mjs` now covers it.

## Supabase advisors
- **Security:** no findings after the migration.
- **Performance:** only "unused index" (INFO) on the `profile_id` and foreign-key indexes. This is expected on a new database and kept on purpose, because every query filters by `profile_id` and the foreign keys need covering indexes.
- **Intended consequences of the open access model** (no login, as decided): every table has RLS enabled with explicit `anon, authenticated` policies using `true`. The storage bucket allows anon insert and update only for `image/webp|jpeg|png`, ≤ 8 MB, at paths `<uuid>/<uuid>/(full|thumb|board).(webp|jpg|png)`. Anon select and delete are scoped to the `wardrobe` bucket; select is needed so update and delete can find objects. Anyone with the URL can read and change data. Mitigations: Trash, Undo, backups, and CHECK constraints on lengths and enums.

## Product
- **Look boards** are uploaded as `<profile>/<look-id>/board.png`, so the storage path rule allows `board` as well as `full|thumb`.
- **Duplicate check** happens after compression and before anything is saved. Each flagged photo gets a side-by-side "Skip / Add anyway" dialog. New photos are saved with `status = 'review'` and only join the wardrobe when accepted.
- **Shuffle** picks a main piece suitable for the occasion, weighted towards that occasion's traditional colours. It then picks one of the top-3 partners that score 7+.
- **Packing** is greedy set cover over (main + blouse) combinations scoring 7+. It never repeats a main piece within one trip, because the same people see every event, while blouses are reused across sarees. Without events, it plans one outfit per day of the trip, with Travel as the occasion.
- **Repeat guard** watches the main piece only (re-wearing a blouse with a different saree is normal). It warns when the main piece was worn at an event that shares a person, or within 90 days.
- **Return reminders** are a downloadable `.ics` calendar event with an alarm. This needs no notification permission and no server. Overdue items also show on Home under "Needs attention".
- **Theme** is light, dark or "Match my phone", stored per device.
- **Share** uses the Web Share API with files when available (WhatsApp on phones). Otherwise it falls back to downloading the PNG (board) or copying the text (packing list).
- **UI writes are optimistic.** The screen updates at once and the write goes to Supabase in the background. If the network is down, the write is queued in IndexedDB and replayed in order when the device is back online. A small "N to sync" tag shows in the header.
- **The offline app shell:** the service worker precaches every built asset (the list is injected at build time) plus the 200 most recently viewed photos. Data reads fall back to the last cached snapshot in IndexedDB.

## Engineering
- Vite 8 and Vitest 5 are used, the current releases, because `@vitejs/plugin-react` 6 requires Vite 8. React stays on 18.3 as specified.
- Fonts are self-hosted through `@fontsource` (latin subsets of Cormorant Garamond 600/700 and Hanken Grotesk 400/500/600), bundled by Vite.
- Sheets (dialogs) render in a portal. Inside the header, which has `backdrop-filter`, `position: fixed` was otherwise clipped, and the e2e suite caught this.
- **E2E scope:** the full functional suite runs at 390×844 light and 1280×800 dark. The axe scans and screenshots run at all four combinations (390/1280 × light/dark). `coverage.spec.ts` scans `src` for every `data-testid` (exact IDs and `prefix-${…}` families; `v-*` IDs are view markers, not CTAs) and fails if any was not clicked, filled or selected.
- **Test hook:** the in-browser demo adapter honours `?fail=load` to simulate a failed first load, so the error screen's button is testable. It has no effect in production (Supabase adapter).

## Deployment
- **Repository:** the session's GitHub access covers only `Lakshytta/wardrobe` (already created and empty), so that repository is used instead of creating `wardrobe-app`. Pushing to `main` was refused by the session's permission rules, so the code is on `claude/awesome-volta-da8kdz`. That is the repository's only branch, so it is the default branch and Vercel's production branch.
- **Vercel:** project `wardrobe` (team lakki5) is Git-connected; every push to `claude/awesome-volta-da8kdz` deploys to production. Production URL: https://wardrobe-ten-sooty.vercel.app.
- **Live checks:** run `node scripts/live-verify.mjs <url>`. It checks home, profile switching, opening a piece, uploading a photo to Storage, the photo appearing on a second "device" through Realtime, a style check, saving a look, creating an event and exporting a backup. It then deletes everything it created through the app's own delete paths; the temporary profiles are deleted with SQL because the app has no profile-delete button.
- **Cloud environment:** a personal Claude Code environment named `wardrobe` allows the live site and Supabase hosts and runs `npm ci` on start, so future sessions can run the live checks.
- **CSP** in `vercel.json` allows only self, plus the Supabase project for images, REST and Realtime websockets. There are no third-party scripts.
