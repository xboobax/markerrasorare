## V4.5.4 – Football Source Audit
- Fallback für benannte ESPN-Roster-Statistiken und explizite Missing-Werte.
- Neuer anonymer, begrenzter Diagnostik-Endpunkt `/api/football-stats-diagnostics`.
- Keine neuen Jobs, keine Migration, keine ungeprüften Sorare-Scores.

## V4.5.0 – Einzelstatistik-Archiv (NBA und Fußball)

Neon-Migration `schema/learning-v45-performance.sql`, 12 begrenzte tägliche Statistik-Cronjobs, deduplizierte ESPN-FINAL-Spielerleistungen inklusive NBA-3PM/3PA und bei Fußball sämtlicher beobachteter Sorare-Eventnamen. Getrennte Sportauswertung unter dem V4.4-Learning-Dashboard. Keine Änderungen an bestehenden PP/Q80-Zielwerten oder Modellfreigaben.

## V4.3.0 – Europapokal & internationale Football Match Center

- Fußball Gamecast unterstützt jetzt UEFA Champions League, Europa League und Conference League sowie die bisherigen vier nationalen Ligen.
- Nationalteam-Filter mit Freundschaftsspielen, Nations League, WM-/EM-Qualifikationen und wichtigen Kontinentalturnieren.
- Neue Wettbewerbsauswahl mit expliziten ESPN-IDs, begrenzten Abrufen, serverseitigem Cache, europäischen Datumskonventionen und deutscher Zeitzonen-Korrektur bei spät beginnenden Länderspielen.
- Robuster internationaler Aufstellungs-Fallback bei vorhandenem ESPN-Kader ohne Live-Boxscore: niemals erfundene Sorare-Wertung.
- Verifizierte eigene Fußballkarten aus dem aktiven Set in allen abgerufenen Spielerkadern hervorgehoben; keine fiktive Nationenzuordnung.
- Keine Club-PP/Q80-Prognosen für Nationalteams; Button mit Begründung deaktiviert.
- Sicherheitsprüfungen aller neuen Wettbewerbsfilter und Regressionen. Die NBA-V4.2.2-Datenvollständigkeitsprüfungen aus der vorherigen Entwicklungsbasis bleiben erhalten.

## V4.2.1 — Football Standard-Scoringmatrix und Datenvollständigkeit

- Vereinfachte Fußball-Live-Score-Heuristik durch positionsabhängige veröffentlichte Sorare-Standardmatrix ersetzt.
- Decisive-Level, All-Around-Statistiken inklusive Passstatistiken, Double/Triple-Boni und 2025/26-Anpassungen.
- Kein scheinbar exakter PS bei unvollständigen ESPN-Stats: Fehlende Felder werden nicht mit Null gleichgesetzt.
- Ausklappbare Matrix und Einzelstatistik-Prüfung im Football Live Center.
- 58 Regressionstests und syntaktische Kontrolle; Next-Produktionsbuild auf Vercel weiterhin erforderlich.

## V4.1.0 – NBA Live Match Center (Preview)
- NBA Live Gamecast: ESPN-Scoreboard, Spielaktionen, Starter (nur falls offiziell markiert), Boxscore und Spieler-Detailmodal.
- Vorläufige Sorare-NBA-Basisscores nach Punkten, Rebounds, Assists, Steals, Blocks, Dreiern, Turnovers, DD/TD. Keine erfundenen Scores bei DNP.
- Nur das ausgewählte Spiel alle 20s während LIVE; öffentliche Daten mit 15–20s Servercache, Stop bei FINAL und Pause in Hintergrundtabs.
- Berliner Datum wird aus dem aktuellen und vorherigen ESPN-US-Spieltag aufgelöst.
- Freiwilliger PP/Q80-Abruf für nur zwei Teams; keine heimliche Rekalibrierung oder erfundenen Pregame-Snapshots.
- Originales V4.0.4 Sync-/Builder-/Prediction-Verhalten unverändert.

## V4.0.3 — Prediction Engine 3.0 Beta (04.11.2026)

- Neue bedingte PP/Q20/Q80-Punkteverteilung für NBA & Fußball, Risiko-PP separat.
- Einheitliche Berechnung in beiden Buildern und Player Database; Q80 mit Kartenbonus ohne doppelte DNP-Anrechnung.
- Alte Modelle und Presets bleiben auswählbar, Sorare-Sync V4.0.2 unverändert.
- Neuer V3-Regressionstest, Einordnung der unkalibrierten Werte, strenge Domain-Prüfung.

## V3.9.2 – Vercel TypeScript Build Fix (2026-11-04)

