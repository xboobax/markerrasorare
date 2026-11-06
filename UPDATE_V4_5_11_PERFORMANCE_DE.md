# MarkErras Sorare Dream V4.5.11 – Performance & Karten-Sync

## Was sich ändert

- **Meine Sammlung** nutzt eine eigenständige, schlanke Seite. Sie lädt nicht länger die gesamte Builder-Oberfläche, Spielerprognosen, Optimierer oder Scouting-Daten, nur um den Kartensync zu starten.
- **Sorare-Kartensync** versucht standardmäßig **100 statt 50 Karten pro API-Seite**. Meldet Sorare eine Seitenbegrenzung oder Komplexitätsgrenze, wechselt der Sync zur bewährten 50er-Paginierung und bleibt dabei für alle folgenden Seiten. Dies ist **kein paralleler Massenabruf**.
- **Weniger Leerlauf beim Sync**: Für die ersten 13 Seiten gibt es keine künstliche Wartezeit; erst sehr große Sammlungen werden vorsichtig verzögert. Vorhandener 429-/Retry-After-Schutz bleibt erhalten.
- **Fortschritt sichtbar**: Nach abgeschlossenem Sync wird die tatsächliche Laufzeit angezeigt.
- **Builder, Player Database, Daily Missions und Analytics** laden unabhängige Datenfeeds jetzt gleichzeitig mit den Vereinskadern, nicht erst nach allen Kadern.
- **Testhygiene**: Der komplette bereits vorhandene Core-Testlauf wurde korrigiert, ohne Fachlogik zu ändern; zusätzlicher Performance-Regressionscheck.

## Unverändert

- Offizielle Sorare-Sammlung, Kartenboni, aktives Football Set, Sortierung und Spielerbesitz werden weiterhin vollständig und mit bestehenden Prüfungen verarbeitet.
- Fehlerhafte und unvollständige Sorare-Antworten ersetzen niemals den alten, bestätigten Bestand.
- Alle bestehenden Prognosemodelle, Cronjobs, Football-/NBA-Live-Funktionen, Neon-Datenbank und OAuth-Verbindung bleiben unverändert.
- Keine SQL-Migration, keine kostenpflichtigen Dienste und keine neue Umgebungsvariable.

## Deployment

ZIP entpacken, Dateien im bestehenden GitHub-Repository ersetzen und in Vercel den Production-Build kontrollieren. **Vercel-Cache darf bestehen bleiben.**

Nach **Ready** auf **Sammlung** gehen und die Dauer eines vollständigen Syncs ablesen. Den **ersten vollständigen Sync** bitte nicht mit dem schnelleren erneuten Öffnen während der 15-Minuten-Sitzungsbestätigung verwechseln.

**Wichtiger Hinweis:** Die Optimierungen wurden lokal mit Tests und Syntaxprüfung verifiziert; der endgültige Next.js-Vercel-Build und Live-Geschwindigkeit sind ohne produktive Sorare-Verbindung noch nicht bestätigt. Sorare beschränkt authentifizierte Anfragen; große Sammlungen bleiben durch die Anbieterlimits zeitlich begrenzt.

## Tests

- `npm run test:arcade`
- `npm run test:football-live-v4510`
- `npm run test:performance-v4511`
- `npm run check:syntax`
