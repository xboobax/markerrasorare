# Neon Builder Pro V4.5.16 – SoccerData Stats + Saison-Nachimport

## Was dieses Update tatsächlich macht

- Erweitert V4.5.15 **additiv**, inklusive des zuvor funktionierenden ESPN-Archivs und der echten Sorare-FINAL-Scores.
- Importiert aus **autorisierten SoccerData-Abfragen** alle durch die jeweilige Methode bereitgestellten numerischen Statistikfelder (nicht nur xG/xA) mit Quellenzuordnung. Fehlende Werte bleiben fehlend.
- Speichert voneinander getrennt: Spieler-Einzelspiele, Spieler-Saisonstatistiken, Torwartstatistiken, Schussereignisse, Match-Ereignisse, Aufstellungen, Teamstatistiken und Ratings, soweit die jeweilige Source sie bereitstellt.
- Markiert bei bestätigten FINAL-Spielen Einsatzstatistiken. Ohne eindeutige Spieler-ID bleibt ein Datensatz eine **quellenbezogene Beobachtung**; es wird keine offizielle Spieler-ID erfunden.
- Zeigt die zusätzlichen Stats im bisherigen ausklappbaren „Real Stats · Sorare Scoring“-Bereich an – **jetzt auch in der eigenständigen Player Database** (`/players`). Bei mehreren Datenquellen werden Summen nicht addiert.
- Erweitert den authentifizierten ESPN-Nachimport um `offset`/`maxGames` und liefert ein fortsetzbares Windows-/Python-Skript für die Saison 2026/27.
- Verändert **keine** PP-/Q80-Prognosen, keine Modellgewichte, kein Learning und keinen NBA-/Football-Optimizer.

### Datenabdeckung und wichtige Grenze

