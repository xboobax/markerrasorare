# Neon Builder Pro V3.4 – Automatisches Prediction Learning Lab

## Ziel

**Keine Prognosen und keine Ergebnisse mehr manuell erfassen.** Ein täglicher Server-Prozess ermittelt öffentliche Sorare-Spielerprognosen **vor** dem jeweiligen Spiel, friert die Werte für V1.7/V1.8/V2.0 ein und speichert sie dauerhaft in Redis. Nach dem Spiel ordnen weitere tägliche Server-Jobs eindeutig passende, abgeschlossene Sorare-Scores zu. Das Dashboard zeigt getrennte Vergleiche für NBA und Fußball.

**Wichtig:** Die vollständige Automatisierung funktioniert erst nach der **einmaligen** Einrichtung einer externen Datenbank und von Vercel-Umgebungsvariablen. Das Einrichten und Deployen kann nicht aus der ZIP heraus selbst erfolgen. Es werden **keine** Modellgewichte automatisch geändert. Der Vergleich zeigt den kleinsten historischen MAE, nicht einen garantierten Gewinner für künftige Spiele.

## Einmalig in Vercel einrichten

1. Auf https://console.upstash.com/ eine **Upstash Redis**-Datenbank anlegen (oder über die Vercel-Integration anbinden). Beachte die jeweiligen Limits und Kosten des gewählten Tarifs.
2. In Vercel **Project → Settings → Environment Variables** für **Production** setzen:

   ```text
   UPSTASH_REDIS_REST_URL=https://...upstash.io
   UPSTASH_REDIS_REST_TOKEN=<Standard-Token aus Upstash>
   CRON_SECRET=<zufällige geheime Zeichenfolge mit mindestens 16 Zeichen, besser 32+>
   ```

   Beispiel zur **eigenen** Generierung (NUR lokal, Secret NICHT hier in Chat/Git posten):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. Neue Version komplett ins GitHub-Repository übernehmen, damit `vercel.json` am Projekt-Root liegt, und ein **Production-Deployment** starten. Vorschau-Deployments aktivieren Vercel Cron nicht.
4. Vercel **Project → Settings → Cron Jobs** öffnen und prüfen, ob die Jobs registriert sind (11 Capture-Teile, 6 Ergebnis-Teile; jeder genau einmal pro Tag, UTC). Danach im Programm unter **Prognose gegen Ergebnis → Automatisches Lernlabor** die Statusmeldung prüfen. Beim ersten Deployment können noch `0` Einträge angezeigt werden, bis die Cron-Jobs ausgeführt wurden und passende bevorstehende Spiele gefunden wurden.

**Keine Spieler, Scores oder Prognosen müssen danach von Hand eingegeben werden.** Die vorhandenen manuellen Archiv-Funktionen bleiben nur als optionale Legacy-Funktionen erhalten. Die neue Pipeline arbeitet **ohne Browserbesuch**.

## Was täglich passiert (alle Zeiten UTC)

- **09:05–10:25:** Ergebnisse abrufen (NBA und Fußball, jeweils 3 Shards). Nur `scoreStatus = FINAL`, eindeutiges Spieler-/Spieldatum und im Voraus gespeicherte Prognosen werden übernommen. Unklare oder ausstehende Scores bleiben offen. Sorare-API-Abfragen können fehlschlagen und werden dann an einem späteren Tag erneut versucht.
- **13:00–13:50:** NBA und die vier Fußballligen in 11 getrennten Teilaufgaben laden. Nur echte Sorare-Kader-/Scoredaten und bestätigte Fixtures. Für Fußball ohne bestätigte Anstoßzeit werden ausschließlich künftige Kalendertage gespeichert. Bei NBA ist auch ein am selben UTC-Tag stattfindendes Spiel erlaubt, wenn der eindeutige verifizierte Tipoff in der Zukunft liegt.
- Der Datenbankeintrag ist per `SET NX` unveränderlich; Duplikate beim erneuten Aufruf werden ignoriert. Offizielle Ergebnisse werden separat und ebenfalls nur einmal gespeichert.
- Das Dashboard zeigt Zahl vorab gespeicherter Spieler-Spiele, finale Ergebnisse, gültige Modellpaare, MAE/RMSE/Bias, 12-Tage-Trend und Fehlerstatus des letzten Hintergrundjobs.

**Vercel Hobby:** Jeder Job darf höchstens einmal täglich laufen und kann laut Vercel innerhalb einer Stunde des geplanten Zeitpunkts ausgeführt werden. Wiederholungsversuche bei temporären Fehlern erfolgen mit einem späteren planmäßigen Job; Vercel versucht einen fehlgeschlagenen Cron-Aufruf nicht selbst sofort erneut. Eine 60-Sekunden-Funktionsgrenze ist hier vorsichtig konfiguriert; bei größeren Kadern kann es in der Praxis sinnvoll sein, die Shards zu verkleinern.

