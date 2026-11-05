# V4.5.2 – Konsistente Learning-Auswertungen

## Fehlerbild
V4.5.1-Diagnose lieferte `220` NBA-, `720` Fußball-Prognosen und `137` NBA-Spielerleistungen aus derselben Production-Datenbank, während die früher aufgerufenen Lern-APIs Nullbestände lieferten.

## Änderungen
- Learning-API-Abfragen werden serverseitig mit `Cache-Control: private, no-store` und `fetchCache=force-no-store` beantwortet.
- Die lesenden Neon-Abfragen erhalten explizit `cache: no-store`.
- Für die **zwei fest vorgegebenen** Sportarten verwenden die Lesepfade vollständig statische SQL-Sportbedingungen statt dynamischer `$1`-Bindung. **Keine SQL-Eingaben aus URL-Strings**; Ungültige Werte werden zurückgewiesen.
- Die Diagnose gibt zusätzlich `parameterReadCheck` aus. Dieses Feld vergleicht parametrisierte Neon-Leseabfragen mit den bereits funktionierenden statischen Kontrollabfragen. `consistent: false` identifiziert eine Abweichung. Der genaue Grund ist ohne Produktionstest nicht bewiesen.
- **Schreibvorgänge, gespeicherte Daten, Cronjobs und Modelle sind unverändert.**

## Test nach Deployment
1. `https://DEINE-DOMAIN/api/learning-diagnostics` öffnen; `counts` und `parameterReadCheck` vergleichen.
2. `https://DEINE-DOMAIN/api/learning-v44?sport=nba` – `summary.total` sollte mit `counts.nbaSnapshots` übereinstimmen.
3. `https://DEINE-DOMAIN/api/learning-v45?sport=nba` – `summary.total` sollte mit `counts.nbaPerformances` übereinstimmen.
4. Bei weiterem Unterschied JSON und HTTP-Status sichern; Neon-Schema **nicht** erneut ausführen.

Keine neuen Umgebungsvariablen oder SQL-Migration nötig. `V44_AUTO_PROMOTE=false` beibehalten.
