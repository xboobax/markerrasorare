# Markerras Sorare Helper V2.3 – Builder Workspace Redesign

## Was ist neu?

Der manuelle Lineup Builder wurde anhand der **vier Screenshots des Nutzers** neu aufgebaut:

- **Links** bis zu sechs parallel sichtbare Teams; vier leere bzw. migrierte Teams beim ersten Start.
- **Rechts** eine große, scrollbar sortierbare Spielertabelle mit Suche, Positionen, Matchups, Form-Mini-Balken, L5/L10, Einsatzmodell, Projektion, Floor, Ceiling, NBA-Sternen oder Fußball-Bonus.
- **Oben** Zeithorizont, Spielerpool, Auto-Strategie, Team-Duplikation und Undo.
- **NBA-Spielerkarten** mit Spielerfoto, Position, L5, Score-Ø, offiziellen Sorare-Sternen, prognostiziertem Score, Floor/Ceiling und Gegnerinformationen.
- **Fußball-Spielerkarten** mit TW / VER / MF / ST / EX, geschätzter Einsatzwahrscheinlichkeit, L5, Kartenbonus, Score-Bereich und Matchup-Informationen.
- Spieler im Tabellenbereich direkt dem **aktiven Team** hinzufügen. Bei ausgewähltem Slot wird nur dieser Slot belegt/gewechselt. Eine bestehende Auswahl wird nicht ohne explizite Slot-Auswahl überschrieben.
- Für jedes Team: Auto-Fill (mit Rückfrage beim Überschreiben), Kopieren, Duplizieren, Leeren, Entfernen, Ein-/Ausklappen, eigenes Ziel sowie Zugriff auf den Lineup Doctor und geprüfte Wechselvorschläge.
- Automatisches, lokales Speichern aller Teams. Beim ersten Öffnen Migration der **V2.2-Auswahl und drei bisherigen Speicherplätze** nach Team 1 bis Team 4. Die bisherige Browser-Speicherung bleibt unverändert als zusätzliche Sicherheitskopie erhalten.
- Bei fehlendem offiziellem NBA-Sternwert ist ein **deutlich gekennzeichneter manueller Ersatzwert** direkt in der Spielertabelle möglich.
- Alles im Obsidian-Dark-Mode mit violetten Akzenten, Mint-Score-Badges, kompakten Cards, Sticky-Tabellenkopf und adaptiven Layouts.

## Nach wie vor erhalten

Das bisherige **Arcade Intelligence Studio V2.2** bleibt über **„Automatisch optimieren“** erreichbar. Die ursprünglichen Forecast-Lab-Prognosen, Backtesting, Hidden Gems, Data Health, Watchlist, Gameweek Center und Arcade Tracker sind unverändert. Der Spielerpool ist nur so umfangreich, wie die ausgewählte Liga/das ausgewählte Team tatsächlich geladen wurde.

**Ausdrücklich unverändert:** `lib/sorare.ts`, `lib/nba-stars.ts`, `lib/nba-stars-feed.ts`, `lib/model.ts`, `lib/arcade.ts` und die API-Routen. Keine neue Sorare-Abfrage, kein neuer API-Key.

## Bedienung

1. In deiner bestehenden Navigation zum **Lineup Builder** und zum Tab **„Selbst aufstellen“** gehen.
2. Oben **Zeithorizont** und **Spielerpool** auswählen. Bei Fußball ggf. im bisherigen Liga-Filter alle vier Ligen laden.
3. Links auf den Teamnamen klicken, um es als aktiv zu markieren; anschließend rechts mit **+** Spieler hinzufügen.
4. Für einen gezielten Wechsel auf der betreffenden Spielerkarte oben rechts **✎** anklicken, danach rechts den neuen Spieler mit **+** auswählen. Positions- und NBA-Sterneregeln bleiben aktiv.
5. Ein Team kann mit **✦** automatisch befüllt werden. Bei bereits besetzten Teams ist eine Rückfrage nötig. Die globale Spielerpool-Auswahl (alle/eigene/Favoriten/gute Daten) wird beachtet.
6. **ZIEL** ist je Team separat anpassbar. Ohne Eingabe wird das allgemeine Score-Ziel des Builders verwendet. „Arcade-Ziel“ sucht im beschränkten Kandidatenpool nach einer vielversprechenden Variante, keine garantierte oder mathematisch globale optimale Lösung.
7. Änderungen werden automatisch **in diesem Browser** gesichert. Mit Team kopieren/Undo arbeiten. Mehrere unterschiedliche Teams können dieselben Spieler enthalten; innerhalb eines Teams sind Duplikate verboten.

