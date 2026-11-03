# Markerras Sorare Helper V1.8 – Forecast Lab

**Stabile Basis:** Sorare-Adapter aus V1.7.2 ist unverändert. **Neue Module:** `lib/forecast-v18.ts`, `lib/backtesting.ts`, `lib/prediction-db.ts`, `lib/snapshot-policy.ts`. **Anleitung:** [`UPDATE_V1_8_DE.md`](UPDATE_V1_8_DE.md).

V1.8 vergleicht eine vorsichtige experimentelle Vorhersage mit dem bisherigen Modell und speichert zukünftige Prognosen vor dem Spiel im lokalen Browserarchiv (IndexedDB). Das neue Modell ist nicht als nachweislich besser ausgewiesen; es bleibt bis zur Validierung optional. Ohne Browserbesuch werden keine Snapshots gespeichert. Keine Cloud-Datenbank und kein Hintergrund-Cron.

---

> **V1.7 (auf Basis der stabilen V1.6.2):** Automatischer Abgleich gespeicherter Prognosen mit eindeutig zuordenbaren FINAL-Spielerscores beim Öffnen der App, manuelle Ergebnisprüfung, JSON-Backup und Kalibrierungs-Hinweise. Keine Hintergrundprüfung, keine Cloud-Datenbank und keine Änderung am funktionierenden Sorare-Kaderabruf. Siehe [UPDATE_V1_7_DE.md](UPDATE_V1_7_DE.md).

> **V1.6.1:** Spielerfoto-Fix: `avatarPictureUrl` für NBA und Fußball in allen Sorare-Abfragestufen. Siehe `UPDATE_V1_6_1_FOTOS_DE.md`.

# Markerras Sorare Helper — Football & NBA Arcade

This is an updated version of the uploaded Next.js 14 repository. Nothing is deployed automatically.

## Fußball-Ligen (gezielt begrenzt)
- **Nur Bundesliga, LaLiga, Ligue 1 und Premier League** werden im Fußballbereich geladen.
- Die Filterung erfolgt auf dem Server (`lib/sorare.ts`, `lib/leagues.ts`) bereits vor dem Abruf der Spieler; andere Ligen gelangen nicht in die Suche oder den Optimizer.
- „Alle 4 Ligen“ kombiniert nur diese vier Wettbewerbe. Ein ungültiger URL-Ligaparameter fällt auf Bundesliga zurück.
- NBA-Daten und die 16-Sterne-Regel bleiben unverändert.
- Unterstützte bekannte alternative Sorare-Anzeigenamen sind in `lib/leagues.ts` hinterlegt. Wenn Sorare die Liga umbenennt, muss die Alias-Liste aktualisiert werden.

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
  --strict --skipLibCheck --outDir .test-build lib/model.ts lib/arcade.ts config/divination.ts lib/leagues.ts
node tests/arcade.test.js
node tests/leagues.test.js
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

## Deployment
GitHub: https://github.com/xboobax/markerrasorare  
Vercel: https://markerrasorarev1.vercel.app/
Siehe `DEPLOYMENT_DE.md`. Die ZIP-Datei ist ein Projekt-Update, kein automatisch ausgeführtes Deployment.

## Update V1.3

Spielerbilder, L5-/L10-basierte Prognosespanne und verbesserter Lineup Builder mit drei Strategien sowie Fixieren/Sperren. Details und Vorsichtsmaßnahmen siehe `UPDATE_V1_2_DE.md`.


## Version 1.3

Neue Matchup-Szenarien, optionales Spielminuten-Scouting und das Zielchance-Ranking im Arcade Lineup Builder. Die Gegnerstärke wird **manuell** eingetragen, bis eine verifizierte Verteidigungsstatistik-Quelle angeschlossen ist. xG/xA werden gespeichert, aber nicht unkalibriert in Sorare-Punkte umgerechnet. Details in [`UPDATE_V1_3_DE.md`](UPDATE_V1_3_DE.md).

## Version 1.4

Erweiterte Kader-Pagination, anklickbare Detailprofile, akzentunabhängige Suche, optionale automatische Defensivdaten aus externen Anbietern, 5-Lineup-Vergleich und lokales Prognose-Tracking. Die Datenvollständigkeit wird **nicht** über die tatsächlich gelieferten aktiven Kader hinaus versprochen. Siehe [UPDATE_V1_4_DE.md](UPDATE_V1_4_DE.md) für Einrichtung und Einschränkungen.

## Version 1.5 – Eigener Lineup Builder

Du kannst fünf Spieler jetzt selbst für die vorgesehenen Positionen aufstellen, austauschen und drei manuelle Lineups im Browser speichern. NBA-Sternelimit und Fußball-Positionen werden überprüft. Der bisherige automatische Optimizer bleibt als eigener Reiter erhalten. Details: [UPDATE_V1_5_DE.md](UPDATE_V1_5_DE.md).

## Neu in V1.6 – nachvollziehbare Prognosen und einfachere Lineups

- Vorsichtigere Gewichtung bei wenigen historischen Einzelscores; Herkunft jeder Prognose im Spielerprofil sichtbar.
- Verständlicher Formtrend erst bei ausreichender Datenmenge.
- Spieler ohne Score-Daten bleiben suchbar, zeigen aber keinen erfundenen Null-Score.
- Freiwillige 1-zu-1-Tauschvorschläge im manuellen Builder mit NBA-Sternen- und Fußball-Positionsprüfung.
- Optional Tauschvorschläge nur für manuell markierte eigene Karten.

Vollständige Installations- und Testhinweise: [UPDATE_V1_6_DE.md](UPDATE_V1_6_DE.md).
