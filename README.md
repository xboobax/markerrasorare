# DiviSorare — Arcade Planner (Football & NBA)

This is an updated version of the uploaded Next.js 14 repository. Nothing is deployed automatically.

## Implemented
- Football: five positions GK / DEF / MID / FWD / FLEX (FLEX is a field player, never a second GK).
- NBA: five arbitrary positions with a strict **16.0-star cap**, including half-stars.
- Interactive player search and filtering, card ownership toggle, manually entered NBA stars, optional card bonus, score targets, top-3 lineup suggestions.
- Dark, responsive dashboard. Manual card data are stored locally in the user's browser.
- Preserve original Sorare GraphQL data adapter, with no browser-exposed API key.
- Technical diagnosis endpoints disabled in production.

## Important limitations
- The available Sorare API player response currently **does not include Arcade card ownership, card edition or current NBA star values**. These must be entered manually. Never treat automatic recommendations from all players as a confirmed collection lineup.
- Football targets **180** and **360** are examples visible on the user's screenshots and may differ for other steps/sets.
- Current point forecast is a rough average of Sorare projection and historical average weighted by estimated play probability. No calibrated hit probability or defensive matchup rating is claimed.
- One card per player is supported. Multiple card editions per player, collection sync, live stars, set eligibility and exact multi-game rules remain future work.
- `getPlayers` and GraphQL schema tiers rely on a working `SORARE_API_KEY` and Sorare's current GraphQL schema. They have not been tested against a live authenticated API in this environment.
- Football optimizer uses bounded beam search and may miss a mathematical optimum in large player pools. The NBA optimizer is an exact dynamic program over manually supplied star values.

## Run locally
1. `npm install`
2. Create `.env.local` with `SORARE_API_KEY=...` (server-side; never prefix it with NEXT_PUBLIC_).
3. `npm run dev` and open http://localhost:3000
4. `npm run build` before publishing on Vercel.

## Tests
With global `tsc` available, or use `npx tsc`:
```
mkdir -p .test-build
npx tsc --target ES2020 --module commonjs --moduleResolution node \
  --strict --skipLibCheck --outDir .test-build lib/model.ts lib/arcade.ts config/divination.ts
node tests/arcade.test.js
```

## Files to look at
- `config/divination.ts`: confirmed board constraints.
- `lib/arcade.ts`: validator, stars cap, five-slot optimizer.
- `app/components/arcade-dashboard.tsx`: interactive lineup builder + player browser.
- `app/page.tsx`: server-side Sorare data loading.
- `app/globals.css`: premium responsive design.

## Production checklist
- Add data freshness timestamps, rate limit handling and query integration tests.
- Validate actual user card ownership and star ratings through supported Sorare API data or a verified upload.
- Verify every competition's published rules and board target separately.
- Calibrate projections and probability estimates with historical outcomes.
