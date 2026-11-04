# Neon Builder Pro V3.9.1 – Performance & Smooth UI

Basis: die vollständige V3.9-ZIP. Alle bisherigen Fußball-, NBA-,
Daily-Mission-, Karten- und Divination-Set-Funktionen bleiben enthalten.
Die Änderungen erfordern keine kostenpflichtige API und kein Upstash.

## Was wurde optimiert?

1. **Nur sichtbare Arbeitsbereiche aufbauen.** Die umfangreichen Spieler-,
   Analyse- und Daily-Missions-Bereiche werden erst beim Öffnen des Tabs gerendert.
   Die Sorare-Sammlung bleibt für den verifizierten Sync stets gemountet.
2. **Automatische Lineup-Suchen nur im Automatikmodus.** Der Fußball-Optimizer
   lief bisher auch dann, wenn lediglich der manuelle Builder genutzt wurde.
   Nun werden NBA- und Fußball-Suchen nur im sichtbaren automatischen Builder
   ausgeführt. Die gespeicherten Teams und Einstellungen werden nicht verändert.
3. **Schnellere Spielerlisten.** Sortierwerte wie Q80, Matchup, Spieltermin und
   NBA Value werden nur einmal pro Spieler berechnet und dann für das Sortieren
   wiederverwendet. Such-Eingaben werden mit React useDeferredValue entkoppelt.
4. **Effizientere Kartenabfragen.** Der aktive, von Sorare bestätigte
   Kartenbestand wird nach Spieler indexiert und nach Bonus vorsortiert.
   Alte Fußballsets bleiben im aktiven Besitzfilter ausgeschlossen.
5. **Prognose-Zwischenspeicher.** Reine Änderungen an Besitz, Kartenbonus,
   Sternen oder Spieler-Fixierungen erzwingen nicht länger die komplette
   V1.8/V2.0-Prognose-Neuberechnung. Änderungen an echten Prognose-Eingängen
   (Minuten, xG/xA, Gegnern, Modell) werden weiterhin korrekt verarbeitet.
6. **Ruhigere React-Updates.** Der manuelle Builder und die Sammlung nutzen
   memo-isierte Komponenten und stabile Callbacks; nicht benutzte Labs werden
   erst beim Öffnen erzeugt. Das Gameweek Center lädt erst beim Ausklappen.
7. **Flüssigeres Scrollen.** Unnötige Blur-Effekte auf den fixierten Kopfzeilen
   entfernt; die schwarze Oberfläche bleibt erhalten.

## Tests

49 Testdateien (V1 bis V3.9.1), darunter eigene Performance-Regressionen
für identische Kartenreihenfolge, begrenzte Rank-Berechnungen und Lazy-Tabs.
Die TypeScript-/TSX-Syntax der geänderten Komponenten wurde separat geprüft.

**Grenzen:** Das ist eine gezielte Code-Optimierung und kein gemessener
Lighthouse-/Browser-Profiling-Nachweis. Eine vollständige Next.js-
Produktionskompilierung war in dieser Ausführungsumgebung ohne installierte
Projektabhängigkeiten nicht verfügbar; Vercel muss den Build final bestätigen.

## Deployment

Die ZIP entpacken und alle Inhalte des Ordners `markerrasorare-main` wie
gewohnt in GitHub aktualisieren. In Vercel neu deployen. Kein neuer API-Key.
Nach dem Deployment bitte beide Sportarten, den Kartensync, die Daily Missions,
den manuellen sowie automatischen Builder ausprobieren.
