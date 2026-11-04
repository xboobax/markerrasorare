# Neon Builder Pro V3.5.0 — Clean Workspace & Quality of Life

## Neuer Aufbau

Die Benutzeroberfläche ist absichtlich kompakt und in vier Arbeitsbereiche aufgeteilt:

1. **Builder**: kompakte Kennzahlen, Liga/Team-Auswahl, einklappbarer Gameweek Center, manueller und automatischer Lineup Builder.
2. **Spieler**: Hidden Gems, Top-Prognosen, Watchlist, schnelle Spielersuche und umschaltbare kompakte Tabelle.
3. **Analyse**: Prediction Engine V2.0, Gegneranalyse, Datenqualität, Prognose-Archiv und optionales Cloud-Labor.
4. **Sammlung**: vorhandener Sorare-Karten-Sync mit NBA-Sternen und Kartenboni.

Die Inhalte bleiben beim Tabwechsel eingebunden, damit ein versteckter Arbeitsbereich keine gespeicherten Einstellungen verliert. Auf Mobilgeräten werden Tabs und Bereiche responsiv dargestellt. Das intensive Dunkel-Design verwendet dezente lila Akzente.

## Verbesserte Builder-Abläufe

- **Sticky Lineup**: Die manuelle Teamspalte bleibt auf großen Bildschirmen beim Scrollen sichtbar; auf kleineren Bildschirmen wird sie normal eingeblendet. Die Übersicht mit Punkteschätzung, NBA-Sternen und Sofortaktionen bleibt im Builder präsent.
- **Quick Filters**: Matchday Ready, Favoriten, gute Datenlage, NBA Value und Filter zurücksetzen. Die vorhandenen detaillierten Filter bleiben weiterhin verfügbar.
- **Smart Swap**: Ein prominenter Button öffnet den bestehenden geprüften Austausch-Mechanismus. Er schlägt zulässige Alternativen vor und zeigt die Prognosedifferenz vor der Bestätigung. Karten- und Regelprüfung findet vor dem Anwenden statt.
- **Lineup Doctor**: Direkter Schnellzugriff auf den finalen Aufstellungscheck. Bestehende Problemhinweise und konkrete Wechselvorschläge im Team bleiben verfügbar.
- **Teamvergleich**: Team Battle zeigt zusätzlich die nur in Team A und nur in Team B enthaltenen Spieler. Die automatische Variantenansicht zeigt Punkte-Differenz und ein-/ausgetauschte Spieler gegenüber Team 1.
- **Optimierungs-Presets**: Im **automatischen** Builder können benannte Presets pro Sportart lokal gespeichert, geladen und gelöscht werden. Gespeichert werden V3.0-Optimierungsregeln, Strategie, NBA-Profil und Diversity, Prognosemodell und der eigene-Karten-Filter. Es werden **keine Zugangsdaten**, Player-IDs oder Kartensammlungen in die Presets aufgenommen. Speicherort ist derselbe Browser; maximal zwölf Presets je Sportart.
- **Schnellere Tabellenansicht**: Im Spieler-Explorer zunächst 40 Zeilen mit „Weitere laden“, kompakte Spalten und auf Wunsch Vollansicht. Die manuelle Builder-Tabelle zeigt ebenfalls zuerst 40 statt 80 Spieler. Die große Spielersuche verwendet Reacts `useDeferredValue`, damit aufwendige Filterläufe Eingaben weniger blockieren.
- **Erweiterte Einstellungen** sind einklappbar. Manuelle Spieltagsfilter und bestehende Pro-Filter, Positionsvorgaben, Q80 und Team-Stacks wurden nicht entfernt.

## Wichtig: Vorhandene Regeln

- NBA: fünf Spieler, höchstens 16 Sterne, kein Captain; der NBA Stars Optimizer 2.1 mit seinen vier Profilen und der Diversity-Einstellung bleibt bestehen.
- Fußball: gültige Positionsverteilung inklusive zusätzlichem Slot und **50 % Captain-Bonus**.
- Keine automatische Veränderung bereits gespeicherter manueller Teams beim Anwenden von Presets.
- Bestehende Sorare-Synchronisierung, Kartenboni, Injury-Checks, verifizierter Kartenfilter sowie Prognosemodelle V1.7, V1.8 und V2.0 bleiben vorhanden.
- **Upstash ist nicht erforderlich.** `vercel.json` enthält standardmäßig **keine** Cron-Jobs. Die alte V3.4-Konfiguration liegt unverändert als `vercel.prediction-crons.optional.json` im Projekt und kann später bewusst aktiviert werden. Die normalen browserlokalen Prognosefunktionen bleiben weiterhin nutzbar.

## Update / Deployment

1. Projekt-ZIP entpacken.
2. Alle Projektdateien in das GitHub-Repository übernehmen. Beim Update muss auch die neue `vercel.json` übernommen werden, damit keine alten Cron-Jobs weiter registriert werden.
3. Eine neue Vercel-Production-Bereitstellung starten.
4. Beide Sportarten öffnen; Builder, Spieler, Analyse und Sammlung testen. Besonders den Karten-Sync, den Import bestehender lokaler Teams sowie die NBA-16-Sterne-Regel prüfen.

Die Browserdaten bleiben bei gleichem Origin und unveränderter URL normalerweise bestehen. Vor größeren Upgrades empfiehlt sich ein Backup der lokalen Einstellungen und Prognosen über die vorhandenen Exportfunktionen.

## Prüfungen und Einschränkungen

- `npm run test:arcade`: 43/43 Testdateien erfolgreich (einschließlich V3.5-Tests).
- JSX-Syntax der beiden geänderten React-Komponenten: keine Parsingfehler.
- Zusätzliche TypeScript-Integrationsprüfung mit lokalem React-/Next-Typersatz: keine Fehler in den geänderten Bereichen. **Das ersetzt kein vollständiges Next.js-Produktionsbuild.**
- Da die npm-Abhängigkeiten in der Bearbeitungsumgebung nicht zur Verfügung stehen, muss der erste vollständige Next.js-Build bei Vercel bestätigt werden.
- Reale UI-Browsertests mit Sorare-Daten und visuelle Abnahme sind noch erforderlich. Matchday-Status, verletzungsbezogene Hinweise und Scores hängen weiterhin von den verfügbaren APIs ab.
