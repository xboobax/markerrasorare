## V3.1.0 — NBA Stars Optimizer 2.0

Vier NBA-Profilstrategien (Max Points / Smart Value / Safety First / High Ceiling), Sternbudget-DP, erweiterte Gegner-/Risikotransparenz, echte Profilvarianten, V3.0-Kompatibilität und zusätzliche Regressionstests. Details: `UPDATE_V3_1_DE.md`.

## V2.9.2 – Obsidian Black, Matchday Ready & NBA Value Finder

- Deutlich dunkleres, aufgeräumtes Builder-Interface mit einklappbaren sekundären Optionen und kompaktem Spielerpool.
- Matchday Ready: verifizierte eigene Karten + Spiel am heutigen deutschen Kalendertag + keine bestätigten OUT-Meldungen.
- NBA Value Finder: Top-Quartil nach erwarteten Punkten, Floor oder Ceiling je gültigem Stern; kein NBA-Captain.
- Bestehende Teams, Sorare-OAuth, Sync, NBA-Sterne und Fußball-Captain +50 % unverändert.

## V2.9.0 – Neon Lineup Builder Pro / Captain Intelligence (04.11.2026)

- **Nur Fußball:** feste 50 % Captain-Bonusregel für je ein Mitglied einer 5er-Aufstellung, goldene Krone, Auswahl pro Team und Speicherung im bestehenden V2.3-Workspace-Key. Smart Captain nach Erwartungswert oder sicherheitsbewusstem Floor und Ausfallmeldungen; manuelle Wahl bleibt erhalten.
- **Nie NBA-Captain:** keine Krone, kein Captain-Extra, kein NBA-Captain-State. Das NBA-16-Sterne-Limit bleibt unverändert.
- Neuer Captain-Aufsatz für Teamprognose, Floor, Ceiling, Target Chance, Team Battle, Arcade Goal Meter und automatische Fußball-Vorschauen; bestehendes Prognosemodell unverändert. Aktive automatische Mannschaftsselektion nutzt weiterhin den vorherigen Optimizer (nicht global neu nach Captainbonus optimiert).
- Neu: Player Intelligence Panel, bestätigungspflichtige Quick-Swap-Vorschau, Final Lineup Check, Explain My Lineup und Tabellenspalten mit gespeicherter Ansicht pro Sport.
- Echte Sorare-Kartenexemplare auswählbar (assetId, rarity, seasonYear, serialNumber). Da keine verifizierten Bonusprozente geliefert werden, kann ein eigener Wert je Kartenexemplar manuell hinterlegt werden. Keine behauptete offizielle Wettbewerbseignung.
- Rollbackfreundlich: keine Änderung an Sorare-Scores, NBA-Star-Sync, OAuth-Tokens, Sammlungssync, Verletzungsquellen oder bestehenden Browser-Speicherschlüsseln.

## V2.8.3 – Deutlich sichtbarer „Nur meine Karten“-Schalter

- Ein gemeinsamer, prominenter Schalter im Team Builder statt zweier widersprüchlicher Menüs; NBA und Fußball speichern ihre Auswahl separat.
- Der Filter gilt gleichzeitig für Spielertabelle, automatische Optimierung, Smart Auto-Fill, Quick Swap und manuelle Spielerübernahme.
- Besitz basiert im Modus AN ausschließlich auf einer vollständig synchronisierten Sorare-Sammlung; keine irreführenden manuellen Eigentümermarkierungen.
- Vorhandene Teams bleiben gespeichert, Fremdspieler werden sichtbar gewarnt; keine heimlichen Änderungen.
- OAuth, Sorare-Scores, NBA-Sterne, Spielplan und Verletzungsfeeds bleiben unverändert.
- Anleitung: `UPDATE_V2_8_3_DE.md`.

---

## V2.7 – Prediction Lab Pro

- NBA- und Fußball-Prognosen aus dem bestehenden IndexedDB-Archiv nach offiziellen Spieltags-Ergebnissen bewerten; keine neuen API-Zugänge erforderlich.
- Zeitlich getrennte historische Modellprüfung: blend weights ausschließlich auf Trainingstagen auswählen und auf späteren Holdout-Tagen vergleichen, keine automatische Promotion.
- Anzeige von MAE/Bias, Win-Rate, 80-%-Intervallabdeckung, Spieltag-Trends, Segmentanalyse nach prognostiziertem Score, eingefrorener Position und Verein sowie den größten Fehlprognosen.
- Strenge Datenqualität: ausschließlich vor Spielbeginn gespeicherte, offiziell markierte FINAL-Resultate für den Modellvergleich; Dubletten pro Spieler/Spiel entfernen und manuelle Scores separat halten.
- Neue Vor-Spiel-Snapshots speichern `position` als optionales historisches Feld. Bestehende V1.7/V1.8-Archivdaten werden nicht rückwirkend verändert.
- Vorhandene Sorare-, NBA-Sterne-, Spielplan-, Verletzungs- und Prognose-API-Dateien unverändert. Weitere Details in `UPDATE_V2_7_DE.md`.

