# Markerras Sorare Helper V2.5 – Arena Intelligence & Team Builder Pro

**Ausgangsversion:** V2.4.1 (funktionierende NBA-Spieltermine und Gegner, Scores, offizielle NBA-Sterne)

## Was ist neu?

### 1. NBA Double-Game Intelligence

- Im manuellen Builder kannst du einen **Spielzeitraum von 3, 7 oder 14 Tagen** auswählen. Standardmäßig sind sieben Tage eingestellt.
- Zu jedem NBA-Spieler zählt die App die **tatsächlich gemeldeten künftigen Spiele innerhalb dieses Zeitfensters**. Ein goldener Hinweis markiert Spieler mit **zwei oder mehr** Spielen, und ein ausklappbarer Bereich listet alle Gegner, Heim-/Auswärtsstatus, Datum und – soweit bestätigt – die Uhrzeit auf.
- In der rechten Spielertabelle gibt es die zusätzliche Spalte **Spiele** sowie den Filter **Nur 2+ Spiele** und die Sortierung **Mehrfachspiele**. In jedem Team-Footer steht, wie viele ausgewählte Spieler mehr als eine Partie haben.
- Die Spiele stammen aus dem bereits in V2.4.1 etablierten NBA-Spielplanfeed (BALLDONTLIE oder ESPN-Fallback). Unbekannte Spiele werden **nicht erfunden**. Wiederholte Termine aus verschiedenen Quellen werden anhand von Zeit und eindeutigem Franchise-Alias nicht doppelt gezählt.
- **Wichtige Sorare-Regel:** In entsprechenden NBA-Gameweek-Wettbewerben zählt bei mehreren Spielen der **beste Einzelspiel-Score**, nicht die Summe. Es wird daher **kein 2x- oder 3x-Prognosebonus** vergeben. Der ausgewählte 3-/7-/14-Tage-Zeitraum ist eine Scouting-Ansicht und **keine offiziell bestätigte Sorare- oder Arcade-Gameweek**. Die tatsächliche Arcade-Spielauswahl und deren Regeln vor dem Einreichen direkt bei Sorare prüfen.

### 2. Matchup Difficulty

- Auf NBA- **und Fußball**-Spielerkarten sowie in der Spielertabelle erscheint die Gegnerstärke mit farbiger Einstufung: **Mint = günstig**, **Cyan = neutral**, **Koralle = schwierig**, **Grau = unbewertet**.
- Datenquelle ist die bereits bestehende optionale BALLDONTLIE- bzw. API-FOOTBALL-Defensivstatistik oder eine manuell hinterlegte Gegnerbewertung.
- **Zusatz für NBA:** Falls der eingerichtete automatische Anbieter keine defensiven Vergleichswerte liefert, versucht das Projekt unabhängig einen öffentlichen **ESPN-Webseitenfeed** zu bereits abgeschlossenen **Regular-Season-Spielen der letzten 28 Tage**. Nur bei genügend nachweislich abgeschlossenen Partien werden Teams nach zugelassenen Punkten/Spiel in liga-relative Stufen (1–5) eingeteilt. ESPN ist inoffiziell und kann ausfallen; dann bleiben die Matchups neutral.
- **Wichtig:** Die Einstufung ist eine grobe Team-Defensivorientierung, **keine positionsspezifische Vorhersage** und keine garantierte Punkteanpassung. Die bisherige Prognoseberechnung bleibt unverändert.

### 3. Team Builder Pro

