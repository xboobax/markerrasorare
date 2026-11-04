# MarkErras Sorare Dream 4.0 — Black & Gold Preview

## Was ist neu?

MarkErras Sorare Dream 4.0 baut die Navigation und das Layout der bisherigen Version neu auf, ohne bewährte Sorare-/Scoring- und Builder-Berechnungen zu ersetzen. Das visuelle Konzept orientiert sich an den bereitgestellten Funktionsbeispielen, ist aber eigenständig umgesetzt.

### Arbeitsbereiche

| Adresse | Funktion |
| --- | --- |
| `/` | Dashboard, kompakte Navigation und Direkteinstiege |
| `/builder/football` | Fußball Set Builder, Positionen, Captain, Multi-Lineup, Strategien, Sammlung |
| `/builder/nba` | NBA Set Builder, 16-Sterne-Budget, Prognosen, Value und Diversität |
| `/daily-missions?sport=football` | Fußball Daily Mission (Aktionsindikatoren, Datensicherheit) |
| `/daily-missions?sport=nba` | NBA Daily Mission (L10+7, mindestens 20 Punkte) |
| `/match-center?sport=nba` | Spieleliste, Uhrzeiten, Modell-Vorschau und interaktives Court |
| `/match-center?sport=football` | Kostenlose verfügbare Fußball-Fixures und Spieler-Vorschau |
| `/players?sport=football` | Virtuelle Player Database mit schnellen Filtern |
| `/players?sport=nba` | Virtuelle NBA Player Database |
| `/collection?sport=football` | Aktuelles Fußball-Kartenset, Sorare-Sync und Kartenboni |
| `/analytics?sport=nba` | Bisherige lokale Analysefunktionen |
| `/guides` | Workflow, verständliche Definitionen der Werte |
| `/legacy` | Rückfallansicht mit dem bisherigen V3.9.2-Dashboard |

### Black & Gold

Die neuen Oberflächen verwenden einen tiefschwarzen Hintergrund, anthrazitfarbene Panels und dezente goldene Akzente (`#d8b65b`). Keine zusätzlichen Schriftdateien oder kostenpflichtigen Bild-/UI-Dienste.

### Spielerprofile und NBA-Teamfilter

- Spielername/Fotografie führt **nur dann** zum offiziellen Sorare-Profil, wenn die Sorare-API einen zulässigen Spieler-Slug liefert; ansonsten wird kein Link erfunden.
- Der `ⓘ`-Button öffnet die **interne** Kurz-Analyse.
- Der NBA-Adapter lässt nur die 30 bekannten NBA-Franchises in den regulären Pool. Eventteams wie Team Melo, Team Durant und Team LeBron werden nicht als reguläre Franchises geführt. Wenn die Sorare-API einen Spieler ausschließlich unter einem solchen Eventteam führt, erscheint er nicht automatisch im regulären Pool; wir raten kein alternatives Team.
- Der Fußball-Set-Abgleich aus V3.7.1 bleibt erhalten. Alte Sets gelten nicht als aktuell eigene Fußballkarten.

## Performance-Architektur

1. App-Routen laden nur den gerade benötigten Daten-/UI-Bereich.
2. Die Player Database rendert eine begrenzte sichtbare Tabellen-Teilmenge mit Scroll-Spacern statt Tausender gleichzeitiger Zeilen.
3. Suche über `useDeferredValue`; Filter/Sortierung sind memoisiert, die Liste synchronisiert die Scrollposition beim Filterwechsel.
4. Builder-Verarbeitung und Forecast-/Sammlungs-Logik bleiben von der aktuellen geprüften Version übernommen.
5. Eingeklappte Analysen werden im React-Tree des vorhandenen Dashboards möglichst nur für den aktiven Tab erzeugt. Der alte große Builder ist **noch kein vollständiger Web-Worker-Umbau**; teure Berechnungen sollten vor einem Release mit echten großen Sammlungen getestet werden.
6. Große grafische Nachbearbeitung, Animationen und Blur-Overlays werden bewusst vermieden.

## Kostenloser Betrieb

