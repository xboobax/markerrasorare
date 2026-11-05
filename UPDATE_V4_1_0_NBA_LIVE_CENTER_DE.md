# MarkErras Sorare Dream V4.1.0 – NBA Live Center (Preview)

## Neue Funktionen

- Schwarz-goldenes NBA Live Match Center unter `/match-center?sport=nba`.
- **Scoreboard** mit NBA-Logos, Datumsauswahl, Viertelstatus und Spielstand.
- **Play-by-Play** mit den jüngsten Spielaktionen, chronologisch von neu nach alt.
- **Starting Five**: nur bei tatsächlichem Starter-Flag des Datenfeeds; Court ist schematisch und zeigt keine echte Spielerposition.
- **Live-Boxscore**: Minuten, Punkte, Rebounds, Assists, Dreier, Steals, Blocks, Turnovers.
- **Sorare-Live-Basisscore** aus dem kumulierten Boxscore: PTS +1, REB +1,2, AST +1,5, BLK +3, STL +3, 3PM +1, TO −2, DD +1, TD +1 zusätzlich. Vorläufige Werte; Sorare-FINAL-Scores haben Vorrang. Spieler ohne verifizierte Einsatzzeit erhalten keinen erfundenen 0-Punkt-Score.
- **Spieler-Detailfenster** mit Statistik-Aufschlüsselung.
- **Meine Karten**: nur vollständig synchronisierte, auf diesem Gerät verifizierte NBA-Sammlung. Die Sammlung wird NICHT bei jedem Live-Refresh neu geladen.
- **Optional**: per Klick auf `PP/Q80 laden` eigene Prediction-Engine-3.0-Modellwerte für genau die beiden ausgewählten NBA-Teams nachladen. Diese Werte sind ein aktueller Abruf und NICHT zwingend vor Spielbeginn eingefroren. Wenn Sorare keine Modellwerte liefert, bleibt die Spalte leer.
- Football-Match-Center und bestehende V4.0.4 Funktionen bleiben unverändert.

## Datenquellen und Grenzen

- ESPN `site.api.espn.com` (Scoreboard/Summary): frei erreichbarer, aber **nicht offiziell unterstützter oder garantiert lizenzierter Drittanbieter-Feed**. Der Server kann Fehler, HTTP 403/429 oder Formatanpassungen melden. Die Produktionsverfügbarkeit und Nutzungsbedingungen vor dauerhaftem Betrieb prüfen. Keine ESPN-Inhalte als offizielle Sorare-Bestätigung ausgeben.
- Live-Punkte sind vorläufige Eigenberechnungen, nicht Sorares endgültige Scores. Karten-, Captain- und Wettbewerbsspezifika werden nicht in den **Basis**score eingerechnet.
- Spielerfotos/Logos werden nur angezeigt, wenn der Upstream gültige HTTPS-Bildlinks liefert.
- Die offizielle Starterstellung des ESPN-Feeds ist keine Echtzeit-Spieler-Tracking-Information.
- Datumsauswahl Europe/Berlin: ein ausgewählter lokaler Kalendertag lädt zwei US-Datumssichten, um Nachtspiele korrekt zuzuordnen.

## Performance

- **Kein zusätzlicher Sorare-Kaderabruf beim Öffnen des NBA Live Centers.** (Die vorherige Seite lud hier die gesamte Spielerbasis.)
- Scoreboard-Refresh: 60 Sekunden; Detailansicht live: 20 Sekunden; vor Start: 60 Sekunden; nach Final: keine regelmäßigen Detailabrufe.
- Kein Polling in verstecktem Browser-Tab; Wiederaufnahme beim Sichtbarwerden.
- Nur das ausgewählte Spiel erhält Detailabrufe; höchstens 80 sichtbare Play-by-Play-Einträge und maximal 180 gespeicherte.
- Vercel/Next.js Fetch-Revalidierung ca. 15–20 Sekunden, plus öffentliche HTTP-Cache-Header. Kein Upstash erforderlich.
- PP-/Q80-Daten sind **nicht Teil des automatischen Pollings**: extra, expliziter Button.

## Installation

1. Alte V4.0.4-Version sichern. Projektpaket vollständig in einen **separaten GitHub-Branch** übernehmen.
2. Auf Vercel als Preview deployen. Prüfen, dass alle Dateien `app/api/nba-live/...`, `lib/nba-live-*` und `features/matches/nba-live-center.tsx` vorhanden sind.
3. `/match-center?sport=nba` öffnen und ein laufendes NBA-Spiel auswählen; Scoreboard, Play-by-Play, Starter, Boxscore, Sorare-Basiswerte, Popup und Datumsauswahl prüfen.
4. `PP/Q80 laden` testweise öffnen; die Werte sind aktuelle Modellergebnisse, keine historischen, eingefrorenen Pregame-Snapshots.
5. Nach Spielende die vorläufigen Scores mit Sorare-FINAL vergleichen. Vor Übernahme als Hauptversion einen erfolgreichen vollständigen Vercel-Build und Browser-Tests verlangen.

## Lokale Prüfungen

`npm run test:arcade`, `npm run check:domain`, `npm run check:syntax`.

**Hinweis:** Ein vollständiger Next.js-Produktionsbuild erfordert installierte `next`, `react` und `react-dom` Dependencies. Falls diese lokal nicht vorhanden sind, ist dies explizit zu melden und der Vercel-Preview-Build abzuwarten.
