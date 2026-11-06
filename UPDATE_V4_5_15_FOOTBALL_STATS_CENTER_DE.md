# V4.5.15 – Football Stats Center 2.0

## Ziel

Die vorhandenen Prognosen (PP/Q80, Gewichte, Learning, NBA-/Football-Optimizer) **bleiben unverändert**. Das Update sammelt und zeigt nur **tatsächlich berichtete** Fußball-Spielerleistungen aus ESPN sowie **offizielle Sorare-FINAL-Scores** inklusive Decisive-, All-Around-Werten, konkreten Einzelstatistiken und Scoring-Beiträgen. Understat/SoccerData für xG/xA ist als **optionaler, nicht automatisch aktivierter** Importweg integriert. Reep wurde als möglicher späterer ID-Helfer evaluiert; es ist keine Statistikquelle und wird nicht als aktive API vorausgesetzt.

## Installation (in dieser Reihenfolge)

1. Das komplette V4.5.15-Projekt bei GitHub einspielen. **Vor dem Deployment** `schema/football-stats-v4515.sql` einmalig im **Neon SQL Editor** in der Datenbank aus `DATABASE_URL` ausführen. Es setzt die bestehenden `schema/learning-v44.sql` und `schema/learning-v45-performance.sql` voraus. Die Migration ergänzt vier Tabellen, ändert/überschreibt **keine** bisherigen Prognose- und Sammeldaten und übernimmt bereits vorhandene ESPN-Fußballleistungen.
2. Die bestehenden Umgebungsvariablen `DATABASE_URL` und `CRON_SECRET` in Vercel beibehalten. **Keine neue API und keine kostenpflichtige Datenbank nötig.** Keine Geheimnisse in GitHub committen.
3. Vercel neu deployen. Verifizieren, dass der Produktionsbuild erfolgreich ist. Danach `/api/football-stats/status` abrufen. `schemaReady:true` bestätigt nur die Tabellen und SQL-Abfragen, **nicht** einen erfolgreichen Datenimport. Im bestehenden Analysebereich `FOOTBALL STATS CENTER 2.0` kann man die Zähler und Fehlermeldungen ansehen.
4. Einen Fußballspieler im Builder oder Spieler-Explorer öffnen und „REAL STATS · SORARE SCORING“ ausklappen. Die Anzeige lädt erst beim Öffnen. Sorare-FINAL-Historie wird live für diesen Spieler abgerufen; vorhandene ESPN-/Understat-Statistiken kommen aus Neon. Bei fehlenden Daten wird „—“ angezeigt, **nicht Null**.
5. Die sieben bestehenden ESPN-Statistikcronjobs (unter `/api/cron/v44?job=playerstats&sport=football`) laufen weiterhin jeden Tag. Sie archivieren künftig zusätzlich in der V4.5.15-Tabelle. Fünf neue tägliche, durch `CRON_SECRET` geschützte Sorare-FINAL-Jobs (`/api/cron/v4515?job=sorare&shard=0...4`) sind im `vercel.json` verteilt. Sie lesen kleine, fortsetzbare Batches aus bereits gespeicherten Spieler-Snapshots. Das befüllt das Archiv **schrittweise**. Erst nach erfolgreichen Cronläufen erscheinen neue Reihen in der Diagnose.

## Historischer ESPN-Nachimport

Mit dem gleichen privaten Bearer-Secret wie Vercel Cron können vergangene Tage nachimportiert werden. Beispiel in einer Shell **mit** vorhandenem Secret:

```sh
curl -H "Authorization: Bearer $CRON_SECRET" \
  'https://DEINE-DOMAIN.vercel.app/api/cron/v4515?job=backfill&batch=league-a&from=2026-11-01&days=2'
```

`from` ist der Berliner Kalendertag. Pro Aufruf höchstens **3 Tage** und **8 bestätigte FINAL-Spiele**, maximal **180 Tage rückwirkend**. Um alle Wettbewerbe abzudecken, die gültigen Batchnamen aus `lib/learning-v45-pipeline.ts` (`league-a`, `league-b`, `europe`, `national-0` bis `national-3`) verwenden. Wiederholungen sind idempotent. Die Antwort enthält `games`, `observations`, `saved`, `withoutStats`, `failures`, `truncated`. Ein `saved:0` ist **nicht** als Erfolg der Statistikanbindung zu interpretieren. Es kann auch bedeuten, dass die jeweiligen ESPN-Spielerdetails keine berichteten Zahlen lieferten.

## Sorare-Scores und Datenqualität

