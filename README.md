# Neon Builder Pro V3.9 – NEON Intelligence

**Die aktuelle Version hat weiterhin fünf kompakte Tabs.** Daily Missions, Gameday, Advisor, Rebuild, Portfolio, Reality Check und Schnellaktionen sind in den bestehenden Bereichen integriert, ohne zusätzliche Pflicht-Panels. Keine Upstash-Pflicht und keine kostenpflichtigen APIs. Die vollständige Update-Anleitung steht in [`UPDATE_V3_9_NEON_INTELLIGENCE_DE.md`](UPDATE_V3_9_NEON_INTELLIGENCE_DE.md).

---

## V3.7.1: Aktuelles Fußball-Set beim Kartensync

Die Fußball-Kartensammlung nutzt jetzt **`cardSet.currentSet(sport: FOOTBALL)`** und
**`cardSet.slug`** aus der Sorare-GraphQL-API. Nur Karten mit exakt gleicher
Set-ID erscheinen als verifizierte eigene Karten in Fußball-Builder, Sammlung
und Daily Missions (bei aktivem „Nur meine Karten“). Alte Hyperglitch- und
Pro-Karten werden nicht als Divination-Karten ausgegeben. Der Sync speichert
weiterhin die Originalkartendaten lokal, ohne historische Karten zu löschen.
NBA wird nicht eingeschränkt. Nach dem Update bitte **Sammlung → Jetzt
synchronisieren** anklicken. Bei abgebrochenem Sync bleiben zuvor gespeicherte
Daten erhalten, sie gelten jedoch nicht als für das aktuelle Set verifiziert.

# Neon Builder Pro V3.7.1 — Current Set Collection Sync

**Neu:** Vier kompakte Tabs (Builder, Spieler, Analyse, Sammlung), Sticky Lineup, Quick Filters, Smart Swap, Lineup Doctor, Team Battle mit Spieler-Differenzen, lokale Optimierungs-Presets und eine schlankere Spieler-Tabelle. Fußball- und NBA-Regeln bleiben erhalten. **Keine Upstash-Pflicht; Cron-Jobs standardmäßig deaktiviert.**

Siehe `UPDATE_V3_5_CLEAN_WORKSPACE_DE.md` für Details und Deployment-Anleitung.

---

> **Neu in V3.4:** Automatisches Prediction Learning Lab für NBA und Fußball. Tägliche Vercel-Cron-Jobs frieren öffentliche Vor-Spiel-Prognosen (V1.7/V1.8/V2.0) in Upstash Redis ein und gleichen nach Spielende eindeutige Sorare-FINAL-Scores ab. **Einmalige Einrichtung erforderlich:** [V3.4-Anleitung](UPDATE_V3_4_AUTOMATION_DE.md). Bestehende lokale Archiv-Funktionen bleiben erhalten.

> **Neu in V3.3:** Prediction Engine 2.0 für NBA und Fußball mit konservativem Formsignal, Risikoindex, heuristischem Floor/Ceiling und eingefrorenen V2-Snapshots. Siehe [Update V3.3](UPDATE_V3_3_PREDICTION_ENGINE_DE.md).

> **Neu in V3.1:** NBA Stars Optimizer 2.0 (vier Profile, 16-★-DP, Smart Value, Matchup/Risiko und unterschiedliche Teamvarianten). Siehe [UPDATE_V3_1_DE.md](UPDATE_V3_1_DE.md).

# V2.9 – Neon Lineup Builder Pro mit Captain Intelligence

**Fußball: exakt ein Captain mit festem +50-%-Bonus. NBA: kein Captain.**

Neu: Goldene Captain-Krone, manuelle Captainwahl, Smart Captain (Erwartungswert oder Floor/Risiko), sichere Warnungen vor Ausfällen, Captain-Bonus in Team-Prognosen, Floor, Ceiling, Modell-Zielchance, Team Battle und automatischen Lineup-Vorschauen. Außerdem: Player Intelligence Panel, bestätigungspflichtige Quick-Swap-Vorschau, kartenexemplarbezogene Auswahl aus der authentifizierten Sorare-Sammlung, lokal einstellbare Bonuswerte pro Kartenexemplar, speicherbare Tabellenansichten, Explain My Lineup und Final Lineup Check.

Die V2.8.3-Teams werden weiter aus demselben Browser-Speicherschlüssel geladen. Die Sorare-GraphQL- und OAuth-Routen, offizielle NBA-Sterne und Prognoseformeln wurden nicht geändert. Der Captain-Modifier wurde als neue, separate Nachberechnung angebaut. Zusätzliche konkrete Kartenboni werden **nicht aus Seltenheit oder Seriennummer erfunden** und bleiben manuell. Weitere Details und Installation: `UPDATE_V2_9_DE.md`.

# Markerras Sorare Helper V2.8.3 – Meine Karten für NBA und Fußball

