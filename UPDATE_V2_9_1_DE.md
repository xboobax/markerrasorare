# Markerras Sorare Helper V2.9.1 – Daily Matchday & Pool Sorting

Basiert auf deiner funktionierenden **V2.9** (nicht auf V2.8.3).

## Neu

- Der **Neon Lineup Builder Pro** startet in NBA und Fußball mit **Zeithorizont → Heute spielen (Berlin)**. Der Kalendertag richtet sich nach `Europe/Berlin` (MEZ/MESZ), nicht nach UTC oder einem rollenden 24-Stunden-Fenster. Auch **Morgen spielen** kann gewählt werden. Die bisherigen Zeiträume bleiben erhalten.
- Fußball: Nur Spieler mit einer von Sorare gelieferten, datierten Begegnung (beide Mannschaften bekannt). NBA: Nur Spieler, deren Mannschaft laut geladenem NBA-Spielplan an diesem deutschen Kalendertag eine Begegnung hat. **Ohne Spielplan werden keine Spiele geraten**.
- Gilt für sichtbaren Spielerpool, neue manuelle Spielerauswahl, Smart Auto-Fill und Quick Swap. **Gespeicherte Teams bleiben unangetastet**; die Oberfläche warnt, falls bereits eingesetzte Spieler außerhalb des Filters liegen.
- Neues Sortieren nach **Ceiling**, **Floor**, **Upside (Ceiling minus Prognose)**, **L10** und **Nächstes Spiel**. Vorhandene Sortierungen bleiben verfügbar. Richtung umkehrbar. Floor/Ceiling beziehen die modellierte Einsatzwahrscheinlichkeit ein, so wie es die Tabelle bereits anzeigt. Fehlende Daten werden immer hinten sortiert.
- Der Tag wird während geöffneter App minütlich aktualisiert und wechselt bei Mitternacht automatisch.

**Wichtig:** Ein angesetztes Spiel garantiert weder Spielminuten noch Sorare-Teilnahme. Verletzungs- und Einsatzstatus bitte zusätzlich prüfen. Der NBA-Spielplan ist ein separater Datenfeed und keine bestätigte Sorare-Gameweek-Deadline.

## Installation mit GitHub Desktop

1. Falls du auf der funktionierenden V2.9 bist, **kleine Update-ZIP** entpacken.
2. In GitHub Desktop `markerrasorare` öffnen, möglichst vorher einen neuen Branch `v2-9-1-matchday-pool` erstellen.
3. `Repository → Show in Explorer` öffnen.
4. **Inhalt** des ausgepackten `markerrasorare-main`-Ordners in den bestehenden Projektordner kopieren (gleichnamige Dateien ersetzen).
5. Commit `Add today matchday filter and player pool sorting V2.9.1` und **Publish branch** oder **Push origin**.
6. Bei Vercel Preview prüfen, ob NBA/Football den deutschen Kalendertag anzeigen und Spielerpool/Auto-Fill der Filterauswahl folgen. Danach optional in `main` übernehmen.

Keine neuen Vercel-Umgebungsvariablen. Login/OAuth, Sorare-Kartensync, Fußball Captain +50 %, NBA ohne Captain, Sternelimit und Scores sind unberührt.

## Prüfung

`npm run test:arcade` durchlaufen, inklusive `v291-matchday-sort.test.js`. React/TSX-Syntax von `builder-workspace.tsx` mit TypeScript-Parser geprüft. Vollständiger Next.js-Produktionsbuild kann nur mit installierten Projekt-Abhängigkeiten ausgeführt werden; deshalb Vercel Preview testen.
