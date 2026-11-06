# V4.5.16.1.2 – Fehlende Einsatzminuten korrekt behandeln

## Gemeldetes Problem

Neon meldet für Alexander Isak 11 ESPN-Partien, aber 0 Partien mit einem bekannten Minutenwert. Mehrere andere Spieler sind ebenso betroffen. In V4.5.16.1.1 hat das Spielerprofil bei `minutes = NULL` fälschlich 0 angezeigt.

## Änderung

- `Minuten · Matchstats` zeigt `—`, wenn sämtliche Spieler-Zeitwerte der ausgewählten Datenquelle unbekannt sind.
- `Minuten · Sorare` zeigt eine **separate** Summe der offiziell importierten `minsPlayed`-Angaben aus FINAL-Scores. Es sind andere Partien möglich; die Werte dürfen nicht mit ESPN-Tor-/Assist-Summen als gemeinsame Pro-90-Stichprobe verrechnet werden.
- ESPN-Parsing nimmt explizite Minutennamen aus der Spieleinzelansicht auf, wenn vorhanden. Kein Rückschluss aus Starter-Status, Ergebnis oder Spielzeit.
- `/api/football-stats/status` zeigt `sourceStats[].with_minutes` und `officialScores.with_minutes`.
- Keine Datenbankmigration; keine Änderung an Prognosen, Optimizern, Sorare-Scores oder gespeicherten ESPN-Leistungen.

## Installation

Komplettes ZIP nach GitHub übertragen und nach einem erfolgreichen Vercel-Deployment einen Spieler öffnen. Kein SQL erforderlich.

Zur Kontrolle über `/api/football-stats/status` prüfen, wie viele Datensätze bereits tatsächliche Minuten besitzen. Die aktuelle Bestandsdatenbank wird **nicht** automatisch repariert. Gegebenenfalls müssen historische ESPN-Spiele noch einmal kontrolliert importiert werden; auch dann bleiben fehlende Quellwerte `NULL`. Für eine vollständige Abdeckung aller Spieler benötigt das Projekt eine zuverlässig verfügbare und rechtlich nutzbare zusätzliche Minutenquelle.

## Getestet

Fachtests einschließlich V4.5.16.1.2-Test, Syntaxprüfung. Next.js-Vercel-Produktionsbuild nicht lokal bestätigt, da Next.js-Abhängigkeiten in der Ausführungsumgebung fehlen.