- Keine Upstash-Pflicht, keine neuen kostenpflichtigen APIs.
- Die bisherigen optionalen Cloud-Learning-Funktionen bleiben im Code, werden nicht für den regulären Betrieb vorausgesetzt.
- Kostenlose Datensätze liefern möglicherweise **keine** verifizierten Fußball-Spezialaktionen, Buchmacher-Quoten, offiziellen NBA-Starting-Fives oder proprietäre Wahrscheinlichkeiten aus SoProb. Nicht vorhandene Werte bleiben unbekannt oder werden eindeutig als Modellschätzung bezeichnet.

## Migration von V3.9.2

- Bestehende Browser-LocalStorage-Schlüssel der alten Module wurden bewusst beibehalten. Gespeicherte Teams, Filter und Presets sollen bei gleichem Browser und derselben Domain weiter angezeigt werden.
- Keine bestehende Sorare-Collection-Datenbank wird geändert oder gelöscht.
- Vor einem Produktivwechsel die alte Deployment-Version beibehalten und diese Version zuerst als **Vercel Preview Deployment** testen.
- Der `/legacy`-Pfad bietet zusätzlich die alte Oberfläche im neuen Projekt, ersetzt aber **kein** getrenntes Backup der bisherigen Deployment-Version.
- Benötigte bisherige Vercel-Environment-Variablen unverändert übernehmen. Für diese Version gibt es **keine neue Pflichtvariable**.

## Prüfung vor Produktivfreigabe

**Bereits ausgeführt:**

- `npm run test:arcade` — vorhandene Fußball-/NBA-/Bonus-/Sync-/Daily-Mission-Regressionstests inklusive V4-Neutests bestanden.
- `node tools/check-v4-syntax.js` — alle vorhandenen TS/TSX-Quelldateien transpiliert / Syntax korrekt.
- `tsc -p tsconfig.v4-domain-check.json` — neue Datenadapter / Datenbereich strenge Typprüfung.
- `node tools/dream-perf-benchmark.js` — synthetischer Such-/Sortier-/Index-Benchmark ohne Browser (kein Nachweis für FPS oder Web Vitals).

**Noch erforderlich:**

1. `npm ci` oder `npm install` und `npm run build` mit echter Next.js-/React-TypeScript-Umgebung. In dieser isolierten Bearbeitungsumgebung war die npm Registry nicht erreichbar (`EAI_AGAIN`). Ein erfolgreicher Vercel-Build ist **nicht vorab bestätigt**.
2. Vercel Preview für beide Builder öffnen, Sammlungs-Sync und Spielerprofilsprung prüfen.
3. Manuelle Fußball- und NBA-Aufstellungen sowie Auto-Builder unter vollständigen Spielerdaten testen.
4. Daily Missions, Kartensync, aktive Set-Kennung und NBA-Sonderteam-Filter prüfen.
5. Performance mit echten Daten in Chrome DevTools / Lighthouse messen. Zielwerte: INP < 200 ms, LCP <= 2,5 s bei repräsentativen Geräten; Ziel **nicht gemessen**.

## Optionaler Performance-Test

```bash
node tools/dream-perf-benchmark.js
```

Er prüft nur die algorithmische Verarbeitung synthetischer Datensätze, keine Netzwerk- oder Browser-Ladezeit. Bitte nicht mit einem echten Endnutzer-Performancewert verwechseln.

## Sicheres Deployment

1. ZIP entpacken und **nur den Inhalt des Projektordners** in einen neuen Branch (`dream-v4-preview`) deines GitHub-Repos kopieren.
2. In Vercel ein Preview Deployment dieses Branches auslösen. Bestehende Produktionsversion V3.9.2 bis zur Freigabe unangetastet lassen.
3. Build-Logs prüfen. Falls TypeScript-Fehler auftreten, den exakten Logausschnitt verwenden; nicht CSS-Warnungen mit tatsächlichen Fehlern verwechseln.
4. Gesamte Prüfcheckliste erfolgreich durchgehen, erst dann auf `main` übernehmen.
