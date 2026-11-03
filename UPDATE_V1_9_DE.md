# Markerras Sorare Helper V1.9 – Obsidian Studio

## Installation über GitHub Desktop (empfohlen: kleines Update)

**Ausgangsbasis:** Deine funktionierende **V1.8** inklusive des bestätigten **V1.7.2-Sorare-Adapters**.

1. Öffne GitHub Desktop und wähle das Repository `xboobax/markerrasorare`.
2. Sichere deinen funktionierenden Stand, indem du oben `Current Branch → New Branch` wählst und `lineup-studio-v1-9` erstellst.
3. ZIP `markerras-v1.9-nur-update.zip` entpacken. **Nur den Inhalt** des Ordners `markerrasorare-main` kopieren.
4. In GitHub Desktop `Repository → Show in Explorer` auswählen, die neuen Dateien in genau diesen Repository-Hauptordner kopieren und gleichnamige Dateien ersetzen.
5. **Nicht** `.git`, `lib/sorare.ts`, `.env.local` oder API-Schlüssel löschen oder verändern. Der kleine Update-ZIP enthält ausdrücklich keine `lib/sorare.ts`.
6. Zurück in GitHub Desktop: Änderungen prüfen, Summary `Markerras Sorare Helper V1.9 – Lineup Studio`, dann `Commit to lineup-studio-v1-9` und `Publish branch`.
7. In Vercel das Preview-Deployment des Branches öffnen. **Nicht sofort auf `main` mergen.**
8. Erst nach erfolgreichem Build und allen unten aufgeführten Funktionstests den Pull Request nach `main` zusammenführen.

Wenn GitHub Desktop keine Änderungen anzeigt: Prüfen, ob der Inhalt wirklich im Repository-Stamm liegt und nicht versehentlich ein zusätzliches `markerrasorare-main` im Repository erzeugt wurde.

## Was neu ist

### A. Smart Lineup Assistant

Im manuellen Lineup Studio findest du den neuen Bereich „Dein Smart Lineup Assistant“. Er wertet **deine aktuell ausgewählten Karten** aus:

- Noch freie Plätze und ungültige Positionen
- Fehlende oder zu hohe NBA-Sterne (maximal 16 bei genau fünf verschiedenen Spielern)
- Spieler ohne gemeldetes Spiel, geringe Einsatzwahrscheinlichkeit und unzureichende Score-Daten
- Karten ohne bestätigten Besitz (nur lokal markiert)
- Abstand der Prognose zum optionalen Arcade-Score-Ziel
- Den besten bereits regelgeprüften **optionalen** 1-zu-1-Tausch einschließlich Prognose vorher/nachher

Der Assistant **ändert niemals selbstständig deine Auswahl**. Er macht keine Aussage über bestätigte Startaufstellungen und berechnet keine garantierten Gewinnchancen. Nach dem Klick auf „Wechsel übernehmen“ entscheidet die bestehende Tauschlogik über den konkreten Wechsel.

### B. Spieler direkt hinzufügen

- Im Spielerprofil gibt es **„+ Direkt in mein Lineup“**.
- Auch in der großen Spielersuche steht jetzt bei jedem Spieler **„+ Lineup“**.
- Der Spieler wird in den **ersten freien, positionsgerechten Slot** des manuellen Builders eingesetzt.
- Wird der Spieler bereits verwendet oder ist kein passender Slot frei, bleibt das Lineup **unverändert** und es erscheint eine verständliche Meldung.
- Beim NBA-Slot prüft der Builder wie bisher, ob deine Sterne korrekt erfasst und insgesamt höchstens 16 sind. Der Schnellzugriff erfindet **keine** Sterne.

### C. Varianten duplizieren und teilen

- **„Variante duplizieren“** erstellt eine unabhängige Kopie der aktuellen Aufstellung im nächsten freien der drei lokalen Speicherplätze. Existieren bereits drei gespeicherte Aufstellungen, wird nichts ungefragt überschrieben.
- **„Lineup kopieren“** kopiert die aktuelle Aufstellung als Klartext in die Zwischenablage, sofern der Browser die Berechtigung gewährt.
- Vorhandene Speicherplätze, gespeicherte Aufstellungen und automatisch vorgeschlagene Lineups bleiben erhalten.

### D. Favoriten / Watchlist