## Vorhersagequalität / Datenherkunft

- Öffentliche Sorare-Spielerlisten, verfügbare Score-Historie und offizielle Projektionen. Gegebenenfalls externe, real verfügbare Matchup-Ratings (Sorare bzw. freigegebene Anbieter). Fehlende Matchup-Daten bleiben neutral, fehlende Spielzeit wird nicht erfunden.
- Kein Zugriff auf deine private Sorare-Sammlung, keine personalisierten Kartenboni, kein OAuth-Token in Redis. Cloud-Prognosen sind **globale Modellvergleiche**, nicht eine exakte Kopie deiner manuell eingestellten Lineups.
- Die neue Cloud-Analyse betrachtet einen **rollierenden Ausschnitt der zuletzt gespeicherten 10.000 Spieler-Spiele je Sportart**; ältere Einträge bleiben in Redis vorhanden, werden aber in der Dashboard-Statistik nicht mitberechnet. Hintergrund-Ergebnisjobs betrachten einen kleineren aktuellen Ausschnitt für eine kürzere Laufzeit.
- V1.7/V1.8/V2.0 werden gleichzeitig **vor dem Spiel** eingefroren. Erforderlich sind mindestens 30 offizielle, zulässige Spieler-Spiele aus mindestens acht unterschiedlichen Tagen, bevor ein vorläufig bestes Modell angezeigt wird.
- Ein kleinerer MAE in der Vergangenheit führt **nicht** automatisch zu neuen Modellgewichten; dafür braucht es einen separaten chronologischen Holdout und eine bewusste Entscheidung. Keine falsche "KI lernt ständig"-Behauptung.

## Wann ist ein Betrieb nicht vollständig automatisch?

- Ohne gültige `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` und `CRON_SECRET` zeigt das Dashboard **Einrichtung erforderlich** und es werden keine Cloud-Prognosen gespeichert.
- Wenn die Sorare-API, Spielplanfeeds oder offizielle Scores fehlen/fehlschlagen, bleibt der Eintrag offen. Für Daten ohne eindeutig bekanntes Spiel bzw. zukünftige Anstoßzeit werden keine Daten nachträglich als Prognose erfunden.
- Nach dem ersten Deployment muss einmal überprüft werden, ob Vercel die Jobs tatsächlich ausführt. Die Log-Seite unter **Cron Jobs → View Logs** zeigt fehlgeschlagene Aufrufe. Teilfehler werden im Dashboard als Warnung angezeigt.
- Upstash API-Limits, Redis-Kosten, Sorare-Rate-Limits, Vercel-Ausführungslimits und ggf. Änderungen am Sorare-GraphQL-Schema bleiben externe Abhängigkeiten.

## Technische Übersicht

- `lib/learning-snapshot.ts` – Auswahl ausschließlich vor dem Spiel, drei unveränderliche Prognosen.
- `lib/learning-cloud.ts` – Upstash-REST-Ablage: sortierter Index, schreibgeschützte Snapshots, separate finale Scores und Jobstatus.
- `lib/learning-pipeline.ts` – Kaderabruf, Fixture-/Matchup-Enrichment, Ergebniszuordnung; feste Shards.
- `app/api/cron/predictions/[scope]/route.ts` und `app/api/cron/results/[sport]/[shard]/route.ts` – per `CRON_SECRET` gesicherte Vercel Cron-Endpoints.
- `app/api/prediction-learning/route.ts` – öffentliche Statistik ohne DB-Secrets.
- `app/components/prediction-learning-cloud.tsx` – Status- und Accuracy-Anzeige, separat vom alten lokalen Archiv.
- `tests/v34-learning-auto.test.js` – Sicherheits-/Deduplikations-/Vor-Spiel-/NBA-Zeitzonen-/Modelle-/Cloud-Mock-Tests.

## Tests und Grenzen dieser ZIP

- `npm run test:arcade`: 42 von 42 Testdateien bestanden.
- TypeScript-Semantik und JSX-Syntax der neuen Routen und UI bestanden in einem lokalen Shim-Check.
- Vollständiger Next.js-Vercel-Produktionsbuild wurde **nicht** verifiziert (in der Testumgebung ist `registry.npmjs.org` per DNS nicht erreichbar). Ein echtes Sorare-/Upstash-Live-End-to-End-Deployment konnte ebenfalls nicht ausgeführt werden; erst die Produktionslogs bestätigen die vollständige Automatisierung.