**Neu:** Im Lineup Builder lässt sich über einen deutlich hervorgehobenen Schalter „Nur meine NBA-Karten“ bzw. „Nur meine Fußball-Karten“ aktivieren. Der Schalter gilt für manuelle und automatische Aufstellungen, bleibt pro Sportart separat gespeichert und verwendet ausschließlich vollständig synchronisierten Sorare-Kartenbesitz. Siehe [`UPDATE_V2_8_3_DE.md`](UPDATE_V2_8_3_DE.md).

---

# Markerras Sorare Helper V2.7 – Prediction Lab Pro

**Aktuelle Version V2.7**, aufbauend auf V2.6. Ein neues Obsidian-Neon-Analyseboard vergleicht eingefrorene Vor-Spiel-Prognosen mit späteren offiziellen Sorare-Ergebnissen. Es zeigt MAE, Bias und Intervallabdeckung, Fehler nach Spieltag, Punktbereich, Position und Verein sowie die größten Ausreißer. Experimentelle Modellmischungen werden auf älteren Daten gewählt und nur auf späteren Spieltagen getestet. **Keine automatische Änderung der aktiven Prognosen**, keine neuen API-Abhängigkeiten und keine Umrechnung älterer Vorhersagen. Die Archivdaten bleiben lokal.

**Update-Anleitung: [UPDATE_V2_7_DE.md](UPDATE_V2_7_DE.md)**.

---

# Markerras Sorare Helper V2.6 – Injury & Availability Center

Installationsanleitung: **[UPDATE_V2_6_DE.md](UPDATE_V2_6_DE.md)**. V2.6 baut auf V2.5 auf und ergänzt eine getrennte Verfügbarkeitsprüfung für NBA und die vier Fußballligen. ESPN-Best-Effort-Feeds ohne Zugangsschlüssel, API-Football optional über die Server-Variable `API_FOOTBALL_KEY` (siehe `.env.example`). Verletzungsdaten werden nicht als Gesundheitsbestätigung interpretiert, wenn keine Meldung vorhanden ist. Kein Monitoring bei geschlossener Webseite.

# Markerras Sorare Helper V2.5 – Arena Intelligence

**Aktuelle Version: V2.5**, aufgebaut auf der getesteten V2.4.1. NBA Double-Game-Scouting im 3-/7-/14-Tage-Fenster, neue Matchup Difficulty mit separatem ESPN-Defensiv-Fallback, Team Battle und mobil nutzbarer Spielertransfer (Kopieren oder Verschieben). Der Obsidian-Neon-Builder bleibt der zentrale Arbeitsbereich. Prognosewerte, Spielplan, Sterne und Sorare-Scoreabruf bleiben unabhängig.

**Anleitung:** [`UPDATE_V2_5_DE.md`](UPDATE_V2_5_DE.md). Der Scoutingzeitraum ist **keine offiziell bestätigte Gameweek**, und mehrere NBA-Spiele führen nicht automatisch zu einer höheren Arcade-Prognose. Gegnerwerte sind nur grobe, datenbasierte oder manuelle Defensivstufen.

---

# Markerras Sorare Helper V2.4 – Obsidian Neon Builder

**Version V2.4 (Vorgänger):** Neuer farbkräftiger Team Builder auf Basis der vier Nutzer-Vorlagen. **Spieler pro Team fixieren**, **nur leere Slots mit Smart Auto-Fill ergänzen**, Drag & Drop zwischen Spielerpool und Teams, **Quick Swap**, **Arcade Goal Meter**, historische Formkurven auf den Karten und **Lineup Risk Radar**. Die offizielle NBA-Sterne-Synchronisierung und die bestehenden Sorare-Score-Abfragen sind unverändert. Die Spieler werden weiterhin in NBA oder Fußball getrennt dargestellt.

**Installation:** [`UPDATE_V2_4_DE.md`](UPDATE_V2_4_DE.md). Die V2.3-Team-Speicherungen bleiben erhalten. Prozentangaben zu Zielchance und Einsatzzeit sind Prognosemodellschätzungen, keine garantierten oder extern bestätigten Werte.

---

# Markerras Sorare Helper V2.3 – Builder Workspace Redesign

**Version V2.3 (Vorgänger):** baut den manuellen Lineup Builder nach vier Nutzer-Screenshots neu: mehrere Teams links, umfangreicher Spielerpool rechts, kompakte NBA- und Fußball-Spielerkarten, Direktauswahl, Filter, Auto-Fill, Undo, lokaler Team-Speicher und Dark-Mode-Politur. V2.2 Arcade Intelligence bleibt über den zweiten Builder-Tab vorhanden. **Sorare-Datenabruf und offizieller NBA-Sterne-Sync bleiben unverändert.**

**Update-Anleitung:** [`UPDATE_V2_3_DE.md`](UPDATE_V2_3_DE.md). Es werden keine Gameweek-Termine oder offiziellen Einsatzchancen erfunden; die angezeigten Prognosewerte sind Modellschätzungen.

---

