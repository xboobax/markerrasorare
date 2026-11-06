# V4.5.12 – Fast Navigation / UI Performance

## Problem
Bei jedem Wechsel zwischen Football/NBA Builder, Analytics, Scouting und Daily Missions wurde derselbe öffentliche Sorare-Kader über zahlreiche Vereinsaufrufe zusammengestellt. Die Router-Navigation zeigte erst nach Abschluss eine neue Seite an. Sichtbare Navigationselemente konnten zudem viele schwere Routen gleichzeitig vorladen.

## Änderungen
- Gemeinsamer Next.js-Server-Cache (`unstable_cache`) für die **öffentlichen** Workspace-Daten, nach Sport, Liga und Verein getrennt. Aktualisierung nach 180 Sekunden. Der bestehende Feed- und Prognosecode bleibt erhalten.
- Fehlgeschlagene oder unvollständige Kader werden nicht als erfolgreich zwischengespeichert. Die bisherigen Unvollständigkeitsmeldungen bleiben sichtbar.
- `loading.tsx` für die Hauptarbeitsbereiche: ein sofortiger, minimalistischer Platzhalter statt eines scheinbar eingefrorenen Bildschirms.
- In der Hauptnavigation und auf der Startseite werden nicht mehr alle datenintensiven Routen im Hintergrund vorab geladen.
- Keine globalen neuen Menüs, keine unnötigen Boxen oder Animationen. Seitenleiste bleibt bei der Navigation erhalten.

## Grenzen
- Erste Kaderabfrage eines bisher nicht geladenen Bereichs benötigt weiterhin Netzwerklatenz; danach können Builder, Analytics, Scouting und Missions dieselbe Kurzzeit-Cache-Version verwenden.
- Der eigentliche Geschwindigkeitsgewinn muss mit dem produktiven Vercel-Deployment gemessen werden.
- Kein neuer SQL-Befehl, kein Cronjob und kein externer Cache-Dienst (kein Upstash).
- Bei Spieler- oder Karten-Sync bleibt der private Sorare-Abruf bewusst ungeteilt und unverändert.

## Test
`npm run test:performance-v4512` führt die neuen Cache-/Navigationsregressionen sowie die V4.5.11- und Syntaxprüfungen aus. Vor Deployment zusätzlich `npm run build` in einer Umgebung mit installierten Abhängigkeiten.
