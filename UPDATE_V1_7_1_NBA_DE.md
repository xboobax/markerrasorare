# Markerras Sorare Helper V1.7.1 – NBA L5/Ø-Score Fix

## Was war das Problem?

Die NBA-Kaderabfrage in V1.7 enthielt Fußball-spezifische/optionale Felder
(`rawPlayerGameScores`, `activeInjuries`, `nextGame`). Schlägt eines dieser
Felder bei Sorare fehl, konnte die Rückfalllogik die gesamte NBA-Abfrage
auf reine Spielerstammdaten zurücksetzen. In der Tabelle fehlten dadurch
L5 und Durchschnittsscore.

## Korrektur

- NBA-Kader fordern zuerst die Felder `lastFiveSo5AverageScore` und
  `lastTenPlayedSo5AverageScore` an, mit Bild und optionaler Projektion.
- Falls Sorare ein Projektionsfeld nicht unterstützt, wird die Abfrage
  ohne dieses Feld wiederholt und behält die historischen Score-Daten.
- `seasonAverage` ist ein letzter statistischer Fallback, wenn die
  detaillierten NBA-Durchschnittsfelder nicht verfügbar sind.
- Nur die Sorare-Datenadapter-Datei `lib/sorare.ts` ist inhaltlich geändert;
  die Fußball-Abfragen sind unverändert.
- Spieler ohne verfügbare historische Score-Daten zeigen weiterhin einen
  Strich, statt erfundene Werte zu erhalten.

## Installation (nur der kleine Fix)

1. Das ZIP `markerras-v1.7.1-nur-nba-fix.zip` entpacken.
2. GitHub Desktop öffnen und das Repository `xboobax/markerrasorare` auswählen.
3. Einen Branch `fix-nba-l5-v171` erstellen.
4. **Repository -> Show in Explorer** öffnen.
5. Den Ordner `lib` aus diesem ZIP in den Projektordner kopieren und
   die darin enthaltene Datei `sorare.ts` ersetzen.
6. Commit Summary: `Fix NBA L5 und Durchschnitt V1.7.1`.
7. Commit -> Publish branch; das Vercel-Preview mit mehreren NBA-Spielern prüfen.
8. Erst nach erfolgreichem Test den Branch nach `main` übernehmen.

Die Variablen `SORARE_API_KEY` und `BALLDONTLIE_API_KEY` sind getrennt.
Der BALLDONTLIE-Schlüssel wird für die Sorare-L5-Werte nicht benötigt.

## Verifikation und Grenzen

13 automatisierte Testgruppen bestanden inklusive Tests, dass eine
Projektion-Schemaabweichung die NBA-L5-/L10-Werte nicht mehr entfernt.
Keine Live-Sorare-API-Abfragen möglich: Spielerwerte und vollständiger
Next.js/Vercel-Build müssen im Vercel-Preview geprüft werden.
