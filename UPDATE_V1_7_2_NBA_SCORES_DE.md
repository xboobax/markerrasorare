# V1.7.2 – NBA-Scores, L5 und Durchschnitt

## Ursache
Die V1.7.1 fragte auf `NBAPlayer` die nicht existierenden Felder `lastFiveSo5AverageScore` und `lastTenPlayedSo5AverageScore` ab und fiel dadurch bis auf reine Stammdaten zurück.

## Reparatur
- Stattdessen `averageScore(type: LAST_FIVE_SO5_AVERAGE_SCORE)` und `averageScore(type: LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)`.
- Ergänzt `rawPlayerGameScores(last: 10)` für die Formkurve, wenn verfügbar.
- Kleinere NBA-Abfrageblöcke (20 Spieler je Kader-Seite) zur Senkung der Abfragekomplexität.
- Optionale Prognosefelder werden bei Abfragefehlern weggelassen, ohne L5/L10 zu verwerfen.
- Die Fußball-Abfrage, Fotos und Lineup-Builder bleiben unberührt.

## Installation mit GitHub Desktop (empfohlen: kleiner Fix)
1. Vorher funktionierenden Stand auf GitHub behalten.
2. GitHub Desktop öffnen und Branch `fix-nba-scores-v172` erstellen.
3. `Repository → Show in Explorer` anklicken.
4. Datei `lib/sorare.ts` aus dem kleinen Fix in den gleichen Ordner des Repository kopieren und ersetzen.
5. Änderungen committen: `Fix NBA Scores L5 V1.7.2`.
6. Branch veröffentlichen und das Vercel Preview auf Lakers, Celtics und Nuggets prüfen. Die Seite sollte L5, Ø Score und historische Scores anzeigen.
7. Erst danach in main mergen.

**Wichtig:** Der echte Serverabruf wurde in dieser Umgebung nicht ausgeführt. Die Felder wurden gegen das offizielle Sorare GraphQL-Schema vom 3. November 2026 verifiziert; Tests verwenden kontrollierte API-Antworten. Eventuelle API-Limits können trotzdem Fehler verursachen.

Schema: https://api.sorare.com/graphql/schema