- Stern-Button **☆ / ★** in Spielersuche und Spielerprofil.
- Eigener Watchlist-Bereich mit Portrait, Team, Score und **„+ Lineup“**.
- Filter **„★ Nur Favoriten“** in der Spielersuche.
- NBA- und Fußball-Watchlists sind getrennt und werden nur auf dem aktuellen Gerät im Browser gespeichert.
- Eine gespeicherte Favoriten-ID wird nicht geladen, wenn deren Liga/Team aktuell nicht im Datenbereich enthalten ist. Wechsle ggf. zu „Alle vier Ligen“ bzw. „Alle Teams“.
- Favorit bedeutet **nicht**, dass du die Karte besitzt.

### E. Suche & Design

- Taste **/** (außerhalb von Eingabefeldern) fokussiert die Spielersuche und scrollt dorthin; Escape beendet die Fokusauswahl.
- Ab zwei Zeichen erscheinen bis zu sechs Schnelltreffer mit Spielerfoto, Profilzugriff und **direktem Plus-Knopf** für den Builder. Diese Vorschläge stammen ausschließlich aus dem geladenen Datenbereich und verursachen keine neuen API-Aufrufe.
- Suchfeld leeren, Favoritenfilter und direkte Schnellnavigation.
- „Obsidian Studio“: dunkles Navy/Obsidian-Theme, violette Akzente, mintgrüne Prognosewerte, dezente Lichteffekte, bessere Kontraste, hochwertigere Karten, mobile Breakpoints und reduzierte Bewegung bei entsprechender Betriebssystem-Einstellung.
- Die Vorschaubilder laden wie zuvor ausschließlich aus dem bestehenden Sorare-Datensatz. Es werden keine Bild-URLs geraten.

## Unverändert gelassen

- **`lib/sorare.ts` ist byteidentisch zu V1.8 / V1.7.2.**
- Fußball weiterhin **nur Bundesliga, LaLiga, Ligue 1, Premier League**.
- NBA weiterhin fünf Spieler, **maximal 16 Sterne**, auch in 0,5er-Schritten.
- Spielerbilder, Statistikfelder L5/L10, Matchup-Feeds, Forecast Lab, Archiv und Backtesting.
- Eingetragene Sterne/Boni, bereits gespeicherte manuelle Lineups und Tracking-Einträge (bisherige Storage-Keys bleiben gleich).
- Kein neuer API-Key und kein neues Vercel-Projekt erforderlich.

## Preview-Checkliste

1. Auf **NBA** wechseln, Spieler-Scores, Ø, L5, Fotos und Gegner prüfen. Beispielsweise einen Guard per „+ Lineup“ übernehmen; Sterne angeben und ein vollständiges Lineup bis maximal 16 Sterne testen.
2. Auf **Fußball** wechseln und alle vier Ligen prüfen. TW, VER, MF, FWD und EX müssen unterschiedliche Spieler aufnehmen; EX darf kein Torwart sein.
3. Einen Spieler als Favoriten markieren, Seite neu laden und überprüfen, ob er in der Watchlist erscheint. Mit dem Favoritenfilter suchen. NBA- und Fußballliste getrennt prüfen.
4. Im Spielerprofil „+ Direkt in mein Lineup“ anklicken. Ein schon besetzter oder unpassender Slot darf **nicht** heimlich überschrieben werden.
5. Ein Lineup als Variante duplizieren, ändern und die ursprüngliche gespeicherte Variante laden. Bei drei belegten Speicherplätzen darf nicht still überschrieben werden.
6. Im Smart Assistant nachvollziehbare Hinweise zu Spielern ohne Scores/Spiel und zur 16-Sterne-Grenze prüfen.
7. Den bisherigen automatischen Builder, das Forecast Lab und das Prognose-Tracking öffnen.
8. Ansicht auf Smartphone testen. Auf Vercel muss das Preview den Status **Ready** erreichen.

## Technischer Teststand / Grenzen

- `npm run test:arcade`: alle 18 Testgruppen erfolgreich (17 bestehende + V1.9).
- TypeScript-/TSX-Check mit separatem React/Next-Shim erfolgreich.
- CSS-Stylesheet syntaktisch geprüft.
- **Kein vollständiger Next.js-Build und kein authentifizierter Sorare-Live-Abruf in dieser Umgebung**: erst durch Vercel-Preview verifizierbar.
- Daten liegen weiterhin lokal im Browser; für Watchlist und Lineups existiert derzeit keine Geräte-Synchronisation.
- Der Smart Assistant verwendet bewusst die bestehenden heuristischen Prognosen. Es wird **keine statistisch nachgewiesene Genauigkeitssteigerung behauptet**.

Bei einem Problem das Preview nicht nach `main` übernehmen. Die bestehenden V1.8-Dateien und das letzte stabile Deployment behalten und die Build- oder Runtime-Fehler bei Vercel ansehen. Zugangsschlüssel niemals teilen.
