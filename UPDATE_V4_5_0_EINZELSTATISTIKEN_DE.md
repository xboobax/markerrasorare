# MarkErras Sorare Dream V4.5.0 – Spielerleistungsarchiv

V4.5 baut auf deiner eingerichteten **V4.4.0 Prediction Learning Engine** auf. Es ergänzt eine getrennte, dauerhafte Sammlung tatsächlich beobachteter **Spieler-Einzelstatistiken** aus abgeschlossenen ESPN-Spielen. V4.4-PP-/Q80-Snapshots und die bisherigen Modellparameter bleiben unverändert.

## Wichtig: zuerst die Neon-Datenbank erweitern

Die neue Tabelle wird NICHT automatisch von Vercel erstellt. Sie muss EINMAL in deiner bestehenden Neon-**production**-Datenbank angelegt werden:

1. Öffne [Neon Console](https://console.neon.tech) und wähle dein vorhandenes MarkErras-Sorare-Dream-Projekt.
2. Öffne **Postgres database → SQL Editor** und prüfe, dass `production` / `neondb` gewählt ist.
3. Öffne aus dieser ZIP die **NEUE** Datei `schema/learning-v45-performance.sql` in einem Texteditor.
4. Kopiere deren gesamten Inhalt in den Neon SQL Editor und klicke auf **Run**.
5. Es sollte `Statement executed successfully` erscheinen. Die bisherige Datei `learning-v44.sql` bitte **NICHT erneut** ausführen; sie bleibt bestehen.
6. Optional zur Kontrolle:

```sql
SELECT tablename FROM pg_tables
WHERE schemaname='public' AND tablename='learning_v45_player_performances';
```

Es muss **eine Tabelle** mit diesem Namen erscheinen. V4.5 verändert die bestehenden V4.4-Daten **nicht**.

## Dann das neue Programm veröffentlichen

1. Funktionierende V4.4 zuerst sichern.
2. **V4.5.0** aus dieser ZIP im GitHub-Projekt bereitstellen; bestenfalls zunächst in einem Preview-Branch testen.
3. Das Vercel-Deployment erstellen. `DATABASE_URL`, `CRON_SECRET` und `V44_AUTO_PROMOTE=false` aus V4.4 **unverändert lassen**.
4. Hinweis: Für Preview-Deployments ist eine gesonderte Neon-Testdatenbank empfehlenswert; produktive Cronjobs laufen nur im Production-Deployment.
5. Nach dem Production-Deployment unter **Settings → Cron Jobs** nach Jobs mit dem Pfad `/api/cron/v44?job=playerstats` suchen. Es kommen **12 zusätzliche tägliche Statistikjobs** zu den bisherigen 20 hinzu, insgesamt 32.
6. Deine Website mit `/api/learning-v45?sport=nba` und `/api/learning-v45?sport=football` testen. Erwarteter Einstieg:

```json
{"configured":true,"schemaReady":true,"summary":{"total":0}}
```

Das ist nur ein Ausschnitt. `total: 0` ist bei einer neuen Tabelle völlig normal. `schemaReady: false` heißt, dass die neue Tabelle nicht erreichbar oder noch nicht angelegt ist.
7. Im Builder wie bisher die **Prediction Learning Engine** öffnen. Darunter erscheint jetzt **„V4.5 · PLAYER PERFORMANCE ARCHIVE“**. Nach erfolgreichen Statistikjobs steigen die Zähler.

## Was wird gespeichert?

**NBA** pro Spieler und bestätigtem abgeschlossenem ESPN-Spiel: Spieler-ID, Team/Gegner, Datum, Start-/Bankrolle (sofern bestätigt), Minuten, Punkte, Rebounds, Assists, 3PM, 3PA, Steals, Blocks, Turnovers. 3P% ist daraus ableitbar. DNP werden nicht als echte Null-Leistungen gespeichert.

**Fußball** pro Spieler und bestätigtem abgeschlossenem ESPN-Spiel: Spieler-ID, Team/Gegner, Wettbewerb, Position, Start-/Bankrolle (sofern bekannt), Minuten, Tore, Assists, Schüsse aufs Tor, Paraden, Tackles, Interceptions, Klärungen, Zweikämpfe, erfolgreiche Pässe und **alle im Live-Parser eindeutig benannten verfügbaren Decisive-/All-Around-Ereignisse**.

**Extrem wichtig:** Ob ESPN eine Einzelstatistik tatsächlich liefert, unterscheidet sich nach Sport, Wettbewerb und Spieler. Nicht vorhandene Felder **fehlen in der Datenbank** und werden im Dashboard als `–` angezeigt; sie werden **nicht als 0** interpretiert. Auch ein fehlender Boxscore führt nicht zu einem erfundenen Spieler-Score. Die Quelle ist ein öffentlich abrufbarer, **nicht offiziell unterstützter ESPN-Webfeed**. Es besteht keine Garantie auf vollständige oder dauerhafte Verfügbarkeit.

## Performance- und Datenqualitätsschutz

- Archiviert werden ausschließlich Spiele mit vom ESPN-Feed gemeldetem **FINAL**-Status und einzeln beobachtete Spieler.
- Die Ausführung ist **serverseitig, in begrenzte tägliche Jobs geteilt**, arbeitet mit maximal drei parallelen Spieldetail-Abrufen und schreibt Spielerstatistiken in einer gebündelten Datenbankoperation.
- Die Jobläufe betrachten die beiden letzten deutschen Kalendertage. Die Abfragen sind zur Schonung von Hosting/API begrenzt (maximal 10 NBA- und 12 Fußballspieldetails je Shard-Lauf); deshalb ist **noch keine lückenlose historische Abdeckung** garantiert.
- Die Daten werden über einen eindeutigen Schlüssel `(sport, competition, game_id, player_id)` gespeichert. Wiederholte Abrufe erzeugen keine doppelten Einträge.
- Bei ESPN fehlende Spieldaten führen nicht zu erfundenen Werten. Nachträgliche Korrekturen können anhand bestätigter neuer FINAL-Boxscores aktualisiert werden.
- Die Tabelle enthält **keine** privaten Sorare-Authentifizierungsdaten, Passwörter oder Karten-IDs. Für die Statistikerfassung muss dein PC nicht laufen.
- NBA und Fußball bleiben in Erfassung, Auswertung, Modellparametern und Backtests getrennt.

## Was V4.5 noch NICHT macht

Die individuellen NBA-/Fußball-Statistiken werden **gespeichert und sichtbar gemacht**, aber noch **nicht als automatische neue PP-/Q80-Modellfeatures oder Trainingsziele verwendet**. Der entscheidende Schritt zu statistikabhängigen Modellgewichten erfordert verifizierte, ausreichend vollständige zeitlich korrekte Datensätze und eine gesonderte zeitliche Holdout-Validierung. Weiterhin gelten die V4.4-Regeln: **nur originale Sorare-FINAL-Scores** sind bestätigte Zielwerte. `V44_AUTO_PROMOTE` bleibt bis zur Verifikation auf `false`.

## Falls etwas nicht funktioniert

- `schemaReady:false`: neue SQL-Migration in Neon prüfen.
- Cron `401`: `CRON_SECRET` in Production prüfen, nicht im Chat teilen.
- Cron `503`: Function Logs ansehen. Ursache können fehlendes Schema, ESPN-Fehler, Datenbankrate oder Timeouts sein.
- Cron `200`, aber `total: 0`: Der betreffende Zeitraum enthielt möglicherweise keine abgeschlossenen Spiele mit auswertbaren Spieler-Boxscores. Im Vercel-Job-Result nach `games`, `players`, `saved` und `failures` schauen.
- Cronjobs im Vercel Hobby-Tarif laufen nur täglich und innerhalb einer flexiblen Ausführungsstunde; die Liste der geplanten Jobs allein bestätigt **noch keinen erfolgreichen Datenimport**.

### Weiterer Schritt

Sobald genügend Sportdaten gesammelt wurden, die NBA- und Fußball-Kalibrierung je Sport **separat** um positions-/rollen-/aktionsbasierte, strikt vor dem Spiel verfügbare Features erweitern. Kein Live-Scoring- oder Future-Data-Leakage.