## Daten und Grenzen

- **Einsatz%** ist die schon vorhandene **Modellschätzung**, keine live verifizierte Startelfwahrscheinlichkeit.
- **Form-Balken** verwenden tatsächlich geladene Sorare-Einzelscores; fehlen diese, wird keine Kurve erfunden.
- **Datum** wird nur angezeigt, wenn die vorhandenen Sorare-Daten ein Datum enthalten. Weil keine verlässliche Uhrzeit vorliegt, sind 24-/72-/168-Stunden-Filter **kalendertagbasierte Näherungen**, keine exakten Lock-Filter.
- Die Sterne stammen – wenn der Abruf funktioniert – aus Sorare `gameplayTierStars`. Bei einer laufenden Gameweek können die offiziell festgeschriebenen Sternkosten davon abweichen. Vor dem Einreichen auf Sorare prüfen.
- **Kartenbesitz, Bonus, gesetzte Ziele und Teams** sind lokale Werte. Ein Team wird **nicht** automatisch bei Sorare eingereicht. Forecast-Lab-Snapshots sind weiterhin separat zu sichern.
- Die gesamte Webseite ist nicht als externe Sorare-Oberfläche ausgegeben. Die vorliegenden Screenshots dienten als gestalterische Referenz.

## Update mit GitHub Desktop (empfohlen)

1. Deine aktuelle, funktionierende **V2.2** sichern (Commit/Tag). Uncommittete Änderungen vorher sichern.
2. `markerras-v2.3-nur-update.zip` herunterladen und **entpacken**.
3. In GitHub Desktop dein Repository `xboobax/markerrasorare` öffnen und einen neuen Branch `builder-workspace-v2-3` erstellen.
4. **Repository → Show in Explorer** öffnen und den **Inhalt** des entpackten Ordners `markerrasorare-main` in dein vorhandenes Projektverzeichnis kopieren. Gleichnamige Dateien ersetzen, den `.git`-Ordner nicht löschen.
5. In GitHub Desktop Änderungen prüfen; Commit `Redesign Builder Workspace V2.3` erstellen und **Publish branch** klicken.
6. Im Vercel-Preview NBA und Fußball testen. Erst danach in `main` übernehmen.

### Preview-Checkliste

- NBA: Spielerbilder und L5/L10 weiterhin vorhanden; offizielle ★ laden. Fünf Spieler auswählen, Sternsumme max. 16, keine Duplikate. Teste Ersatzsterne bei einem Spieler ohne offiziellen Wert.
- Fußball: Ein TW, VER, MF, ST, EX. Beim Anklicken eines Slots nur passende Spieler in der Tabelle. Ein zusätzlicher TW ist kein gültiger EX.
- Vier Teams unabhängig bearbeiten, Duplikation, Undo, Wechselvorschläge und Auto-Fill ausprobieren. Seite neu laden: die Teams müssen lokal erhalten bleiben.
- Prüfe die im V2.2 gespeicherte manuelle Aufstellung und Varianten nach der ersten Migration. Das ursprüngliche V2.2-Storage wird nicht gelöscht.
- Im Tab „Automatisch optimieren“ das bestehende Arcade Intelligence Studio testen, außerdem Hidden Gems, Gameweek, Data Health und Forecast Lab.
- Mobile Darstellung: Teams zuerst, darunter horizontale Spieler-Tabelle.

## Tests

- `npm run test:arcade` umfasst nun **23 Testgruppen**, darunter Migration, NBA-Sternbudget, Fußballpositionen, Spielterminfilter, Duplikate.
- Separate TypeScript-/TSX-Integrationsprüfung und CSS-Syntaxprüfung durchgeführt.
- Bytevergleich wichtiger Sorare- und NBA-Sterne-Dateien mit V2.2: unverändert.
- Ein vollständiger Next.js-Produktionsbuild und Live-Sorare-Aufrufe konnten in dieser Umgebung mangels installierter Next.js-Abhängigkeiten bzw. externer API nicht ausgeführt werden. Das Vercel-Preview ist deshalb der letzte Pflichtschritt.