- Die offiziellen Sorare-Spielerwerte werden **nur** bei `scoreStatus=FINAL` übernommen. Die GraphQL-Abfrage liest `allPlayerGameScores` mit `PlayerGameScore`, `decisiveScore`, `allAroundScore`, `detailedScore` und `footballPlayerGameStats` entsprechend dem veröffentlichten Sorare-Schema.
- `detailedScore.totalScore` ist der tatsächliche Punktebeitrag eines Ereignisses. `detailedScore.points` ist ggf. nur ein Punktefaktor pro Ereignis; wir geben deshalb den **Gesamtbeitrag** aus.
- Sorare-Kartenboni (XP, Saison, Captain, Collection) sind **nicht** Bestandteil des offiziellen Spieler-Scores. Der alte Bonus-/Prognosecode bleibt unverändert.
- Verknüpfungen zwischen ESPN, Understat und Sorare benötigen passende Partie, Anstoßzeit (max. 3 Stunden Abweichung), Mannschaften und nachweisbare Spieleridentität. Bei Ambiguität wird die Quelle **nicht** automatisch falsch verknüpft.
- Im Profil werden die Quellen getrennt archiviert; bei eindeutig gleichem Spiel erscheinen xG/xA und ESPN-Werte zusätzlich neben dem offiziellen Score. Für ungewöhnliche Vereinsnamen/Transfers kann eine Zuordnung fehlen. Ein fehlender Match-Link ist besser als eine falsche Verknüpfung.

## Understat / SoccerData – optional, Rechte und reale xG/xA

**Keine automatische Understat-Abfrage ist eingeschaltet.** Die Bibliothek `soccerdata` ist unabhängig vom Next.js-/Vercel-Build, und ihre Apache-Lizenz überträgt sich **nicht** auf die Daten der Quellen. Vor automatischem Download und Speicherung muss die jeweilige Berechtigung und Nutzungssituation für dein Projekt geklärt sein. Diese Option benötigt keine kostenpflichtige API, ist aber ohne zugelassenen Zugang **nicht als funktionsfähiger Dauerimport garantiert**.

Nach zulässiger Freigabe auf einem separaten Python-Rechner:

```sh
pip install soccerdata
python scripts/import_soccerdata_understat.py --league GER-Bundesliga --season 2026/2027 --from 2026-11-01 --max-matches 2
```

Der erste Aufruf ist **DRY RUN**, er sendet nichts an Neon. Für einen bewusst freigegebenen Upload mit dem privaten Secret in den Umgebungsvariablen:

```sh
export FOOTBALL_STATS_URL='https://DEINE-DOMAIN.vercel.app/api/cron/v4515/understat'
export CRON_SECRET='DEIN_GEHEIMES_SECRET'
python scripts/import_soccerdata_understat.py --league GER-Bundesliga --season 2026/2027 --from 2026-11-01 --max-matches 2 --send --permission-confirmed
```

Unterstützte vier Liga-Argumente: `GER-Bundesliga`, `ENG-Premier League`, `ESP-La Liga`, `FRA-Ligue 1`. Laut SoccerData-Understat-Dokumentation liefern einzelne Spiele **Minuten, Tore, Schüsse, xG, xA, xGChain, xGBuildup**; weitere Werte werden nur übernommen, wenn der Feed sie wirklich liefert. UEFA-/Nationalmannschafts-xG wird **nicht** behauptet. Sportdaten und Zugriffsregeln können sich ändern. Der Python-Adapter wurde hier nicht gegen eine aktive Quelle ausgeführt.

## Diagnose / wichtige Endpunkte

| Endpunkt | Zugriff | Funktion |
|---|---|---|
| `/api/football-stats/status` | Lesend | Neon-Migration, Spieler/Spiel-/xG-Zähler, offizielle Sorare-Scores, verifizierte Links und Importjobs |
| `/api/football-stats/player?slug=...&name=...&team=...` | Lesend | Genaues Spielerprofil und direkte Sorare-FINAL-Historie |
| `/api/cron/v4515?job=sorare&shard=0` bis `4` | Cron-Secret | Offizielle FINAL-Scores schrittweise importieren |
| `/api/cron/v4515?job=backfill&batch=league-a&from=...&days=2` | Cron-Secret | Historische ESPN-Einzelspiele nachholen |
| `/api/cron/v4515/understat` | Cron-Secret, POST | Kontrollierter, ausdrücklich freigegebener Understat-Import |

## Tests / Grenzen der Testumgebung

- Vollständiges vorhandenes `npm run test:arcade` inklusive neuem V4.5.15-Test (FINAL/Spiel-IDs, echte Sorare-Scoring-Beiträge, Quellentrennung, ID-Isolation, xG/xA, neue Cronjobs) wurde erfolgreich ausgeführt.
- `node tools/check-v4-syntax.js`: 156 TypeScript/TSX-Dateien syntaktisch geprüft.
- **Kein vollständiger `next build` in der Bearbeitungsumgebung**, weil der Netzwerkzugriff auf npm zur Installation von React/Next/Neon-Paketen fehlschlug. Der Vercel-Build muss nach dem Deployment bestätigt werden. Neue Quellen wurden nicht gegen deine produktive Neon-Datenbank getestet.
- Die Migration und ein tatsächlicher Import **sind nach dem Entpacken noch nicht ausgeführt**. Anfangs können xG-/xA-Zähler gleich null sein; das ist ein noch nicht erfolgter Import und kein Beleg für Datenabdeckung.
- Es wurde kein neues Prognosemodell trainiert oder automatisch aktiviert, bewusst entsprechend der Freigabe „erst echte Statistikdaten sammeln und anzeigen“.
