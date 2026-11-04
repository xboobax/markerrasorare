# Neon Builder Pro V3.7 – Daily Missions als eigener Tab

## Änderungen
- **Neuer fünfter Tab „⚡ Daily Missions“**, direkt rechts neben „Sammlung“ in der oberen Navigationsleiste.
- Daily Mission Picker aus dem Builder entfernt und in den neuen Arbeitsbereich verschoben.
- Kompakte Liga- und Teamauswahl direkt im Missions-Tab. Nach Liga-/Teamwechsel bleibt der Tab geöffnet (`?tab=missions`).
- Auch beim Wechsel zwischen Fußball und NBA bleibt „Daily Missions“ aktiv.
- Top-Pick-Kompaktansicht; klar sichtbare Hinweise zur vorhandenen Datenbasis.
- Navigation auf kleinen Bildschirmen horizontal scrollbar statt fünf gequetschter Tab-Schaltflächen.
- Keine zusätzliche Datenbank, keine kostenpflichtige API, keine Upstash-Pflicht.

## Missions-Regeln
- NBA: `Score >= max(20, L10 + 7)`, mit offiziell vorhandenem Sorare-L10 und heuristischem Ranking.
- Fußball: Feldspieler (Tor, Assist, Rettung auf Torlinie), Torhüter (Elfmeter gehalten, Clean Sheet). Der vorhandene kostenlose Kaderfeed liefert **keine** Einzelereignisse zur sicheren Bestimmung dieser Aktionen. Fußball-Ranking ist deshalb bewusst nur eine Vorauswahl anhand von Form, Prognose, Einsatzdaten und ggf. bereits vorhandenen Scoutingdaten, keine Erfolgswahrscheinlichkeit.
- Keine Kartenabgabe an Sorare; „+ Builder“ öffnet den manuellen Builder.

## Installation
V3.7 ist ein vollständiges Next.js-Projekt: Inhalt des Ordners `markerrasorare-main/` in den GitHub-Projektstamm übernehmen und auf Vercel erneut deployen. `vercel.json` enthält keine Cron-Jobs. Bestehende Einstellungen im Browser bleiben durch unveränderte Storage-Keys erhalten.

## Tests
`npm run test:arcade` überprüft vorhandene Regeln sowie den neuen Missions-Tab. Ein Next.js-Produktionsbuild muss auf Vercel ausgeführt werden, falls die Build-Abhängigkeiten lokal nicht verfügbar sind.
