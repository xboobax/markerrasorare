# V2.4 – Obsidian Neon Builder (November 2026)

Neuer Neon-Farbkontrast für die an vier Nutzer-Vorlagen orientierten NBA-/Fußball-Teampanels. V2.4 ergänzt pro Team persistierte Fixierungen, ein ausschließlich leere Slots ergänzendes Smart Auto-Fill, HTML-Drag-&-Drop mit vollständiger Slot-/Sterneprüfung, einen expliziten Quick Swap mit zulässigen Alternativen, den Arcade Goal Meter, historische Formbalken auf jeder Karte und das zusammengefasste Lineup Risk Radar. Datenadapter für Sorare-Scores und offiziellen NBA-Sterneabruf sowie V2.2-Arcade-Optimizer bleiben bytegenau unverändert; lokale V2.3-Teams werden migriert. Alle 24 automatischen Testgruppen bestanden. Weitere Hinweise in `UPDATE_V2_4_DE.md`.

---

# V2.3 – Builder Workspace Redesign (November 2026)

Vier vom Nutzer gelieferte Screenshots als strukturelle Vorlage: NBA- und Fußball-Karten als kompakte Team-Slots; bis zu sechs Teams links; Spielerdatenbank mit Suchfeld, Sortierung, Bonus, Sorare-NBA-Sternen und Formdarstellung rechts. Direkt hinzufügen, explizit tauschen, duplizieren, leeren, Undo, Auto-Fill, Team-Ziele und lokales Speichern mit Migration der V2.2-Presets. Lineup Doctor inklusive interaktiver geprüfter Wechselvorschläge. Komplettes Obsidian-Dark-Mode-Workspace-Design. Die bisherigen Score-/Sterne-API-Module und Optimierungsregeln wurden nicht verändert. Siehe `UPDATE_V2_3_DE.md`.

---

# V2.2 – Arcade Lineup Intelligence (November 2026)

Neu: Unabhängiger, regelkonformer Vergleich mehrerer optimierter fünf-Spieler-Aufstellungen; Safety First (Floor), Best Projection (erwarteter Score), High Ceiling (Ceiling) und Arcade Target (höchste unkalibrierte Zielchance unter den erzeugten Kandidaten). Bei identischen Ergebnissen werden keine Scheinalternativen gezeigt. Risikoindex auf Grundlage der vorhandenen Einsatz-, Daten- und Formstreuungswerte; direkte Vorschau der Auswahl im automatischen Builder. Erweiterter Obsidian-Dark-Mode-Bereich mit responsiven Strategiekarten. Kein neuer API-Endpunkt, kein neuer API-Key, keine Änderungen an Sorare-Scores oder NBA-Stern-Sync.

Details, Tests und Update: `UPDATE_V2_2_DE.md`.

---

# V2.1 – Obsidian Intelligence (November 2026)

Neu: Lineup Doctor (regelvalidierte Wechselideen), Hidden Gems Finder (NBA Punkte/Stern; Fußball heuristischer Index), Data Health & Sync Center (Datenabdeckung und lokale Einstellungs-Backups), Dark-Mode-Design-Politur. Der etablierte Sorare-Adapter blieb bytegenau unverändert. Siehe `UPDATE_V2_1_DE.md`.

---

# Änderungen gegenüber `divisorare-main.zip`

## Analyse der Originaldateien
- `app/page.tsx`: Ursprünglicher Server-Renderer mit statischen Filterlinks und unbeschränktem Greedy-Lineup.
- `lib/model.ts`: Forecast = Mittel aus `proj` und `avg`, multipliziert mit geschätzter Einsatzwahrscheinlichkeit. Dies ist keine kalibrierte Vorhersage.
- `lib/sorare.ts`: Sorare GraphQL mit Fallback-Abfragestufen; NBA-Abruf ist im Quellcode vorgesehen, aber hier nicht mit Live-API-Key überprüfbar.
- `config/divination.ts`: NBA-Sterne-Limit fehlte, Fußball-Slots waren als Annahmen hinterlegt.
- Root-Dateien `model.ts`, `sorare.ts`, `page (1).tsx` etc. sind unbenutzte Altversionen. Sie wurden nicht geändert und nicht in die neue ZIP übernommen, um Verwechslungen beim Einbau zu vermeiden.

## Umgesetzt
1. `config/divination.ts`: Football GK/DEF/MID/FWD/FLEX, NBA 5×ANY mit 16 Sternen, 0,5-Schritte. Ziele 180/360 ausschließlich als auswählbare Screenshot-Beispiele.
2. `lib/arcade.ts`: eigenständiger Lineup-Validator. NBA mit exaktem dynamischem Programm zur Berechnung der besten 3 zulässigen 5-Karten-Lineups (nach Modellscore). Football mit begrenzter Beam Search und zwingend passenden Positionen. Kein Spieler doppelt.
3. `app/components/arcade-dashboard.tsx`: Suche, Positionsfilter, Sortierung, eigene Karten markieren, Sterne und Edition-Bonus manuell erfassen, Zielscore einstellen, 3 Lineups vergleichen, Prognose-/Risikohinweise. Speicherung nur in localStorage, ohne Login.
4. `app/page.tsx`: vorhandenen serverseitigen Sorare-Abruf beibehalten; UI als interaktive Client-Komponente.
5. `app/globals.css`: neues responsives Dark-Theme.
6. `app/status` und `app/diagnose`: im produktiven Deployment nicht öffentlich sichtbar (404).
7. `tests/arcade.test.js`: Regeln, Budget und Vergleich gegen Brute Force geprüft.

## Offene Punkte
- Live-GraphQL-Schema und `SORARE_API_KEY` konnten hier nicht getestet werden.
- Tatsächliche Karteneigentümerschaft/Editionen/Bonusstufen und NBA-Sterne müssen aus verifizierten Daten importiert werden; keine automatisch erfundenen Ratings.
- Kein echtes Gegner-/Matchup-Modell, kein historisches Backtesting, kein Edge-Case für mehrere Editionen eines Spielers.
- Volle Next.js-Buildprüfung muss lokal/bei Vercel erfolgen: npm-Pakete konnten in der Arbeitsumgebung wegen DNS/Netzwerk nicht installiert werden.

## V2.4.1 – NBA Spielplan und Gegner

- NBA-Spielplan-Daten werden den geladenen NBA-Spielern über eindeutige Teamnamen zugeordnet; Gegner, nächstes Spiel und bestätigte Uhrzeiten erscheinen auch im Team Builder.
- BALLDONTLIE bleibt primär; ESPN-Webseitenfeed als optionaler, nicht offiziell unterstützter Ersatz, wenn kein Spielplan geliefert wird.
- Datum/Uhrzeit in deutscher Zeitzone einschließlich US-zu-DE-Tageswechsel, echter 24-Stunden-Filter.
- Keine Änderung an Sorare-Datenadapter und offiziellem NBA-Sterneabruf. Details: `UPDATE_V2_4_1_DE.md`.