- `CachedPrediction` verwendet jetzt `ScoutedForecast` statt `Forecast`, um `opponentRating`, `matchupAdjustmentPct` und `minutesAdjustmentPct` typkorrekt zu übernehmen.
- Die bestehende Berechnungslogik, Optimierung, Divination-Set-Filterung und das kompakte UI bleiben unverändert.
- Zusätzlicher Typ-Regressionscheck für die Matchup-Felder in der Production-Dashboard-Komponente.
- Vollständiger Next.js-Build benötigt npm-Abhängigkeiten und muss auf Vercel bestätigt werden.

## V3.9.1 – Performance Edition (2026-11-04)

- Lazy Rendering von inaktiven Player-/Analytics-/Daily-Mission-Workspaces.
- Fußball- und NBA-Optimizer werden nur im aktiven automatischen Builder berechnet.
- Index für bestätigte aktive Sorare-Karten; Sortierwerte im Spielerpool gecacht.
- Prognose-Cache für unveränderte Spieler; Karten-/Besitzänderungen lösen keine komplette Vorhersage-Neuberechnung aus.
- Memoisierung für den manuellen Builder und die Sorare-Sammlung, stabile Callbacks.
- Gameweek Center erst beim Öffnen, vereinfachte Sticky-Leisten ohne Blur.
- 49 Testdateien erfolgreich. Kein neuer API-Key, keine Upstash-Pflicht.
- Full Next.js Build noch auf Vercel zu verifizieren.

## V3.9.0 – NEON Intelligence / kompaktes UI

NBA Breakout Finder und Football Action Hunter in zugeklappten Daily-Mission-Details, Gameday & Advisor als schmale Builder-Zeile, reparierender One-Click Rebuild, kompakter Hidden Gems Detector, verifizierter Reality Check, Multi-Lineup Portfolio-Diversifizierung, Spielbeginn-Radar und NEON Quick Actions (Strg+K). Alle fünf Tabs und Regeln bleiben bestehen. Keine kostenpflichtigen API-/Upstash-Abhängigkeiten. 48 Tests erfolgreich; Next.js-Produktionsbuild noch nicht lokal bestätigt.

## V3.8.0 – Daily Mission Intelligence 2.0 (kostenlos)
- Neuer One-Click Mission Pick: wählt nur verifiziert eigene Karten und überspringt Kandidaten mit hohem Einsatzrisiko; überträgt nur in den lokalen manuellen Builder, keine automatische Sorare-Abgabe.
- Mission Safety verknüpft vorhandene Verfügbarkeitsberichte (OUT / Doubtful / Questionable), Alter des Gesundheitsstatus, Prognosedaten und Einsatzmodell. Risiken werden als heuristischer INDEX, nicht als behauptete Wahrscheinlichkeit angezeigt.
- Kein zusätzlicher Datenanbieter: kostenlose Sorare- und bereits vorhandene Quellen, weder neue API-Keys noch Upstash oder Cron nötig.
- NBA: exakte Zielmarke max(20, Sorare L10 + 7), Form und historische Überschreitungen, konservative Glättung; korrekte Berliner Spieltage und bestätigte Tipoff-Zeiten.
- Fußball: Positionen getrennt, Tor- und Assist-Signale nur aus tatsächlich vorhandenen optionalen xG/xA; keine erfundenen Ereigniswahrscheinlichkeiten für Tore/Assists/Torlinienklärung/Clean Sheets/Elfmeter.
- Auswahl- und Ausschlussbericht, kompakter schwarzer/lila UI-Bereich im bestehenden fünften Daily-Missions-Tab. V3.7.1 Divination Set Sync bleibt erhalten.
- Zusätzliche Regressionstests für Regeln, Sicherheit, Besitz und Ein-Klick-Auswahl.

## V3.4.0 – Automatisches Prediction Learning Lab (NBA + Fußball)
- 17 tägliche Vercel-Cron-Teiljobs für öffentliche Vor-Spiel-Snapshots und offizielle Score-Abgleiche, unabhängig von geöffnetem Browser.
- Dauerhaftes, einmalig einzurichtendes Upstash-Redis-Archiv mit unveränderlichen Modellvergleichen V1.7/V1.8/V2.0.
- Neue NBA-/Fußball-Accuracy-Zentrale mit Serverstatus, MAE, RMSE, Bias und Wochen-/Spieltagtrends.
- Scharfe Schutzbedingungen gegen nachträgliche Prognosen, UTC-/US-Zeitzonenfehler, Mehrfachspeicherung, unbekannte Scores und ungesicherte Cron-Routen.
- Keine automatische Modelländerung: nur offizielle, vorab eingefrorene Vergleiche; alte Browserdaten und Builder bleiben erhalten.
- Vollständige Einrichtungs-/Sicherheitsdokumentation: UPDATE_V3_4_AUTOMATION_DE.md.

