# V4.5.1 – Datenbankdiagnose (read-only)

## Zweck
Vorherige V4.5-Cronjobs haben in Neon prognostizierte und abgeschlossene Spielerleistungen gespeichert, während beide öffentlichen Lern-APIs Nullbestände meldeten. Dieses Update enthält **keine Änderung an Cronjobs, Datenbankschema, Modellkalibrierung oder Spielerprognosen**, sondern genau einen neuen Diagnoseendpunkt.

## Verwendung
1. Alle Projektdateien nach GitHub übertragen und über Vercel Production deployen.
2. `https://DEINE-DOMAIN/api/learning-diagnostics` öffnen.
3. Werte `counts`, `latestJobAt`, `connection.databaseInUrl` und `connection.schema` kontrollieren.
4. Bei Nullbeständen auf der Website, aber positiven Beständen im Neon SQL Editor: Produktions-Datenbankverbindung und Neon-Branch prüfen; **keine Datensätze löschen**.

Die Antwort zeigt ausschließlich zusammengefasste Zähler und einen verkürzten SHA-256-Fingerabdruck der Verbindungsadresse **ohne Passwort**. Es werden keine Spielerdaten oder Zugangsdaten geliefert. Der Endpunkt kann nach Diagnose wieder entfernt werden.

## Vergleich in Neon
```sql
SELECT current_database() AS datenbank,
       current_schema() AS schema,
       (SELECT count(*) FROM learning_v44_snapshots WHERE sport='nba') AS nba_prognosen,
       (SELECT count(*) FROM learning_v44_snapshots WHERE sport='football') AS fussball_prognosen,
       (SELECT count(*) FROM learning_v45_player_performances WHERE sport='nba') AS nba_leistungen,
       (SELECT count(*) FROM learning_v44_jobs) AS jobprotokolle;
```
