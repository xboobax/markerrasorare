# V4.5.3 – Ergebnis-Reifeprüfung und faire Reconciliation

## Ausgangslage (5. November 2026)
- `/api/learning-v44?sport=nba`: 220 gespeicherte Prognosen, 220 pending, 0 offizielle Scores.
- `/api/learning-v45?sport=nba`: 137 ESPN-Spielerstatistiken aus 6 Spielen.
- `/api/learning-diagnostics`: konsistente Neon-Datenbank-Leseabfragen.
- `v44Pending` prüft absichtlich nur Spieltage vor `CURRENT_DATE`; neue oder zukünftige Prognosen sind nicht automatisch fällig.

## Behobene Engstelle
Bisher wurden nur die ersten 60 Pending-Snapshots *vor* der Shard-Zuordnung abgefragt. Bei dauerhaft unbestätigten Spielern konnten weitere Datensätze nicht geprüft werden.

Jetzt werden bis zu 1.000 fällige Snapshots mit stabilem Sortierschlüssel geladen. Danach gruppiert der Code pro Shard nach Spieler und prüft eine täglich wechselnde Seite von bis zu 24 Spielern. Eine neue Variante von Sorare-Scores wird **nicht** angenommen oder erfunden. Die Reconciliation bleibt am offiziellen `FINAL`-Status orientiert.

## Diagnose erweitert – kein SQL-Schema nötig
Nach dem Deployment `GET /api/learning-diagnostics` aufrufen und `learningReadiness` beachten:
- `databaseToday`: Das von PostgreSQL verwendete Datum.
- `bySport[].readyForReconciliation`: Prognosen, deren Spieltag bereits vor `CURRENT_DATE` liegt und die innerhalb der letzten 90 Tage sind.
- `bySport[].fixtureToday` und `fixtureFuture`: noch nicht für diesen täglichen Job fällige Prognosen.
- `fixtureDays`: aggregierte tägliche Snapshots und bestätigte Sorare-Ergebnisse, keine Spieler-/Kartendetails.

Die ESPN-Performance-Daten bleiben unabhängig von offiziellen Sorare-Scores. Kein automatisches Training, keine zusätzlichen Env-Variablen, keine SQL-Migration, kein geänderter Cronplan und keine kostenpflichtigen Datenquellen.

## Sicherheit
- Produktive Daten werden nicht gelöscht oder rückwirkend überschrieben.
- Zur Wahrung der strikten FINAL-Prüfung werden Ergebnisse für den aktuellen Spieltag erst nach Datumswechsel betrachtet.
- `V44_AUTO_PROMOTE=false` belassen.

## Nach Deployment
1. `/api/learning-diagnostics` lesen und `learningReadiness` kopieren.
2. Erst wenn `readyForReconciliation` > 0 ist, ist ein `checked` > 0 beim Ergebnis-Cron plausibel (abhängig vom Shard und der tägliche Seitenrotation).
3. Bei offiziellen Ergebnissen muss `eligible` erst dann steigen, wenn Spieler-ID, Datum, FINAL-Status, Score und Vor-Spiel-Zeitstempel eindeutig stimmen.