## V3.3.0 – Prediction Engine 2.0 (NBA & Fußball)

- Neues, optional wählbares Modell V2.0 im Forecast Lab; V1.7- und V1.8-Modell bleiben unverändert auswählbar. Bestehende manuelle Builder, NBA-Sterne, Captain-Regeln, Kartenbonus- und Sammlungsdaten bleiben erhalten.
- Konservativ gewichteter, ausreißerrobuster Trend aus echten Sorare-Einzelscores (NBA maximal 36 %, Fußball maximal 30 %), begrenzt auf ±14 % gegenüber der bestehenden gegner-/minutenbereinigten Basisschätzung.
- Gegner- und manuell erfasste Minutenfaktoren werden genau einmal berücksichtigt. Fehlende Matchups/Minuten bleiben neutral. L5/L10-Trend wird erklärt, nicht zusätzlich aufaddiert.
- Heuristische Floor/Ceiling-Bänder, Datenqualität und Risikoindex (Einsatzrisiko, Streuung, Datenlücken) im Spielerprofil und der Spielertabelle. Kein wissenschaftlich kalibriertes Konfidenzintervall und keine garantierte Gewinnwahrscheinlichkeit.
- Neues V2.0-Prognosearchiv: in zukünftigen Snapshots werden V1.7, V1.8 und V2.0 eingefroren gespeichert; neue V2-Felder sind optional und rückwärtskompatibel. Official-only V1.8/V2.0-MAE aus künftigen FINAL-Daten im Forecast Lab.
- Neues V3.3-Regressions-Testfile; vollständige bestehende Suite unverändert. Details: `UPDATE_V3_3_PREDICTION_ENGINE_DE.md`.

## V3.2.0 – NBA Stars Optimizer 2.1

- Einstellbare Lineup Diversity: 1 / 2 (Standard) / 3 andere Spieler.
- Echte Überlappungsbeschränkung im NBA-DP-Optimizer und Pairwise-Prüfung der Profilvarianten.
- Stärkere Safe- und Ceiling-Strategieziele mit 90-%-Qualitätsgrenze für Alternativen.
- Direkte Anzeige von Prognoseverlust, erreichten Spielerwechseln und möglichen Abweichungswarnungen.
- Keine Änderungen am Fußball-Optimizer oder an manuellen Teams. Siehe `UPDATE_V3_2_NBA_STARS_DIVERSITY_DE.md`.

## V3.1.1 — Vercel TypeScript Build-Fix

- Behebt einen `Cannot find name 'p'`-Fehler in `app/components/arcade-dashboard.tsx` (Zeile 515), indem der Player-Reuse-Zähler die gültige Schleifenvariable `pick` verwendet.
- NBA Stars Optimizer 2.0, Fußballfunktionen und vorhandene Nutzerdaten sind unverändert.
- Regressionstest prüft den korrekten Zugriff auf die Team-Nutzungszählung.

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

## 3.6.0 – Daily Mission Assistant
- Fußball: Entscheidender-Spieler-Picker, getrennte Listen für Feldspieler und Torhüter; transparente Bewertung ohne vorgetäuschte Ereigniswahrscheinlichkeiten.
- NBA: Daily Picker Classic mit offizieller L10+7-Punkte-Regel und 20-Managerpunkte-Untergrenze, Prognoseabstand und historischen Treffern.
- Berlin-Zeitraum Heute/Morgen sowie NBA +24h, verifizierte Startzeiten, Besitzfilter und Ausschluss bestätigter Ausfälle.
- Kompakte Builder-Integration ohne fünften Haupt-Tab; zusätzliche Tests; Upstash optional wie bisher.

### V4.4.0 – Separate Prediction Learning Engines (NBA / Football)
- Neon PostgreSQL-Snapshots mit unveränderlichen V3-PP-/Q80-Werten vor Spielbeginn.
- Automatische Sorare-FINAL-Abgleiche, strikte Sporttrennung und zeitlich getrennte Holdout-Kalibrierung.
- Eigene sportweite PP- und Q80-Offsets; Aktivierung nur nach bestandenem Test und Freigabe.
- NBA 3PM/3PA mit verifizierter Zuordnung zu Sorare-FINAL; historische Dreiertrends werden ohne Lookahead für zukünftige Modelle vorbereitet.
- 20 gesicherte tägliche Vercel-Cronjobs, separates V4.4-Dashboard und unveränderter Basisbetrieb ohne Datenbank.
- Einrichtung: UPDATE_V4_4_0_LEARNING_ENGINE_DE.md
