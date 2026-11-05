# V4.4.0 – Prediction Learning Engine (NBA + Fußball getrennt)

## Was neu ist

- Zwei **getrennte Kalibrierungsmodelle** mit getrennten Datenreihen: `nba` und `football`. Änderungen an einer Sportart beeinflussen die andere nicht.
- Automatische Snapshots der **aktuellen V3-PP- und V3-Q80-Prognosen vor Spielbeginn**; spätere Änderungen am Modell überschreiben keine alten Snapshots.
- Abgleich mit eindeutig passenden, von **Sorare als `FINAL` markierten Spieler-Scores**. Unvollständige Gamecasts, DNP und unklare Zuordnungen werden **nicht** als offizielle Resultate gelernt.
- NBA: separate 3PM-, 3PA- und Trefferquoten-Auswertung aus **ESPN-Abschlussboxscores**, nur bei eindeutigem Spieler-, Team- und Spielzeitabgleich mit einem Sorare-FINAL-Datensatz. Vor dem Spiel beobachtete historische 3PM-/3PA-Trends werden als separate Features gespeichert, wenn mindestens drei frühere Datenpunkte vorliegen. Kein Dreier-Bonus wird doppelt auf Sorare-PP gerechnet.
- Automatische Modellerprobung mit zeitlich getrenntem Training/Holdout pro Sport. Vorschläge können nur bei ausreichender Stichprobe und nachweisbarer Verbesserung aktiviert werden.
- Neues Learning-Dashboard in Analytics bzw. im Builder. Datensammlung belastet **nicht** den normalen Seitenaufruf.

## Wichtig: einmalige Einrichtung von Neon + Vercel

Die Version enthält den vollständigen Programmcode, **aber keine eingerichtete Datenbank oder aktivierte Verbindung zu deinen Vercel-/Sorare-Konten**. Ohne diese Konfiguration bleiben sämtliche alten Builder- und Live-Funktionen funktionsfähig und das Modell verändert sich nicht.

1. Bei **Neon** ein kostenloses PostgreSQL-Projekt anlegen (Tariflimits beachten) und den Connection String aus dem Dashboard kopieren.
2. `schema/learning-v44.sql` in Neons **SQL Editor** einmalig ausführen. Die SQL-Datei legt drei Tabellen für Snapshots, aktive Modelle und Jobstatus an.
3. In Vercel → Project → Settings → Environment Variables **für Production** hinzufügen:
   - `DATABASE_URL` = Neon PostgreSQL Connection String (enthält Zugangsdaten; niemals in öffentliche Dateien einfügen)
   - `CRON_SECRET` = ein langer zufälliger geheimer String (mindestens 16 Zeichen)
   - `SORARE_API_KEY` = bestehender Sorare-Schlüssel, falls erforderlich; die vorhandenen Sorare-Read-Abfragen verwenden ihn optional.
   - `V44_AUTO_PROMOTE` = optional `true`, **erst nach erfolgreichem Daten-/Live-Test** setzen. Ohne diese Freigabe bleibt das Modell unverändert, Kandidaten sind nur sichtbar.
4. Vor dem produktiven Deployment **einen neuen Git-Branch** nutzen, `npm install` ausführen und Vercel-Preview-Build prüfen.
5. Sobald die Vorschau funktioniert, Produktiv-Deployment veröffentlichen. **Vercel Cronjobs laufen nur auf Production**, nicht im Preview. Anhand von Vercel Logs und dem Learning-Dashboard prüfen, ob alle Capture-, Ergebnis- und Train-Jobs erfolgreich sind.

## Zeitplan

V4.4 hat **20 voneinander getrennte Vercel-Cronjobs**, jeweils maximal einmal täglich, verteilt zwischen **05:00 und 11:20 UTC**. Sie erledigen NBA-Snapshots (3 Teamscopes), Fußball-Snapshots (8 Ligascope-Segmente), Ergebnissynchronisierung (6 Shards), NBA-Dreierstatistiken und Training (2 Sportarten) getrennt.

Auf dem kostenlosen Vercel-Hobby-Tarif sind tägliche Cronjobs möglich. Sie starten **nicht minutengenau**. Jeder Cron ruft ein gesichertes API-Endpunkt mit `CRON_SECRET` auf. Ein abgebrochener Job wird nicht automatisch von Vercel wiederholt; Status und Logs kontrollieren. Falls der Provider Rate-Limits oder Timeouts meldet, muss die Jobaufteilung angepasst werden.