- **Team Battle:** Oben im manuellen Builder zwei Teams auswählen und vergleichen: Prognose, Floor, Ceiling, bei NBA Sterne, geschätzte Zielchance, Regel-/Datenwarnungen und gemeinsame Spieler. Grüne Zahlen kennzeichnen den höheren Modellwert (bei Warnungen ist die kleinere Zahl besser).
- **Touch-/Tastatur-Transfer:** Auf einer belegten Karte über **⤴** einen Spieler auswählen, dann die Aktion **Kopieren** oder **Verschieben / tauschen** bestimmen und anschließend den gewünschten Zielslot antippen. Das funktioniert auch ohne natives Drag & Drop und ergänzt das bisherige Ziehen.
- Kopieren zwischen Teams erhält beide Aufstellungen. Verschieben und Tauschen validiert **beide** Teams. Fixierte Spieler können nicht verschoben oder ungefragt ersetzt werden. Für NBA gelten weiterhin maximal **16 Sterne** und für Fußball unverändert die Positionsregeln.
- Der bestehende Quick Swap, die Spieler-Fixierung, Smart Auto-Fill, Forecast Lab, Lineup Doctor und alle Team-Speicherplätze bleiben bestehen.

## Stabilität

Die folgenden Dateien wurden **nicht geändert**: `lib/sorare.ts` (Scores, historische Werte und Bilder), `lib/nba-stars.ts` und `lib/nba-stars-feed.ts` (offizielle NBA-Sterne), `lib/model.ts` (Prognosemodell), die bestehenden Spiele- und Sterneabrufe. Die neuen Funktionen befinden sich in separaten Dateien bzw. der Builder-Oberfläche. Die bereits gespeicherten Teams werden über denselben `localStorage`-Schlüssel wie in V2.3/V2.4.1 geladen.

## Installation mit GitHub Desktop

1. Die ZIP **`markerras-v2.5-nur-update.zip`** herunterladen und entpacken.
2. GitHub Desktop öffnen und das bestehende Repository `xboobax/markerrasorare` auswählen.
3. **Branch → New Branch**, Name: `arena-intelligence-v2-5`. Dieser Branch soll von der erfolgreich installierten **V2.4.1** abzweigen.
4. **Repository → Show in Explorer** öffnen.
5. Den **Inhalt** des entpackten Unterordners `markerrasorare-main` in das Hauptverzeichnis des GitHub-Repositories kopieren. Gleichnamige Dateien ersetzen; vorhandenen `.git`-Ordner und eigene `.env`-Dateien nicht löschen.
6. Commit-Nachricht: `Add Arena Intelligence and Builder Pro V2.5`; **Commit** und **Publish branch**.
7. Das **Vercel-Preview** prüfen: NBA, Spieltermine, 3-/7-/14-Tage-Auswahl, Double-Game-Badges, Gegnerstärke, Team Battle, Karten kopieren/verschieben, offizielle NBA-Sterne und NBA-16-Sterne-Limit. Danach Fußballpositionen, Spielerkarten und bestehende Prognosen testen.
8. Erst wenn das Preview funktioniert, die Änderungen nach `main` übernehmen.

## Grenzen und Hinweise

- Offizielle Gameweek-Grenzen, Einreichung, Kartenberechtigung und tatsächlich für Arcade gewertete Spiele werden **nicht automatisch** mit Sorare synchronisiert.
- Gegnerstärke ist von Datenanbieter und vorhandenen abgeschlossenen Spielen abhängig. ESPN ist ein **nicht offiziell unterstützter** Fallback; bei Feed-Problemen gibt es keine erfundenen Werte.
- V2.5 erhöht NBA-Prognosen **nicht** automatisch bei mehreren Spielen; dafür müsste die konkrete Wettbewerbsauswertung einschließlich tatsächlicher Gameweek-Zuordnung separat validiert werden.
- Speicherung bleibt browserlokal. Vor Änderungen an `.localStorage` oder beim Browserwechsel die vorhandenen Sicherungsfunktionen nutzen.

## Tests

- 27 Testskripte inklusive neuer Checks für Terminfenster, Team-Aliasse, Mehrfachspiele, Gegnerbewertungen, Regelkonformität, Kopieren/Transfer und ESPN-Datenqualität.
- TypeScript-Librarytests und TypeScript-/TSX-Komponentenintegration geprüft, zusätzlich CSS-Syntax.
- **Kein vollständiger Next.js-Produktionsbuild** und **keine Live-Sorare-Abfrage** in dieser isolierten Testumgebung; vor dem Merge ein Vercel-Preview verwenden.
