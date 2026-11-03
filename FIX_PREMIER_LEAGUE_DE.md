# Markerras Sorare Helper V1.1.1 – Premier-League-Fix

## Ursache

In der Sorare-Datenquelle wird die englische Premier League u. a. **English League Players** genannt. Der Filter in V1.1 erkannte diese Bezeichnung nicht. Deshalb wurden Premier-League-Vereine vor der Spielersuche aussortiert.

## Änderung

- `lib/leagues.ts`: **English League Players** und bekannte Premier-League-Aliase werden intern auf `Premier League` abgebildet.
- `lib/sorare.ts`: Fußball-Vereinsliste wird für bis zu 15 Minuten statt 60 Minuten zwischengespeichert.
- `app/page.tsx`: Gibt einen Hinweis aus, wenn ein Ligaabruf keine Vereine liefert.
- `tests/leagues.test.js` und `tests/football-clubs.test.js`: Regressionstests für englische Teams und Ausschluss von Serie A/Championship.
- Alle übrigen drei Ligen und NBA bleiben unverändert.

## Update über GitHub Desktop

1. ZIP entpacken.
2. In GitHub Desktop `xboobax/markerrasorare` öffnen und zur Sicherheit neuen Branch `premier-league-fix` erstellen.
3. **Repository → Show in Explorer** klicken.
4. Den **Inhalt** des entpackten Ordners `markerrasorare-main` in den lokalen Repository-Ordner kopieren. Dateien ersetzen, niemals den versteckten `.git`-Ordner löschen.
5. In GitHub Desktop: Commit Summary `Fix Premier League Spielerfilter` → **Commit** → **Publish branch**.
6. Vercel-Preview prüfen: Fußball → Premier League. Vereine und Spieler sollten geladen werden.
7. Nach erfolgreichem Preview auf GitHub Pull Request nach `main` erstellen und mergen.

**Hinweis:** Tests verwenden Testdaten. Die tatsächliche Sorare-API ist von hier nicht live abgefragt worden. Falls der API-Abruf weiterhin keine Premier-League-Vereine liefert, die Angaben zur Zahl geladener Teams auf der Seite prüfen.
