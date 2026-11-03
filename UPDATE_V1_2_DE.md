# Markerras Sorare Helper V1.2 – Spielerprognosen, Fotos & Lineup Builder

## Änderungen

- **Spielerfotos:** Sorare `pictureUrl` wird bei Fußball (Avatar-Derivat) und NBA (falls das NBA-GraphQL-Schema das Feld unterstützt) angefragt. Die UI zeigt Bilder in Suchergebnissen, Top-Picks und Lineup-Slots. Nicht vorhandene/defekte Bild-URLs führen zu einem Initialen-Platzhalter. Die Statistik „Spielerbilder“ zählt vorhandene URL-Felder; sie prüft nicht, ob jede Bilddatei tatsächlich erreichbar ist.
- **Neue Prognose:** Sorare-Projektion, letzte 5 und bis zu 10 historische Scores werden gewichtet. Angezeigt werden L5, risikogewichtete Prognose, heuristischer Floor und Ceiling sowie ein Indikator für Datenabdeckung. Verletzungs- und Einsatzdaten bleiben in der Prognose berücksichtigt.
- **Lineup-Strategien:** Ausgewogen, Sicher (Floor) oder Offensiv (Ceiling). Die strategische Auswahl ändert die Optimierungsreihenfolge – der angezeigte Prognosewert bleibt der risikogewichtete Erwartungswert.
- **Spieler fixieren/ausschließen:** In der Tabelle pro Spieler steuerbar. Fixierte Spieler müssen zum gewählten Regelset passen; bei NBA werden weiterhin fünf eindeutige Spieler und höchstens 16 Sterne zugelassen. Bei Fußball weiterhin TW/VER/MF/FWD/EX, kein zusätzlicher Torwart.
- **Gesamterwartung und Prognose-Spanne** im Builder; verschiedene Lineups werden vergleichbar angezeigt.
- **Alle bestehenden Fußball-Ligafilter:** Bundesliga, LaLiga, Ligue 1, Premier League. Der Fix für `English League Players` bleibt erhalten.

## Wichtige Einschränkungen

- Die Live-Sorare-API und ein kompletter Next.js-/Vercel-Produktions-Build konnten in der Bearbeitungsumgebung nicht durchgeführt werden. Ein API-Abgleich **auf deinem Vercel-Preview** ist nötig. Die GraphQL-Adapter besitzen Rückfallstufen, damit ein nicht verfügbares Bildfeld nicht das Nachladen von Spieler-Scores verhindert.
- Eine **100-%-Abdeckung mit echten Spielerfotos** lässt sich nicht garantieren. Fehlt `pictureUrl` für einen Spieler oder unterstützt der NBA-Datentyp das Feld nicht, erscheint ein korrekt beschrifteter Initialen-Platzhalter – es werden keine fremden Bilder geraten.
- Floor und Ceiling sind modellierte, **nicht kalibrierte** Spannen, keine garantierten Mindest-/Höchstwerte. Die Kennzeichnung „hoch/mittel/gering“ bezieht sich ausschließlich auf die vorhandenen Datenpunkte, nicht auf statistische Vorhersagepräzision.
- Das Modell verwendet **keine** externen Live-Verletzungsnews, NBA-Gegner-Defense, Fußball-xG oder Spielminutenprognose. Dafür wären zusätzliche geprüfte Datenquellen erforderlich.
- Die Reihenfolge von `rawPlayerGameScores(last:10)` wird als neueste Werte zuerst angenommen. Falls Sorare die Reihenfolge ändert, muss L5 angepasst werden.
- NBA-Sterne und Kartenboni werden weiterhin manuell eingegeben, die lokale Kartenliste ist **keine** synchronisierte Sorare-Collection. Die Karteninformationen werden lokal im Browser gespeichert.

## Vercel / GitHub Desktop

1. Einen neuen Branch (z. B. `helper-v1-2`) von deinem aktuellen funktionierenden `main` erstellen.
2. ZIP entpacken, **Ordnerinhalt** von `markerrasorare-main` in den lokalen GitHub-Projektordner `markerrasorare` kopieren und gleiche Dateien überschreiben. `.git` beibehalten, `.env`-Dateien und echte Schlüssel nicht hochladen.
3. In GitHub Desktop Commit Summary `Markerras Sorare Helper V1.2 - Prognosen und Lineups`, **Commit**, danach **Publish branch**.
4. Vercel-Preview des Branches abwarten und folgende Checks machen:
   - Fußball Bundesliga, LaLiga, Ligue 1, Premier League: Spieler erscheinen und Ligafilter funktionieren.
   - NBA-Spieler erscheinen und Sterne (1–5, 0,5er-Schritte) sind nutzbar.
   - Fotoanzeige unter Spieler Explorer und Top Picks; die Bildzähler zeigen, ob das NBA-Bildfeld unterstützt wird.
   - Ausgewogen/Sicher/Offensiv, `Fixieren` und `Sperren` ausprobieren.
   - Kontrollieren, dass keine NBA-Aufstellung mehr als 16 Sterne hat und Fußball-EX kein Torwart ist.
5. Erst nach erfolgreichem Test den Branch per GitHub Pull Request in `main` übernehmen.

## Tests

Lokales Terminal im Projektordner:

```bash
npm install
npm run test:arcade
npm run build
```

Während der Erstellung bestanden die Typprüfung der Kernmodule und alle 4 Testskripte einschließlich der V1.2-Tests; die TSX-Datei wurde syntaktisch geprüft. Der vollständige `npm run build` wurde hier **nicht** ausgeführt, weil die benötigten npm-Pakete nicht offline vorlagen.