**Grenzen der automatischen Abdeckung:** Die Fußball-Snapshots beziehen sich auf Sorare-Rosters der vier bislang unterstützten Club-Ligen (Bundesliga, LaLiga, Ligue 1, Premier League). Andere Set-Spieler oder Nationalteam-Partien werden nicht automatisch als Trainingsspiele erfunden; dafür ist später eine erweiterte Fixture-/Spieler-ID-Zuordnung nötig. NBA-Snapshots benötigen einen verifizierten Tipoff. ESPN-Dreierdaten können nur gesammelt werden, soweit die beiden Datenanbieter eindeutige Zuordnung liefern. Bei ESPN-/Sorare-Schemaänderungen werden fehlende Werte nicht als 0 geschätzt.

## Welche Werte lernt V4.4 automatisch?

**PP**: Ein pro Sport gelernter, begrenzter Offset (maximal ±9 Punkte), der Vorhersage-Bias reduziert.

**Q80**: Separater, pro Sport gelernter Offset (maximal ±14 Punkte); optimiert die 80-%-Quantil-Verlustfunktion. Q80 darf nicht unter dem korrigierten PP liegen.

**NBA-Dreier**: 3PM und 3PA werden als getrennte echte Ergebnisse erfasst, und 3P% wird daraus berechnet. Historische 3PM/3PA-Profile sind für ein zukünftiges NBA-spezifisches Feature-Modell vorbereitet. **Ein eigenständiges erlerntes 3PM-Gewicht pro NBA-Spieler wird in V4.4 noch nicht automatisch auf PP aufgeschlagen**, um die bereits enthaltenen Dreierpunkte nicht doppelt zu zählen.

**Einsatz- und Minutenmodelle, Fußballrollen, NBA-Meisterschafts-Wochen mit mehreren Spielen**: Noch keine automatisch neu trainierten Einzelmodelle; die bisherige Heuristik bleibt erhalten.

## Sicherheits- und Freigaberegeln

- Nur vor dem Spiel gespeicherte Prognosen; entweder belegter Spielbeginn oder vorheriger UTC-Kalendertag.
- Nur Sorare-FINAL und bestätigte Einsätze, keine Live-Schätzwerte als Trainingslabel.
- Identische Spieler/Spieltage werden bei der Kalibrierung dedupliziert.
- Chronologischer Holdout über unterschiedliche Spieltage, mindestens **140 eindeutige Spieler-Spiele und 18 Tage** insgesamt; mindestens 95 Training und 35 Holdout.
- Neue Kandidaten werden nur bei besserem Holdout und plausibler Q80-Abdeckung freigegeben.
- Mit `V44_AUTO_PROMOTE=true` wird ein freigegebener Kandidat **je Sport getrennt** in `learning_v44_models` gespeichert. Bei Datenbankausfall läuft die rohe V3 weiter.
- Dieses initiale V4.4-Training verwendet **sportweite Kalibrierungs-Offsets**, kein vollwertiges individuelles Machine-Learning-Modell. Für komplexeres positions-/rollenbasiertes Lernen erst mehr verlässliche Daten sammeln.

## Endpunkte (nur zur technischen Diagnose)

- `GET /api/learning-v44?sport=nba` bzw. `sport=football`: aggregierte sporteigene Kennzahlen
- `GET /api/learning-v44/model?sport=nba` bzw. `sport=football`: aktueller freigegebener Offset, ohne Geheimnisse
- `GET /api/cron/v44?job=capture&scope=nba-0` – mit `Authorization: Bearer <CRON_SECRET>`
- `GET /api/cron/v44?job=results&sport=football&shard=1` – dito
- `GET /api/cron/v44?job=threes` – dito
- `GET /api/cron/v44?job=train&sport=nba` – dito

**Sicherheit:** `DATABASE_URL`, `CRON_SECRET` und andere API-Secrets ausschließlich über Vercel-Umgebungsvariablen konfigurieren; nicht in GitHub / Screenshots veröffentlichen.

## Zuverlässigkeit & Teststatus

Lokale Regressionstests und TypeScript-Syntaxprüfungen umfassen geteilte Sportdaten, Fehlersicherheit, V3-Berechnung, NBA 3PM/3PA, Validierung und Modellfreigabe. Echte Neon-Verbindung, Sorare-Endscore-API, ESPN-Live-Daten, Next.js-Produktionsbuild und Vercel-Cronausführung müssen **nach der Einrichtung** auf dem Deployment überprüft werden. Keine Live-Ergebnisse in diesem Paket enthalten.
