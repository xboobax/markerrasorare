# V4.5.6 – Football Live Match Center Pro

## Zweck
Das Football Live Match Center erhält eine kompakte horizontale Spielfeldansicht nach den vom Nutzer bereitgestellten SoProB-Referenzen, ohne das restliche dunkle Neon-Builder-Pro-Design zu verändern.

## Änderungen
- **Taktische Startelf:** Die beiden Mannschaften werden spiegelverkehrt auf einer horizontalen Spielfeldansicht dargestellt. Spieler werden nur dann an Formation-Plätzen angezeigt, wenn ESPN **alle elf** Starter, die Teamformation und die eindeutigen `formationPlace`-Werte bereitstellt. Positionen werden nicht geraten. Bei unbestätigter Formation zeigt das Feld einen Hinweis und die vollständige Spieler-/Bankliste bleibt verfügbar.
- **Spielerbilder:** Zuerst explizit gemeldete ESPN-Bilder, danach das ESPN-CDN anhand der bestätigten ESPN-Spieler-ID; bei einem fehlenden/fehlerhaften Bild erscheint ein neutraler Namensinitialen-Platzhalter. Bildverfügbarkeit ist von ESPN abhängig; 100 % vollständige Fotos können nicht garantiert werden.
- **Spielminuten:** Angegebene ESPN-Minuten werden bevorzugt. Wenn diese fehlen, werden die Minuten ausschließlich bei beobachtbaren Startelf-/Einwechslungsdaten und einer verfügbaren Matchuhr berechnet und mit `~` gekennzeichnet. Fehlende Einsatzzeiten bleiben `–`. Es werden keine geschätzten Minuten in das Performance-Archiv geschrieben.
- **Sorare Live PS:** Neuer read-only Endpunkt `/api/football-live/sorare-scores?event=ESPN_EVENT_ID&league=ESPN_LEAGUE_KEY` via bestehender Sorare-OAuth-Session und der offiziellen GraphQL-API. Zuerst wird das ESPN-Spiel vom Server geprüft, dann ein eindeutiger Sorare-Spielabgleich mit beiden Teams und der Anstoßzeit durchgeführt. Ohne Sorare-Verbindung, eindeutigen Abgleich oder veröffentlichten Spieler-Score erscheint `–`, niemals eine ESPN-Schätzung als offizieller PS.
- **Score-Listen:** Beide Mannschaften behalten kompakte Tabellen mit Spielerbildern, ESPN-Minuten, optionalen PP/Q80-Modellprognosen und offiziellen Sorare-PS. Spielerpanel, Bank und Match-Ereignisse bleiben vorhanden.
- **Sicherheitsgrenzen:** Kein Token im Client; die Sorare-Anfragen verwenden die bestehende serverseitige OAuth-Session. Namensmehrdeutigkeiten werden nicht automatisch mit einem fremden PS verknüpft. Keine Tabellen-, Cron- oder Prognosemodell-Änderungen.

## Installation
1. Das gesamte ZIP entpacken.
2. Dateien in das bestehende GitHub-Repository übernehmen, ersetzen und committen.
3. In Vercel das neue **Production Deployment** prüfen.
4. Football Live Match Center öffnen, ein laufendes oder abgeschlossenes Spiel auswählen und prüfen, ob die Mannschaftsaufstellungen sowie die Score-Quelle angezeigt werden.

## Voraussetzungen und Grenzen
- Erfordert für **offizielle** Sorare-PS eine bereits konfigurierte, gültige **Sorare-OAuth-Verbindung** des Nutzers; kein zusätzliches kostenpflichtiges Abo oder neuer API-Schlüssel für diese Version eingeplant.
- Der offizielle Abgleich verwendet vorerst das aktuelle Sorare Classic-Fixture sowie die eigenen laufenden/rezenten Partien. Nicht alle Wettbewerbe oder Spiele müssen dort vorkommen. Nicht eindeutig zugeordnete Partien werden als nicht verfügbar markiert.
- Die kostenlose ESPN-Quelle liefert nicht für jedes Match exakte `formationPlace`, Minuten oder Spielerfotos. Das UI kennzeichnet solche Lücken ausdrücklich.
- Die Route ist implementiert und lokal syntax-/kerngetestet; ein erfolgreicher Live-Sorare-API-Abruf kann erst nach dem Deployment unter realer Nutzer-Session bestätigt werden.
- Nutzerdefinierte Vorhersagen, 940 gespeicherte Snapshots, NBA-Learning, Fußball-Backfill und vorhandene Vercel-Cronjobs bleiben unangetastet.

## Prüfung
`npm run check:syntax` und `npm run test:football-live-v456`. In der isolierten Entwicklungsumgebung war kein vollständiger `next build` möglich, da benötigte Abhängigkeiten nicht installiert werden konnten.