---

## V2.6 – Injury & Availability Center

- Auto refresh on visible app sessions: 30/10/5 minutes depending on verifiable tipoff timing, manual refresh, visibility/focus checks.
- Server-only, cache-controlled NBA ESPN injury feed and best-effort soccer ESPN injury feeds. Optional server-side `API_FOOTBALL_KEY` for fixture-scoped injury and suspension data in the four supported leagues.
- Player badges, source and timestamp, availability filter, lineup risk alerts, and source status diagnostics.
- Confirmed OUT excluded from new Smart Auto-Fill, auto optimizer/Arcade Intelligence and Quick Swap; manually saved teams and locks never silently changed.
- Strict matching by player full name and team, date guards for football fixture-specific injuries, `unknown` by default when sources unavailable.
- Entire existing Sorare scores/official NBA stars and forecast data adapter unchanged.

# V2.5 – Arena Intelligence & Team Builder Pro (November 2026)

NBA-Mehrfachspiele im wählbaren 3-/7-/14-Tage-Scoutingfenster, alle gemeldeten Gegner/Partien und Double-Game-Badges; Matchup Difficulty aus bestätigten Defensivdaten einschließlich optionalem, keylosem ESPN-Fallback; Team Battle mit Zielchance und Warnungen; mobile Kartenübernahme per Antippen mit Kopieren/Verschieben. Der NBA-16-Sterne-Builder, Fußball-Slots und die lokale Team-Speicherung bleiben erhalten. Keine erfundenen Termine oder Gegnerwerte und kein automatischer Mehrfachspiel-Scorebonus. Die Sorare- und Sterneadapter sind unverändert. Details: `UPDATE_V2_5_DE.md`.

---

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

## 2.8.0 – My Sorare Collection

- Sorare OAuth 2.0 Authorization Code mit CSRF-Status, verschlüsseltem HTTP-only-Cookie, Refresh und Logout
- eigene Karten via `currentUser.anyCards` und Cursor-Pagination (NBA/Football, Seltenheit, Saison, Seriennummer)
- Sammlungsanzeige, manueller/15-Minuten-Sync bei geöffneter Seite, sicherer Fallback bei Abbrüchen
- verifizierter Kartenbesitz für den Team Builder, manuelle Browsermarkierungen als Backup behalten
- Sorare-Score-Adapter, offizielle NBA-Sterne und Forecast unverändert

## V2.8.2 – Sorare Collection Sync Hotfix

- `app/api/collection/route.ts`: `CurrentUser.anyCards` durch dokumentiertes `Query.cardsWhere(first, after, ownedByMe: true)` ersetzt und die paginierte Antwort auf Root-Ebene ausgewertet.
- Fehlerfälle behalten den bisherigen bestätigten lokalen Sammlungsstand bei; keine Änderungen am OAuth-Login, den Sorare-Scores oder dem NBA-Sterne-Feed.
- V2.8.2-Schema-Regressionsschutz und deutsche Update-Anleitung ergänzt.

## V3.0 — Advanced Strategy & Projection Intelligence
- NBA und Fußball: gemeinsam gespeicherte / je-Team gespeicherte Auto-Builder-Optionen mit PS Standard, PS Raw und experimenteller (nicht kalibrierter) Q80-Schätzung.
- Strategievorlagen Safe / Balanced / High Ceiling sowie Mindestpunkte, Einsatzlimits über mehrere Teams und optionale Matchup-Konflikte.
- Fußball-spezifisch: Defensive/Offensive/Team-Stacks, Zusatzposition, Liga-Ausschluss und weiterhin Captain +50 %.
- NBA-spezifisch: unverändertes 16-Sterne-Limit ohne Captain.
- Fußball-Spielerpool: sortierbare PS Raw-/Q80-/Historisch-70+-Werte, zusätzliche Spalten mit bewusst leerer Anzeige bei fehlender Datenbasis, „Explain My Projection“.
- Classic-Karten-Priorisierung bleibt deaktiviert, bis belastbare Daten vorliegen. Sorare-Login, Collection-Sync und API-Keys unangetastet.
