# MarkErras Sorare Dream V4.5.7 – Football Live: Sorare-Scores und Porträts

## Konkret behobene Probleme

- Der in V4.5.6 verwendete Query-Aufruf `so5Fixture(sport: FOOTBALL)` auf dem GraphQL-Root ist veraltet. Die neue Spielsuche nutzt `competitionGames(fromDate:, toDate:, sport: FOOTBALL)` aus dem aktuellen öffentlichen GraphQL-Schema. Nur bei eindeutiger Team-/Anstoßzeit-Zuordnung werden Spielerdaten aus `football.game(id:)` geladen.
- Die offiziellen Sorare-Score-Felder werden aus `playerGameScores` und die verfügbaren Porträts aus `players.pictureUrl(derivative: "avatar")` des **selben verifizierten Spiels** geladen.
- In der Spielfeld- und Tabellenansicht liegen echte Fotos jetzt vor den Initialen und werden nicht mehr als eigene zweite Grid-Zeile angeordnet. Bei defektem Sorare-Foto wird das ESPN-Foto versucht, danach ein Initialen-Platzhalter.
- Namensabgleich unterstützt eindeutige Kurzformen (z. B. „A. Prass“ ↔ „Alexander Prass“), ohne bei doppelten Namen fremde Daten zu zeigen.
- Die kompakte Sorare-Statuszeile zeigt jetzt die Anzahl der **tatsächlich** zugeordneten offiziellen Scores und Fotos.

## Sicherheit & Grenzen

Der Code wurde statisch und mit vorhandenen Football-Tests geprüft. Eine Anfrage mit **deiner** Sorare-OAuth-Sitzung konnte hier nicht ausgeführt werden: Erst nach Deployment lässt sich prüfen, wie viele Spieler Sorare für die konkreten Spiele wirklich mit Scores/Fotos abdeckt.

Eine 100%-Bildabdeckung kann aus kostenlosen ESPN-/Sorare-Quellen nicht garantiert werden; fehlende oder ungültige Bilder zeigen Initialen. Ebenso werden keine modellbasierten Ersatzpunkte als Sorare-PS ausgegeben. Das Paket ändert keine SQL-Tabellen, keine Jobs und keine bestehenden Prognosemodelle.

## Deployment

ZIP entpacken → im bestehenden GitHub-Repository die Projektdateien ersetzen → erfolgreichen Vercel-Production-Build abwarten. Anschließend im Football Live Match Center ein laufendes oder abgeschlossenes Spiel öffnen und die kleine Sorare-Statuszeile sowie die Zuordnung in der Boxscore-Tabelle prüfen.
