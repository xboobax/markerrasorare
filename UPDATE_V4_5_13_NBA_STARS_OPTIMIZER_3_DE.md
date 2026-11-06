# MarkErras Sorare Dream V4.5.13 – NBA Stars Optimizer 3.0

Der bisherige Stars Optimizer 2.1 wurde im **bestehenden** Bereich ersetzt (kein zweites Menü).

## Neu
- Strikter Matchday-Filter über verifizierten NBA-Spielplan. Standard: **nächste 24 Stunden** mit exakter Anstoßzeit. Weitere Filter: **Heute**, **Morgen** (deutsche Zeit), **nächste 7 Tage** (Spielplan, ausdrücklich keine verifizierte Sorare-Gameweek).
- Kein Match ohne belastbare Spielplan-/Vereinszuordnung. Fehlende Spielplan-/Anstoßdaten führen zu einer leeren Auswahl statt spekulativen Picks.
- NBA Champion (16 ★) oder Contender (11 ★). Die Sternegrenze wird in der DP-Optimierung tatsächlich durchgesetzt, nicht nur in der Darstellung.
- Alle vier vorhandenen Strategien (Max Points, Value, Safety, Ceiling) und echte Diversity 1/2/3 bleiben erhalten.
- OUT-Status wird ausgeschlossen. Unsicherheiten ohne OFFIZIELLE Verletztenbestätigung bleiben als Risiko, nicht als garantierter Einsatz. Bestehende Forecast-Risikoabschläge gelten weiter.
- **Lineup übernehmen**: Fünf Spieler werden komplett in den manuellen Builder übertragen; vor der Übergabe erneute Prüfung von Spieltermin, Verletzungsstatus und 11/16-Sternegrenze. Ein freies Team wird bevorzugt; bestehende Teams werden ohne Rückfrage nicht überschrieben. Der manuelle Builder unterstützt weiterhin Undo.
- Keine direkte Sorare-Einreichung: der Klick übernimmt das Lineup ausschließlich in den lokalen manuellen Builder.
- Browseruhr aktualisiert Matchday alle 5 Minuten; vor jeder Übernahme erfolgt eine frische Zeitprüfung.

## Grenzen
- Der NBA-Spielplan ersetzt nicht Sorare-Gameweek-Daten. Das 7-Tage-Fenster ist ausdrücklich nur ein NBA-Spielplan-Fenster.
- Automatische Verletzungs-Meldungen hängen von der Verfügbarkeit der kostenlosen Datenquelle ab. Unbekannt ist nicht „fit“.
- Der manuelle Builder verwendet nach der Übertragung weiterhin seinen bisherigen allgemeinen NBA-Regelmodus. Bei einem Contender-Team gilt die 11-★-Grenze für die Optimierung **und für den ursprünglichen Transfer**; Änderungen danach müssen vor der Sorare-Einreichung erneut geprüft werden.
- Kein aktueller NBA-Spielplan bedeutet: keine neuen automatischen NBA-Lineups.

## Installation
ZIP entpacken und den Inhalt von `markerras-sorare-dream` wie gewohnt im GitHub-Repository übernehmen. Vercel-Deployment erstellen. Keine neuen SQL-Tabellen, Secrets oder Cronjobs erforderlich.

## Lokale Tests
`npm run test:arcade` sowie `npm run check:syntax` erfolgreich. Ein vollständiger Next.js-Produktionsbuild konnte mangels erreichbarer npm-Registry in der Testumgebung nicht ausgeführt werden. Bitte Vercel-Build prüfen.
