# Markerras Sorare Helper V1.6.1 – Spielerbilder-Fix

Diese Version ist ein **gezieltes Fehlerbehebungs-Update** auf Basis von V1.6.

## Ursache und Korrektur

Die bisherigen Bildabfragen benutzten für NBA `pictureUrl`. Dieses Feld gehört laut aktuellem Sorare-GraphQL-Schema nicht zu `NBAPlayer`. Dadurch schlugen GraphQL-Abfragen fehl und die App musste auf eine Datenabfrage ohne Bilder ausweichen. Bei Fußball konnten die Bilder ebenfalls verloren gehen, wenn eine spätere Fallback-Abfrage keine Bildfelder mehr enthielt.

Ab V1.6.1 benutzt `lib/sorare.ts` für **beide Sportarten** das offiziell verfügbare Feld `avatarPictureUrl`. Es wird in **jeder Abfragestufe** angefordert. Ein eventuell defektes oder fehlendes Foto wird wie bisher durch Initialen ersetzt. Für einzelne Spieler ohne tatsächlich verfügbares Foto kann weiterhin ein Platzhalter erscheinen.

**Unverändert:** Prognoseformeln, historische Score-Abfragen, API-Key, Matchup-Daten, Spielersuche, manuelle/automatische Lineup Builder, NBA-16-Sterne-Limit, Fußball-4-Ligen-Filter und gespeicherte Aufstellungen.

## Test & Installation (GitHub Desktop)

1. ZIP entpacken. In GitHub Desktop `xboobax/markerrasorare` wählen, `Fetch origin`/`Pull origin` ausführen und als Sicherheitsmaßnahme einen neuen Branch `helper-v1-6-1-fotos` anlegen.
2. `Repository → Show in Explorer` öffnen. Die **Inhalte** von `markerrasorare-main` aus der ZIP in den geklonten Repo-Ordner kopieren und gleichnamige Dateien ersetzen. **Nicht** den `.git`-Ordner entfernen und keine `.env`-Zugangsdaten hochladen.
3. Änderungen prüfen; Commit-Nachricht `Fix: Sorare-Spielerbilder für Fußball und NBA` vergeben. Auf `Commit` und `Publish branch` klicken.
4. Vercel-**Preview** öffnen: `NBA` und `Fußball` durchsehen. Überprüfen, ob bei vorhandenen Bild-URLs echte Spielerfotos statt durchgehend Initialen erscheinen und ob die Sorare-Scores weiterhin geladen werden.
5. Erst nach erfolgreichem Preview den Branch per GitHub Pull Request nach `main` mergen.

## Kontrolle bei weiterhin fehlenden Fotos

- In der App auf die Kennzahl `Spielerbilder: X von Y` achten. Sie zählt vorhandene URL-Felder, nicht erfolgreich geladene Bilddateien.
- Ist **X = 0**, stammen die fehlenden Bilder wahrscheinlich weiterhin aus dem Sorare-Datenabruf. Deployment, Logs und Sorare-Abfragen prüfen.
- Ist **X > 0**, aber im Browser nur Initialen sichtbar, im Browser mit `F12` → `Network` → `Img` nach Statuscodes (`403`, `404` usw.) für Bild-URLs suchen. Das wäre ein separates CDN-/Bild-Host-Problem.
- Die echte Sorare-API und die ausgelieferten Fotos konnten in dieser Entwicklungsumgebung nicht end-to-end auf Vercel geprüft werden.

## Verifikation

Der Regressionstest `tests/v161-images.test.js` stellt sicher, dass beide Sportarten im Kader `avatarPictureUrl` anfragen, ohne die Score-Felder aufzugeben, und dass ein notwendiges Zurückfallen auf eine einfachere Abfrage die Bilder nicht mehr entfernt.
