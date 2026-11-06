# Football-Stats Saisonimport ohne Python auf deinem PC

Dieses Add-on wurde fuer Neon Builder Pro V4.5.16 erstellt. Die Next.js-App, Prognosen,
Learning-Gewichte, NBA- und Football-Optimizer werden **nicht** geaendert.

## Installation

1. Lade das vollstaendige Projekt-ZIP mit dem Zusatz **GitHub-Actions-Import** nach GitHub hoch,
   wie bei bisherigen Versionen. Es enthaelt die neue Datei
   `.github/workflows/football-stats-import.yml`.
2. In GitHub: `Settings` > `Secrets and variables` > `Actions` > `New repository secret`.
   Lege **FOOTBALL_STATS_BASE_URL** an, mit deiner Production-Domain (`https://...vercel.app`),
   und **CRON_SECRET** mit **demselben privaten Wert** wie in Vercel.
   Niemals Secrets in Chat, Commit, Screenshot, README oder Workflow-Inputs einfuegen.
3. In GitHub `Actions` oeffnen > `Football-Stats Saisonimport (ohne Python am PC)` > `Run workflow`.
4. Zunaechst `mode=espn_preview` mit `from_date=2026-07-01` und leerem `until_date` starten.
   Dieser Lauf zeigt geplante Requests und speichert **nichts**.
5. Wenn die Vorschau passt: `mode=espn_import` starten. Der Workflow importiert FINAL-Spiele
   nach Neon; der Fortschritt wird zwischen erfolgreichen und unterbrochenen Laeufen
   ueber GitHub Actions Cache gespeichert. Du kannst denselben Modus erneut starten.
6. `https://DEINE-DOMAIN/api/football-stats/status` pruefen: `sourceStats` sollte wachsen.

## SoccerData

`mode=soccerdata_preview`/`soccerdata_import` funktioniert ebenfalls im GitHub-Runner –
kein lokales Python noetig. **ABER:** Der Workflow setzt `source_rights_confirmed=true` voraus.
Das darf nur gesetzt werden, wenn du fuer die konkrete Website-Quelle die Berechtigung zum
automatisierten Abruf, Speichern und Verwenden der Daten geklaert hast. Das offene
SoccerData-Python-Paket ist keine allgemeine Lizenz fuer Understat/FBref/andere Anbieter.
Der Workflow erlaubt keinerlei Sperrenumgehung. Ohne Berechtigung diesen Modus nicht starten.

Zum Test mit erlaubter Understat-Quelle beispielsweise `source=understat`,
`dataset=player_match`, `league=GER-Bundesliga` auswaehlen. Danach einzeln fuer
`ENG-Premier League`, `ESP-La Liga`, `FRA-Ligue 1` wiederholen, falls Daten verfuegbar.
Der reale Abruf wurde fuer dieses Add-on nicht ausgefuehrt und ist nicht garantiert.

## Grenzen und Hinweise

- GitHub Actions verwendet einen gehosteten Python-Runner. Du installierst **nichts** auf deinem PC.
- Bei oeffentlichen Repositories sind Standard-GitHub-Runner grundsaetzlich kostenlos;
  bei privaten Repositories gelten Freikontingente/Abrechnungsgrenzen.
- Die Skripte laufen mit begrenzten Request-/Batch-Groessen und ohne Umgehung von 403/429.
- Der ESPN-Rueckimport kann je nach Datenmenge lange dauern oder an API-/Vercel-Limits
  scheitern. Der Checkpoint ermoeglicht Fortsetzung; kontrolliere die GitHub-Logs.
- GitHub Actions Cache ist **kein dauerhaftes Datenarchiv**. Neon speichert die bereits
  bestaetigten Leistungen und Upserts verhindern doppelte Zeilen. Bei Cache-Verlust
  koennen alte Seiten erneut abgefragt werden.
- `soccerdataSchemaReady:true` und `schemaReady:true` muessen in Neon bereits gesetzt sein.
- Die neuen Werte werden nicht fuer Vorhersagen oder die Sorare-Scoring-Formeln verwendet.
- Kein erfolgreicher Online-Import oder Produktionsbuild wird fuer dieses Add-on behauptet.
