# Markerras Sorare Helper V2.1 – Obsidian Intelligence

## Installieren mit GitHub Desktop (empfohlen)

**Ausgangslage:** Deine veröffentlichte V2.0 funktioniert. Erstelle erst einen neuen Branch; die produktive Version bleibt dadurch unverändert.

1. `markerras-v2.1-nur-update.zip` herunterladen und entpacken.
2. In **GitHub Desktop** das Repository `xboobax/markerrasorare` öffnen.
3. Oben **Current Branch → New Branch**: `lineup-doctor-v2-1`.
4. **Repository → Show in Explorer** anklicken. Das öffnet den Hauptordner deines Repositories.
5. Den **Inhalt** des entpackten Ordners `markerrasorare-main` in dieses Repository kopieren, dabei gleichnamige Dateien ersetzen. Nicht nur die ZIP-Datei hineinkopieren! Den Ordner `.git` behalten. `.env.local` und Zugangsdaten nicht überschreiben.
6. In GitHub Desktop die Änderungen überprüfen und den Commit `Markerras Sorare Helper V2.1` erstellen.
7. **Publish branch** auswählen. Vercel sollte daraus ein Preview-Deployment erzeugen, sofern es mit GitHub verbunden ist.
8. Im Preview Fußball und NBA einzeln prüfen. **Erst danach** den Branch in `main` übernehmen und die Produktionsversion aktualisieren.

Falls GitHub Desktop Dateien außerhalb deiner Erwartung anzeigt: Nicht committen, sondern zuerst das Verzeichnis vergleichen. Das kleine ZIP enthält keine `lib/sorare.ts`.

## Was ist neu?

### Lineup Doctor

Im manuellen Lineup Builder gibt es eine umfassendere Diagnose mit Risiko-, Regel- und Datenhinweisen. Für vollständig besetzte Lineups zeigt er nach Möglichkeit **bis zu drei unterschiedliche 1:1-Wechsel** mit Prognose vorher/nachher sowie Sternelimit im NBA-Bereich. Jede Wechselidee wird mit dem vorhandenen Lineup-Validator erneut geprüft (Position, keine doppelten Spieler, NBA maximal 16 Sterne). Wechsel nur auf deinen Klick, niemals automatisch. Optional: Nur als eigene markierte Karten berücksichtigen.

**Wichtig:** Der Doctor kennt weder die tatsächliche Arcade-Kartenberechtigung noch endgültige Startaufstellungen. Modelleinsatzwahrscheinlichkeiten und Risikoeinstufungen sind Schätzungen.

### Hidden Gems Finder

Ein neuer Bereich mit Spielerfotos, Schnellaktionen, Favoriten und Filtern. **NBA:** prognostizierte Punkte pro **von dir manuell eingegebenem Sternwert**; fehlende Sterne werden ausgeschlossen. **Fußball:** einfacher, transparenter Form-/Stabilitätsindex aus vorhandenen Sorare-Daten. Kein Kartenmarktwert, kein offizieller Sorare-Score. Spieler ohne ausreichende Score-Grundlage oder mit hohem DNP-Risiko werden nicht künstlich hervorgehoben.

### Data Health & Sync Center

Zeigt Datenabdeckung für Scores, L5/L10, Einzelscores, Bilder und Spielstatus, meldet fehlgeschlagene Kader und fehlende Scores. Der Abrufzeitpunkt ist der Zeitpunkt der **Server-Antwort**, kein garantierter Live-Zeitstempel der Sorare-API. Der Button „Seite neu laden“ kann weiterhin zwischengespeicherte Daten liefern; Sorare-Kaderabfragen haben regulär bis zu 15 Minuten Cache.

**Lokale Einstellungs-Sicherung:** Download und Import von Watchlist, manuellen Karten/Sternwerten, lokalen Aufstellungen, Arcade-Fortschritt, Gegnerbewertungen und Modellauswahl beider Sportarten als JSON. Beim Import wird bestätigt, bevor vorhandene Einstellungen überschrieben werden. Unbekannte Schlüssel und ungültige Dateien werden zurückgewiesen.

**Grenzen:** Keine Cloud-Synchronisierung und keine automatische Sorare-Kartensynchronisierung. **Forecast-Lab-Prognosen aus IndexedDB sind nicht in diesem Einstellungsbackup enthalten.** Diese bitte separat im Forecast Lab exportieren/importieren.

### Obsidian Intelligence Design

Dunklere Navy-/Obsidian-Panels, Mint- und Violettakzente, neue Analyse-Karten, konzentrierte Kennzahlen, mobile Layouts und reduzierte Animationen bei entsprechender Betriebssystemeinstellung.

## Bereits funktionierende Features bleiben erhalten

- Alle NBA-Spieler und die vier Fußballligen (Bundesliga, LaLiga, Ligue 1, Premier League).
- Spielerbilder, L5/L10 und die V1.7.2-/V1.8-Prognosemodelle.
- Automatischer und manueller 5-Spieler-Builder; NBA-Budget 16 Sterne.
- Watchlist, Gameweek Center, Arcade-Tracker, Collection Pulse, Forecast Lab und Tracking.
- `lib/sorare.ts` **bytegenau unverändert** gegenüber V2.0 (SHA-256: `32d3189f8de56bd2d358e179803ed297589244d0d4132b4349b7a0575d3fa8db`).

## Technik und Tests

- Neue reine Module: `lib/lineup-doctor.ts`, `lib/hidden-gems.ts`, `lib/data-health.ts`.
- Neue UI: `app/components/hidden-gems.tsx`, `app/components/data-health-center.tsx`; Erweiterung des bestehenden Builders und Dashboards.
- Neuer Regressionstest: `tests/v21-intelligence.test.js`; bisherige Tests bleiben bestehen.
- Lokal ausgeführt: `npm run test:arcade` (20 Testskripte sowie zusätzlicher asynchroner NBA-Feedtest), TS-/TSX-Prüfung mit Typ-Shims, CSS-Syntaxprüfung.
- **Nicht** lokal ausgeführt: echter Next.js-Produktionsbuild und Live-Sorare-Abfragen, da npm-Pakete und authentifizierte Netzwerkzugriffe hier nicht verfügbar sind. Daher Preview testen.

## Checkliste für den Vercel-Preview

1. Fußball → Bundesliga und „Alle vier Ligen“: Namen, Bilder, L5/L10 und Prognosen dürfen nicht verschwinden.
2. NBA → 16 Sterne: Ein Doctor-Wechsel darf das Budget nicht überschreiten und keinen Spieler doppelt wählen.
3. Hidden Gems: Bei NBA ohne Sterne kein fingierter Score-pro-Stern; nach Eintragen der Sterne erscheinen passende Kandidaten.
4. Data Health: gezielt angezeigte Datenabdeckung, lokale Sicherung herunterladbar und wieder importierbar (am besten vor dem Import Sicherung separat aufbewahren).
5. Watchlist, Forecast Lab, Lineup und Arcade Center testen. Beim Testen möglichst mit einem separaten Browserprofil arbeiten, wenn wichtige lokale Daten gespeichert sind.
