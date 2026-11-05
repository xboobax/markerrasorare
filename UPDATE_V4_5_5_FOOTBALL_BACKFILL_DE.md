# V4.5.5 – Automatischer Fußball-Nachimport (ESPN FINAL)

## Ursache

V4.5.4 konnte in der Diagnose für den 3. November 2026 bei zwei von neun abgeschlossenen Champions-League-Spielen insgesamt 37 Spielerleistungen aus `rosters` interpretieren. Die bestehenden Cronjobs liefen bereits vor dem Parser-Update oder nur über die letzten zwei Kalendertage. Daher steht `/api/learning-v45?sport=football` noch auf `total: 0`.

## Änderungen

- Der bestehende tägliche Cron `playerstats&sport=football&batch=europe` berücksichtigt ab V4.5.5 die letzten fünf Berliner Kalendertage (heute und vier vergangene Tage), maximal 15 Scoreboard-Abfragen und 12 FINAL-Spielzusammenfassungen pro Ausführung.
- Vor dem Abruf werden bereits archivierte FINAL-Spiele mittels einer einzigen Neon-Abfrage erkannt und ausgelassen. Die verbliebenen Spiele werden **älteste zuerst** verarbeitet, damit ältere Spieltage nicht von neuen Spielen verdrängt werden.
- Fehler, fehlende Statistiken und unbearbeitete Spiele erscheinen getrennt in der Cron-Antwort und der Job-Meldung.
- Internationale und nationale Ligajobs bleiben auf dem bisherigen Zwei-Tage-Fenster; keine zusätzlichen Cron-Einträge oder Upstash-Abhängigkeiten.
- Die vorhandene Datenbanktabelle, die offizielle Sorare-Score-Abstimmung und das NBA-Modell bleiben unverändert. Archivierte ESPN-Daten werden **nicht** als echte Sorare-FINAL-Punkte für PP/Q80-Training verwendet.

## Installation und Prüfung

1. Projekt aus der ZIP im GitHub-Repository aktualisieren; über Vercel deployen.
2. Es ist **keine** SQL-Migration und **kein** zusätzlicher geheimer Schlüssel notwendig.
3. Nach dem nächsten täglich geplanten Europapokal-Cron (`13:16 UTC`, in Berlin am 6. November **14:16 MEZ**) `/api/learning-v45?sport=football` erneut prüfen. `summary.total` sollte größer werden, **sofern** die Datenquelle und die Datenbank erreichbar bleiben. Der Cron kann andernfalls Fehler/fehlende Daten melden.
4. Die Jobdiagnose steht über `/api/learning-v44?sport=football` bereit (Eintrag `v45:stats:football-europe`); dort `bereits archiviert`, `geprüft`, `Spielerstatistiken`, `offene Spiele` und `Feedfehler` betrachten.
5. Falls weiterhin 0: Cron in Vercel/Jobdiagnose auf Fehler prüfen. Eine `football-stats-diagnostics`-Antwort mit `archiveReady>0` beweist Parser-Verfügbarkeit, noch nicht die Ausführung der Cron-UPSERTs.

## Bekannte Grenzen

- Die tägliche Laufzeit und Abrufquoten sind begrenzt. Bei mehr als 12 unarchivierten FINAL-Spielen je Lauf werden verbliebene Spiele in folgenden Läufen priorisiert, solange sie noch im Fünf-Tage-Fenster liegen.
- Ein Spiel, dessen Provider keine interpretierbaren Spielerstatistiken liefert, wird nicht als archiviert markiert und bei späteren Läufen erneut versucht.
- Der ESPN-Player-ID-Abgleich mit der **Sorare-Sammlung** und Vereine-/Nationalteam-übergreifende Spieleridentität sind noch **nicht** abgesichert. Liga-, Europapokal- und internationale Wettbewerbsfeeds werden beobachtet, aber dies garantiert noch nicht die lückenlose Abdeckung **aller** Spieler aus den vier Ligen oder einen spielbereiten PP/Q80-Forecast für Nationalspiele.
