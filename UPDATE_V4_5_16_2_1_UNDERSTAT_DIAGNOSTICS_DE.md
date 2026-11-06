# V4.5.16.2.1 – SoccerData / Understat Quellen-Diagnose

## Ursache des gemeldeten Fehlers

`json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)` trat bei
`soccerdata.Understat.read_player_season_stats()` > `read_seasons()` > `_read_leagues()`
auf. SoccerData erwartet an dieser Stelle eine JSON-Antwort vom externen Anbieter,
aber die Antwort war nicht als JSON parsebar. Das ist **kein Neon-/Sorare-Fehler**.
Ob die Antwort leer, HTML, gesperrt oder inkompatibel war, ist ohne Rohstatus unbekannt.

## Sicherer GitHub-Test

1. Vollständiges ZIP zu GitHub hochladen. Keine neue SQL-Migration.
2. GitHub > Actions > Football-Stats Saisonimport > Run workflow.
3. `mode=soccerdata_source_check`, `league=GER-Bundesliga` auswählen.
4. `source_rights_confirmed` **nur** setzen, wenn du die Erlaubnis für den gewählten
   automatisierten Zugriff und die Datenspeicherung geprüft hast.
5. Die Ausgabe von `Import ausführen` ansehen:
   - `SOURCE_CHECK_OK`: Der Katalog ist lesbar; danach separat Suite-Vorschau versuchen.
   - `SOURCE_UNAVAILABLE`: Anbieterantwort ist nicht nutzbar; keine Weiterverarbeitung.
   - `NO_SEASON_DATA`: Saison noch nicht im Katalog vorhanden.

Dieser Test lädt KEINE Spielerstatistiken herunter, speichert KEINE Daten in Neon
und nutzt KEIN `CRON_SECRET`. Er prüft nur einen ligabezogenen Katalogeintrag.

## Verhalten der bestehenden Suite

Bei ungültiger JSON-Antwort meldet der Import jetzt `SOURCE_UNAVAILABLE` statt
mehrseitiger Python-Tracebacks. Der Vier-Ligen-Lauf stoppt dann sofort,
damit keine zwölf erfolglosen Providerabrufe stattfinden. Es gibt **keinen
automatischen Quellenwechsel, keinen Proxy-/Captcha-Bypass und keine erfundenen xG-Werte**.

**Wichtig:** Dieser Hotfix repariert die Fehlerbehandlung, nicht eine eventuell
fehlende Berechtigung oder Verfügbarkeit der Understat-Schnittstelle.
Bestehende ESPN-Daten, Sorare-Scores, Spielerlinks, Prognosen und Optimizer
werden nicht verändert. `soccerdataRecords` bleibt leer, bis ein erfolgreicher,
zulässiger Import erfolgt.

Falls Understat nicht erreichbar bleibt, können genehmigte Datenexporte über den
bestehenden `scripts/import_soccerdata_all.py --input-json`-Pfad importiert werden,
sofern Schema und Nutzungsrechte geprüft sind. Keine Quellenersatzdaten als
Understat ausgeben.
