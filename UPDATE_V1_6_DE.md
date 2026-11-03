# Markerras Sorare Helper V1.6 – Prognosen & Bedienung

Dieses Paket baut auf der funktionierenden V1.5 auf. **Es ist kein Sorare-API- oder Datenbank-Update.** Insbesondere wurden `lib/sorare.ts` und die API-Routen nicht verändert, um die funktionierenden Scores zu erhalten.

## 1. Neue Funktionen

### Nachvollziehbarere Prognosen
- Der Score ist weiterhin ein transparentes, heuristisches Modell, **keine trainierte oder kalibrierte Wahrscheinlichkeit**.
- Die Prognose berücksichtigt Sorare-Projektion, historische Scores sowie vorhandene Sorare-Durchschnittswerte. Wenige Einzelscores bekommen geringeres Gewicht, damit ein einzelner Ausreißer nicht die Prognose dominiert.
- Unter *Spielerprofil → Wie entsteht die Prognose?* sind alle tatsächlich verwendeten Quellen mit Score und Anteilen sichtbar. Eine vorhandene Matchup- und Minutenkorrektur wird separat ausgewiesen.
- Ein Formtrend (steigend / stabil / fallend) erscheint nur bei hinreichend vielen historischen Einzelscores. Er ändert den prognostizierten Score **nicht** noch einmal.
- Wenn keine belastbare Score-Eingangsgröße vorliegt, zeigt die Spielersuche ein „—“ statt 0,0 Punkten. Die Spieler bleiben trotzdem auffindbar.
- Die Suchoption **„Nur Spieler mit mindestens einer Score-Datenquelle“** hilft beim Durchsehen der Tabellen, ohne den vollständigen Datenbestand generell zu beschneiden.

### Manueller Lineup Builder
- Unterhalb einer vollständigen, nach Builder-Regeln gültigen Aufstellung siehst du bis zu fünf Vorschläge für **jeweils genau einen freiwilligen Spielerwechsel**, geordnet nach prognostiziertem Punktgewinn.
- Jede Empfehlung berücksichtigt Fußballpositionen (TW / VER / MF / FWD / EX), unterschiedliche Spieler und in NBA die 16-Sterne-Grenze.
- Wahlweise nur als „Meine Karte“ markierte Spieler verwenden.
- **Nichts wird automatisch ausgetauscht.** Erst der Klick auf „Wechsel übernehmen“ aktualisiert das Lineup, danach lässt sich der neue Score sofort vergleichen.
- Es handelt sich um lokale Ein-Schritt-Vorschläge aus den geladenen Spielern, **nicht um einen mathematischen Nachweis**, dass das gesamte Lineup global optimal ist.
- Ein Datencheck markiert Spieler mit niedriger Modell-Einsatzquote, schlechter Datenlage oder ohne historische Einzelscores.

## 2. Was unverändert bleibt

- NBA-Lineups: 5 Spieler und höchstens 16 manuell vergebene Sterne.
- Fußball-Lineups: genau TW / VER / MF / FWD / EX; ausschließlich Bundesliga, LaLiga, Ligue 1, Premier League.
- Bestehende Sorare-Abfragen und Score-Endpunkte bleiben bytegenau unverändert.
- Automatischer Builder und seine vier Strategien bleiben erhalten.
- Spielerbilder, Profile, Matchups, Karten-Markierungen, drei gespeicherte Aufstellungen und Prognose-Tracking bleiben erhalten.
- Browser-Speicher-Schlüssel wurden **nicht** geändert: Vorhandene Markierungen und Lineups bleiben auf derselben Website im selben Browser zugänglich.

## 3. Upgrade per GitHub Desktop und Vercel

1. Aktuelle funktionierende V1.5 behalten und auf GitHub einen neuen Branch `helper-v1-6` erstellen.
2. Dieses ZIP entpacken und **den Inhalt** des Verzeichnisses `markerrasorare-main` in den lokalen Repository-Ordner kopieren; gleiche Dateien ersetzen. `.git` sowie lokale `.env`-Dateien nicht löschen oder hochladen.
3. In GitHub Desktop Commit Summary `Markerras Sorare Helper V1.6` eintragen, Commit ausführen und `Publish branch` / `Push origin`.
4. Auf Vercel das Preview-Deployment für `helper-v1-6` prüfen. In beiden Sportarten Spielerprofil, L5/L10, Bilder, Suche und manuelle Lineups testen.
5. Erst bei erfolgreichem Preview den Branch per Pull Request nach `main` übernehmen.

**Wichtig:** Ohne vollständigen Next.js-Build mit installierten Abhängigkeiten und echten API-Zugang kann ein Vercel-Deployment weiterhin fehlschlagen. Die Änderung ist nicht automatisch live und ersetzt auch nicht die produktive Website.

## 4. Was technisch geprüft wurde

- `npm run test:arcade`: bestehende Testgruppen plus neue V1.6-Tests.
- TypeScript-Check der React-/Next-Komponenten in einer lokalen Testumgebung mit Typ-Stubs.
- Neue Tests: wenige historische Scores, Prognosequellen-Gewichte, Trend nur bei genug Daten, keine vorgeschlagenen Doppelspieler, Positions-/Sterneregeln, `Nur meine Karten`.

Ein echter Vercel-Build und Live-Sorare-Daten wurden **nicht** getestet.

## 5. Datenschutz & Hinweise

- Kein neuer API-Key notwendig. Vorhandene API-Schlüssel gehören weiterhin ausschließlich in Vercel Environment Variables.
- Die vereinfachte Einsatzwahrscheinlichkeit ist weiterhin eine Modellannahme und nicht die offizielle Startelf-Wahrscheinlichkeit.
- „Meine Karten“ ist eine lokale manuelle Markierung und kein Besitznachweis.
- Eine 1-zu-1-Empfehlung beachtet die hier abgebildeten Arcade-Regeln; Karten-/Set-Berechtigung bitte vor Sorare-Abgabe prüfen.