# Markerras Sorare Helper V2.2 – Arcade Lineup Intelligence

**Version V2.2 (Vorgänger):** integriert einen neuen Strategie-Vergleich mit bis zu vier verschiedenen, gültigen Aufstellungen (Safety First, Best Projection, High Ceiling, Arcade Target), Risikoindex, Floor/Ceiling, heuristischer Zielchance und einer direkten Vorschau im automatischen Builder. NBA nutzt weiterhin die offiziellen Sterne aus V2.1.1. Die bestehenden Sorare- und NBA-Sterne-Abfragen wurden **nicht verändert**. Anleitung: [`UPDATE_V2_2_DE.md`](UPDATE_V2_2_DE.md).

**Wichtig:** Die Zielchancen sind nicht kalibriert; ein hoher Prozentwert ist keine garantierte Gewinnwahrscheinlichkeit. Die Zielvariante ist die beste im erzeugten *begrenzten Kandidatenpool*, nicht mathematisch global optimal. Aktuelle NBA-Tier-Sterne können von bereits festgelegten Sternkosten der Gameweek abweichen. Der Helper übermittelt keine Lineups an Sorare.

---

# Markerras Sorare Helper V2.1 – Obsidian Intelligence

**Version V2.1 (Vorgänger):** Lineup Doctor, Hidden Gems Finder, Data Health & Sync Center. Die Datenanbindung aus V2.0 ist bytegenau unverändert. **Installation:** [`UPDATE_V2_1_DE.md`](UPDATE_V2_1_DE.md).

# Markerras Sorare Helper V1.9 – Obsidian Studio

**Stabile Basis:** Sorare-Adapter aus V1.7.2 ist unverändert. **Neue V1.9-Module:** `lib/lineup-intelligence.ts` und `lib/watchlist.ts`. **Installationsanleitung:** [`UPDATE_V1_9_DE.md`](UPDATE_V1_9_DE.md). Die V1.8-Forecast-Lab-Module bleiben erhalten.

V1.9 ergänzt einen Smart Lineup Assistant, direkte Spielerübernahme, Favoriten, Lineup-Varianten und ein Obsidian-Dark-Mode-Design. Die V1.8-Vorhersagen und die reparierte Sorare-Abfrage bleiben erhalten.

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
- Sorare-Spielersterne werden seit V2.1.1 über einen getrennten API-Abruf bezogen (`gameplayTierStars`). Persönlicher Kartenbesitz und Boni werden weiterhin manuell gepflegt. Aktuelle Sterne können vom festgeschriebenen Gameweek-Sternpreis abweichen.
- Football targets **180** and **360** are examples visible on the user's screenshots and may differ for other steps/sets.
- Current point forecast is a rough average of Sorare projection and historical average weighted by estimated play probability. No calibrated hit probability or defensive matchup rating is claimed.
- One card per player is supported. Multiple card editions per player, collection sync, specific Gameweek star costs, set eligibility and exact multi-game rules remain future work.
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

## Neu in V2.0: Gameweek & Arcade Center

Das neue `GameweekCenter` kombiniert eine Übersicht kommender Begegnungen (aus bereits geladenen Sorare-Fußball-Fixtures oder optional über BALLDONTLIE-NBA-Spiele), einen lokalen Arcade-Level-/Leben-Tracker, frei wählbare Score-Ziele mit Übernahme in den Lineup Builder sowie eine kompakte Übersicht eigener manuell markierter Karten. Es nimmt selbst **keine Sorare-Lineups vor** und erfindet keine Spieltermine oder offizielle Board-Level.

Details und sichere Aktualisierung via GitHub Desktop: **`UPDATE_V2_0_DE.md`**.

### V2.4.1 – NBA Spielplan-/Gegner-Fix

Die NBA-Spielkarten und die Spielerpool-Tabelle nutzen jetzt den getrennt geladenen NBA-Spielplan zur Anzeige der nächsten Gegner und Spieltermine. BALLDONTLIE wird weiterhin zuerst verwendet; optional greift ein öffentlicher ESPN-Webseitenfeed als nicht garantierter Ersatz. Ohne bestätigte Spieldaten wird nichts geschätzt. Installationshilfe: `UPDATE_V2_4_1_DE.md`.

## V2.8 – My Sorare Collection

Offizieller Sorare-OAuth-Login und automatische Synchronisierung eigener NBA-/Fußballkarten. Einrichtung: **UPDATE_V2_8_DE.md**.

### V2.8.2 – Fix für „Field anyCards doesn't exist on CurrentUser“

Bei bereits installiertem V2.8.1 das kleine V2.8.2-Update einspielen. Der Sorare-Sammlungsabruf verwendet jetzt das offiziell dokumentierte paginierte Root-Feld `cardsWhere(ownedByMe: true)`. Die bisherige OAuth-Konfiguration und alle gespeicherten Teams bleiben erhalten. Siehe `UPDATE_V2_8_2_DE.md`.
