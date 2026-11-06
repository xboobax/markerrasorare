# V4.5.16.2 – SoccerData zuerst: GitHub-Import für vier Ligen

**Neue Version baut auf V4.5.16.1.2 auf. Keine neue Neon-Migration.**

## Was ist eingerichtet?

Die bereits vorhandene SoccerData-Neon-Tabelle wird genutzt. Neu sind zwei GitHub-Actions-Modi:

- `soccerdata_suite_preview`: Bei **bestätigten Nutzungsrechten** ein kleiner echter Datenquellen-Test, ohne Upload.
- `soccerdata_suite_import`: Bei **bestätigten Nutzungsrechten** Upload für vier Ligen, jeweils drei Datentypen.

Vier Ligen: Bundesliga, Premier League, LaLiga und Ligue 1. Datentypen:
`player_season` (Saisonwerte, xG/xA, Minuten, xGChain etc.),
`player_match` (Spielerleistung pro bestätigter Partie) und
`shot_event` (einzelne Schussereignisse).

**Der Import erfasst nur die Felder, die tatsächlich bei der Quelle vorliegen.** Keine erfundenen Werte,
keine Champions-League-Abdeckung behauptet. Offizielle Sorare-Scores werden nicht ersetzt.
Weitere Anbieter wie FBref sind im bisherigen Einzelquellenmodus verfügbar, aber nicht automatisch in der Vier-Ligen-Suite aktiviert.

## Nutzungsrechte vor Start prüfen

SoccerData selbst ist Apache-2.0-lizenziert. **Das bedeutet nicht, dass automatisiertes Auslesen, Speichern und Weiterverwenden aller Understat-Daten erlaubt ist.**
Prüfe die Regeln / Nutzungsrechte der Quellwebsite für deinen konkreten Zweck. Wenn sie nicht geklärt sind,
`source_rights_confirmed` **nicht** aktivieren und keinen externen Import starten.
Keine Umgehung von IP-Sperren, Anti-Bot-Technik oder 403/429-Zugriffsbeschränkungen.

## Klickanleitung (nach geklärter Berechtigung)

1. ZIP vollständig nach GitHub hochladen. Vorhandene GitHub-Secrets `CRON_SECRET` und `FOOTBALL_STATS_BASE_URL` bleiben.
2. Vercel-Deployment `Ready` kontrollieren.
3. **Actions → Football-Stats Saisonimport → Run workflow**.
4. `mode = soccerdata_suite_preview`, `from_date = 2026-07-01`, `until_date = 2026-11-06`,
   `soccerdata_max_games = 2`. `source_rights_confirmed` nur wählen, wenn die Rechte geklärt sind.
5. In `Import ausführen` echte Datensätze und `COMPLETED` prüfen; DRY RUN speichert nichts.
6. Anschließend `mode = soccerdata_suite_import`; für den ersten Lauf am besten `soccerdata_max_games = 2`.
7. Nach dem Lauf `/api/football-stats/status` öffnen und unter `soccerdataRecords` die Quelle `understat` prüfen.

**Wichtig:** Der Vier-Ligen-Import ist absichtlich begrenzt und kann mehrfach ausgeführt werden.
Für Spieler-Match- und Shot-Event-Datentypen werden bestätigte Spiel-IDs im lokalen Fortschritt erfasst.
Der GitHub-Cache kann leer sein oder fehlschlagen; deshalb sind Server-Upserts idempotent. Ein erneuter Lauf
ist in diesem Fall sicher, kann aber bereits geladene Spiele nochmals abrufen.

## Datenqualität und Prüfungen

- Identische Daten derselben Partie erhalten denselben externen Schlüssel, auch wenn xG oder Tore später korrigiert werden.
- Anbieter werden getrennt gespeichert; Duplikate zwischen ESPN, Understat und Sorare werden **nicht** addiert.
- Sorare-Scores und Boni bleiben unverändert, ebenso PP/Q80/Optimizer/Learning.
- Eine naiv datierte Anstoßzeit wird nicht als sicher verifizierte UTC-Anstoßzeit behandelt.
- Wenn der Provider nicht erreichbar ist, bricht der Import sichtbar ab. Kein Auto-Fallback auf erfundene Daten.

## Status

Dies ist eine **vorbereitete** Import-Suite, keine bereits bestätigte Live-Import-Ausführung. Ohne zulässigen Datenzugang
bleiben xG/xA in Neon weiterhin leer. Bereits von dir legitim exportierte Datensätze können alternativ über
`scripts/import_soccerdata_all.py --input-json` eingelesen werden (Schema in Skript/Tests).
