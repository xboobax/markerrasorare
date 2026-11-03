# Markerras Sorare Helper V1.6.2 – Fußball-Scores repariert

## Was war falsch?
Das bisherige `lib/sorare.ts` fragt die nicht mehr vorhandenen Player-Felder
`lastFiveSo5AverageScore` und `lastTenPlayedSo5AverageScore` ab. Durch die
Schema-Fallbacks blieben oft nur Stammdaten und eine ggf. leere Projektion.
Das führte bei LaLiga, Ligue 1 und Premier League zu `0,0` bzw. fehlenden Scores.

## Was ist geändert?
- Nur die **Fußball**-Kader-Scoring-Abfragen verwenden jetzt echte Sorare-Felder:
  `rawPlayerGameScores(last: 10)`, `averageScore(type: LAST_FIVE_SO5_AVERAGE_SCORE)`
  und `averageScore(type: LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)`.
- Die Feldaliasnamen `averageL5` und `averageL10` fließen in die vorhandene Prognose ein.
- Fußball-Kader werden in kleineren Seiten von 40 Spielern geladen. Pagination
  bleibt enthalten; damit ist das Risiko zu komplexer GraphQL-Abfragen geringer.
- Bei Query-Komplexitätsproblemen kann auf eine kleinere Feldmenge gewechselt werden.
- NBA, Spielerbilder, Spielersuche, Lineup Builder und das Design sind unverändert.
- Die V1.7-Arbeit an automatischem Prognose-Tracking wurde NICHT begonnen bzw. nicht integriert.

## Installation
1. Das komplette ZIP entpacken.
2. In GitHub Desktop das Repository `markerrasorare` öffnen und einen neuen
   Branch `hotfix-fussball-scores-v162` erstellen.
3. **Repository → Show in Explorer** und den entpackten Projektinhalt
   in den Repositoryordner kopieren; gleichnamige Dateien ersetzen.
   `.git` nicht löschen, `.env*` nicht öffentlich hochladen.
4. Commit Summary `Fix Football Scores V1.6.2` und **Publish branch**.
5. Vercel-Preview in jeder Liga testen: LaLiga, Ligue 1, Premier League,
   Bundesliga. Unbedingt Spielernamen, L5/L10, Score-Prognosen sowie NBA-Bilder testen.
6. Erst bei erfolgreichem Preview den Branch nach `main` mergen.

## Transparenz
Der Fix entspricht den dokumentierten Feldern des öffentlich abrufbaren
Sorare-GraphQL-Schemas. Hier konnten automatisierte Tests, aber kein echter
Produktionsabruf mit deinem API-Key durchgeführt werden. Ein vollständiger
Next.js-Build benötigt die Abhängigkeiten von `npm install` und ist auf Vercel
noch zu prüfen.