Der Originalcode von [probberechts/soccerdata](https://github.com/probberechts/soccerdata) ist Apache-2.0. Die Daten der Webseiten fallen **nicht automatisch** unter diese Lizenz. Automatisierte Abrufe, Speicherung, Veröffentlichung oder Weitergabe nur dort, wo die jeweilige Quelle und dein Nutzungsszenario dies gestatten.

Die neue Python-Anbindung ist **bewusst opt-in**. Sie führt beim Vercel-Deployment **keine Scraper** aus, startet keine Browser auf Vercel und umgeht keine Zugangsbeschränkungen. Auch ein Dry Run, der eine fremde Website kontaktiert, erfordert `--permission-confirmed`. Für die eigenen Daten aus einer bereits zulässig erstellten JSON-Datei kann `--input-json` verwendet werden.

**Nicht verwechseln:** FBref-/WhoScored-/SoFIFA-Statistiken sind **keine offiziellen Sorare-Scores**. Für echte Sorare-FINAL-Werte bleibt die Sorare-GraphQL-Quelle von V4.5.15 zuständig. Die vorhandenen 342 ESPN- und 96 Sorare-Datensätze bleiben bei der Migration erhalten.

| SoccerData-Source | Unterstützte Import-Datentypen (je nach Quellzugang) |
|---|---|
| Understat | Spieler-Einzelspiele, xG/xA/xGChain/xGBuildup, Schüsse, Spieler-Saisonwerte, Team-Matchstats, einzelne Schüsse |
| FBref | Spieler-Einzelspiele (summary/keepers), Saisonwerte (standard/shooting/playing_time/keeper/misc), Teamstats, Aufstellungen, Matchereignisse |
| ESPN via soccerdata | Spielplan, Lineups, Matchsheet; bestehender app-interner ESPN-Import bleibt die Hauptquelle für echte Spieler-Matchleistungen |
| WhoScored | Match-Ereignisse, ggf. Angaben zu fehlenden Spielern, Schedule |
| SofaScore | Ligatabelle/Teamwerte laut dokumentierter API; **kein hier garantierter Spieler-Einzelspiel-Feed** |
| Football-Data.co.uk / MatchHistory | Historische Match-/Team- und Ergebnisdaten; kein Spieler-xG-Feed |
| ClubElo | Team-Elo-Ratings, keine Einzelspieler-Leistungen |
| SoFIFA | Videospiel-Spielerfähigkeits-Ratings, **keine realen Sorare- oder Matchscores** |

Die Bibliothek wurde gegen die Dokumentation `soccerdata 2026.43.0` ausgelegt. Einzelne Quellmethoden können sich ändern oder gesperrt werden. **Keine garantierte Vollständigkeit für jedes Team oder jeden Wettbewerb.** Für Champions League, Europa League, Conference League und Nationalmannschaften bleibt ESPN/Sorare relevant; Understat-xG ist nicht generell für diese Wettbewerbe verfügbar.

## 1. Migration – einmalig im Neon SQL Editor

1. Vorherige Migration `schema/football-stats-v4515.sql` muss bereits erfolgreich ausgeführt sein (`schemaReady:true`).
2. In genau derselben Neon-Branch/Datenbank wie die Vercel-Variable `DATABASE_URL` nun **`schema/football-soccerdata-v4516.sql`** ausführen.
3. Dieses SQL erweitert nur die Provider-Checks der V4.5.15-Tabellen und ergänzt `football_stats_v4516_source_records` samt Indizes; **kein `DROP TABLE`, keine Forecast-/Kartenänderungen**.
4. Projekt-ZIP vollständig nach GitHub hochladen und Vercel-Production-Deployment prüfen. Erst dann Scripts gegen den neuen Endpunkt ausführen.
5. `https://DEINE-DOMAIN/api/football-stats/status` aufrufen. Gesucht: `schemaReady:true` und `soccerdataSchemaReady:true`. Die Statistikzähler können zunächst weiter **0** sein – Migration ist noch kein Datenimport.

## 2. Saison 2026/27 – vorhandene ESPN-Spielerwerte nachimportieren

Auf deinem **eigenen Windows-Rechner** muss Python 3.10+ verfügbar sein. Öffne PowerShell im entpackten Projektordner. Dann `CRON_SECRET` **nur als Umgebungsvariable** setzen; niemals in GitHub, Screenshots, Chats oder Skriptdateien weitergeben.

```powershell
$env:FOOTBALL_STATS_BASE_URL = 'https://DEINE-DOMAIN.vercel.app'
$env:CRON_SECRET = 'DEIN_PRIVATES_VERCEL_CRON_SECRET'
python scripts/backfill_football_season.py --from 2026-07-01 --until 2026-11-06
```

Der erste Lauf ist eine harmlose **Vorschau**, ohne Daten zu übertragen. Nach Prüfung:

```powershell
python scripts/backfill_football_season.py --from 2026-07-01 --until 2026-11-06 --send
```

Ohne besondere Flags werden `league-a`, `league-b`, `europe` und `national-0..3` berücksichtigt. Jede Abfrage lädt höchstens 3 Tage und höchstens 8 FINAL-Spiele. Wenn ein Tag mehr Spiele hat, werden **weitere Seiten** abgearbeitet (nicht mehr stillschweigend übersprungen). Das Skript schreibt eine lokale Checkpointdatei `.football-backfill-v4516-progress.json`, so dass Unterbrechungen sicher fortsetzbar sind. Bei Fehlern stoppt es, statt fehlgeschlagene Spiele als erfolgreich zu markieren.

Die früheren Cronjobs laufen weiter. Du kannst mit `--batches league-a,league-b,europe` nur Klubwettbewerbe wählen oder `--until` anpassen. Halte die Anzahl der Anfragen moderat und beachte die Limits deines Vercel-Plans.

## 3. SoccerData / xG-xA und alle berichteten Stats

SoccerData benötigt **Python auf deinem Rechner**, nicht in Vercel. Für Quellen, bei denen du den automatisierten Zugriff und die Datennutzung geklärt hast:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install 'soccerdata==2026.43.0'
.\.venv\Scripts\python.exe scripts/import_soccerdata_all.py --source understat --dataset player_match --league GER-Bundesliga --season 2026/2027 --from 2026-07-01 --max-games 3 --permission-confirmed
```

**Achtung:** Ohne ausdrückliche Einhaltung der Nutzungsbedingungen der Originalquelle diesen Abruf **nicht** ausführen. Das Kommando ist nur ein Beispiel für den technisch vorbereiteten Ablauf; es ist noch kein Beleg für die Erlaubnis oder die Verfügbarkeit des Feeds. Dry-run schreibt zunächst keine Daten nach Neon.

Wenn du einen zulässigen Datenzugang hast und die Probe echte Zahlen liefert, im gleichen PowerShell-Fenster:

```powershell
$env:FOOTBALL_STATS_URL = 'https://DEINE-DOMAIN.vercel.app/api/cron/v4516/soccerdata'
$env:CRON_SECRET = 'DEIN_PRIVATES_VERCEL_CRON_SECRET'
.\.venv\Scripts\python.exe scripts/import_soccerdata_all.py --source understat --dataset player_match --league GER-Bundesliga --season 2026/2027 --from 2026-07-01 --max-games 10 --permission-confirmed --send
```

Zum Fortsetzen erneut starten: Die lokale Checkpointdatei merkt abgeschlossene Spiele und die Neon-Upserts erkennen erneut übertragene Datensätze wieder. Für alle vier Ligen `--league` jeweils ersetzen durch: `GER-Bundesliga`, `ENG-Premier League`, `ESP-La Liga`, `FRA-Ligue 1`. Die Checkpointdatei ist über alle Läufe hinweg pro Quelle, Dataset, Liga, Saison und Spiel-ID getrennt.

Weitere Datentypen (nur bei zulässigem Datenzugang):

```powershell
# xG/xA und Saisonwerte
.\.venv\Scripts\python.exe scripts/import_soccerdata_all.py --source understat --dataset player_season --league GER-Bundesliga --season 2026/2027 --permission-confirmed --send
# Schusspositionen und einzelne Schussereignisse
.\.venv\Scripts\python.exe scripts/import_soccerdata_all.py --source understat --dataset shot_event --league GER-Bundesliga --season 2026/2027 --from 2026-07-01 --permission-confirmed --send
# FBref Saisonstatistiken, je nach tatsächlich verfügbarer/zulässiger Stat-Tabelle
.\.venv\Scripts\python.exe scripts/import_soccerdata_all.py --source fbref --dataset player_season --stat-type shooting --league ENG-Premier League --season 2026/2027 --permission-confirmed --send
# FBref Torwart-Einzelspiele
.\.venv\Scripts\python.exe scripts/import_soccerdata_all.py --source fbref --dataset player_match --stat-type keepers --league ENG-Premier League --season 2026/2027 --permission-confirmed --send
```

Die anderen unterstützten `--source`/`--dataset`-Kombinationen stehen im Skript unter `METHODS` und sind zusätzlich über die SoccerData-Referenz dokumentiert. Für Datenquellen mit gesperrtem Scraping keine Proxies/Umgehungen oder automatisierte Retries einsetzen; diesen Import deaktiviert lassen.

**Alternative: autorisierte lokale Dateien.** Wenn du schon rechtmäßig exportierte Datensätze im oben beschriebenen JSON-Schema hast:

```powershell
.\.venv\Scripts\python.exe scripts/import_soccerdata_all.py --source understat --dataset player_match --input-json meine_stats.json
# mit --send nur nach Zugangs- und Nutzungsrechtsprüfung, URL/Secret wie oben
```

## 4. Spielerprofile und Qualität

- Football Builder → Spielerprofil → **„REAL STATS · SORARE SCORING“**.
- Player Database → **„ⓘ Interne Analyse“** → derselbe Bereich.
- Saison, Datenquelle, „pro 90“ und Einzelspiele auswählen.
- Unter **„SoccerData · weitere Saisonwerte, Events, Ratings“** erscheinen alle tatsächlich importierten zusätzlichen Felder, getrennt nach Quelle und Datenart. Nicht jedes Teamrating erscheint beim Spieler, weil es keine Spielerstatistik ist.
- Werte ohne stabile Spieler-ID erscheinen nur als eindeutig nach Name+Verein gefilterte **Beobachtung** und werden nicht als bestätigte plattformübergreifende Identität eingetragen.
- ESPN, Understat und andere Anbieter dürfen pro Match **nicht doppelt addiert** werden. Event-Zeitstempel und Provider-Scores sind keine Sorare-Scoring-Ereignisse.
- Der öffentliche Status `/api/football-stats/status` zeigt unter `soccerdataRecords` die Datensätze und xG-/xA-Abdeckung nach Source und Datentyp. Bei `soccerdataSchemaReady:false` fehlt die zusätzliche Migration.

## 5. Teststand und Grenzen

- Vollständiger bestehender `npm run test:arcade` inklusive V4.5.16-Regressionsprüfungen bestanden.
- `node tools/check-v4-syntax.js` bestanden.
- Python-Skripte syntaktisch geprüft und der lokale Normalisierungsweg mit kontrollierten synthetischen Testdaten ohne Webzugriff getestet.
- **Kein vollständiger Next.js-Produktionsbuild hier:** npm-Registry ist aus der Testumgebung nicht erreichbar. Bitte Vercel-Build prüfen und ggf. vollständige Fehlermeldung schicken.
- **Kein tatsächlich durchgeführter SoccerData-Live-Abruf** und keine produktive SQL-Ausführung aus dieser Bearbeitungsumgebung. Ob die einzelnen Quellen erreichbar und für deinen konkreten Zweck zulässig sind, muss getrennt geklärt werden. Das ZIP allein befüllt xG/xA noch nicht.
