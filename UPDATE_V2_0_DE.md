# Markerras Sorare Helper V2.0 – Gameweek & Arcade Center

## Was ist neu?

- **Gameweek Center:** Neue Terminübersicht mit Filter 3/7/14 Tage, Datumsgruppen, aufklappbaren Partien, Spielerfotos, Profilzugriff und „+ ins Lineup“.
- **Fußball:** Spieltermine nur aus der bereits vorhandenen `nextGame`-Information der Sorare-Spieler. Ausschließlich Bundesliga, LaLiga, Ligue 1 und Premier League. Keine zusätzliche GraphQL-Abfrage, keine erfundenen Spiele/Anstoßzeiten. Die Übersicht zeigt **nicht garantiert alle Partien einer Liga**: Es sind diejenigen, die sich aus den aktuell geladenen Spielerdaten ergeben.
- **NBA:** Optionaler NBA-Spielplan über den bereits bekannten `BALLDONTLIE_API_KEY`. Ein separater, serverseitiger, für 1 Stunde gecachter Aufruf von `/v1/games` für die nächsten 14 Kalendertage. Bei fehlendem Key, API-Fehler oder unzureichendem Tarif erscheint ein Hinweis; die Sorare-Scores funktionieren weiter.
- **Arcade Board:** Persönlicher, vollständig manueller Tracker mit Level, Leben, Erfolgen und Fehlversuchen. Ergebnisse dürfen rückgängig gemacht werden. Bei Erfolg steigt das Level, Leben werden aufgefüllt; bei vier gescheiterten Versuchen beginnt das Board wieder bei Level 1. Die vier Leben entsprechen dem üblichen Sorare-Fußball-Arcade-Board, **nicht automatisch jeder aktuellen NBA-Regel**.
- **Zielübernahme:** Beliebige Score-Ziele werden lokal gespeichert. Über „Ziel im Lineup Builder verwenden“ wird das eingestellte Ziel in den vorhandenen Builder übernommen.
- **Collection Pulse:** Anzahl lokal markierter Karten, Karten mit Bonus und NBA-Karten ohne gültigen Sternwert.
- **Design:** Komplett neu gestaltete Obsidian-Command-Center-Karten mit Datumsgruppen, violettem Level-Board, mintgrünen Akzenten und responsiver Ansicht.

## Wichtige Sicherheitszusagen

- `lib/sorare.ts` ist **bytegenau identisch mit der funktionierenden V1.9**. Die V1.7.2-NBA-Reparatur und der Fußball-Score-Fix sind nicht verändert.
- Kein automatisches Einreichen von Lineups und keine Änderung an gespeicherten Karten, Watchlists oder Prognosen.
- **Kein zusätzlicher API-Key erforderlich.** NBA-Spielplan braucht einen funktionierenden BALLDONTLIE-Key; Fußball-Spieltermine und Arcade-Tracker brauchen keinen neuen.
- NBA 16 Sterne / 5 Spieler und Fußball TW / VER / MF / FWD / EX bleiben unverändert.
- Arcade-Level, Leben und Ziele werden **nur in `localStorage` des jeweiligen Browsers** gespeichert, pro Sportart getrennt. Das ist keine Sorare-Konto-Synchronisierung.
- Die Eingabe „Erfolg“/„Fehlversuch“ wird manuell gemacht. Bitte vor offiziellen Sorare-Spielregeln abgleichen.

## Installation per GitHub Desktop (empfohlen: kleines Update)

1. Aktuelle funktionierende V1.9 in GitHub als Sicherheitsbranch oder Tag sichern.
2. `markerras-v2.0-nur-update.zip` herunterladen und vollständig entpacken.
3. GitHub Desktop öffnen, Repository `xboobax/markerrasorare` auswählen und **Fetch origin** durchführen.
4. Neuen Branch `gameweek-v2-0` aus dem aktuellen Produktionsbranch (`main`) anlegen.
5. **Repository → Show in Explorer** öffnen.
6. Den **Inhalt** des entpackten Ordners `markerrasorare-main` in das lokale Repository-Hauptverzeichnis kopieren; gleichnamige Dateien ersetzen.
7. Den versteckten `.git`-Ordner **niemals** löschen. Keine privaten `.env`-Dateien oder API-Keys hochladen.
8. GitHub Desktop: Änderungen sichten, Commit Summary `Markerras Sorare Helper V2.0` eingeben, **Commit** und **Publish branch** wählen.
9. In Vercel das Preview dieses Branches prüfen. Insbesondere: alle vier Fußballligen, NBA-Score, L5/L10, Spielerbilder, manueller/automatischer Builder, NBA-Sterneprüfung.
10. Erst wenn das Preview **Ready** zeigt und die wichtigen Funktionen im Browser geprüft sind, Pull Request `gameweek-v2-0` → `main` zusammenführen.

## Test-Checkliste

- [ ] Bundesliga, LaLiga, Ligue 1 und Premier League zeigen Scores und Spielerfotos.
- [ ] NBA zeigt Scores, L5, L10 und Spielerfotos.
- [ ] Gameweek Center zeigt geladene Fußball-Partien mit den zugeordneten Spielern. Keine weiteren Ligen.
- [ ] NBA-Spielplan zeigt bei bestehendem BALLDONTLIE-Zugang Termine; ohne Zugriff eine verständliche Fehlermeldung.
- [ ] Arcade-Level, Leben und Score-Ziel bleiben nach Reload erhalten und sind sportartspezifisch.
- [ ] „Letzte Eingabe rückgängig“ stellt den vorherigen Stand korrekt her.
- [ ] „Ziel im Lineup Builder verwenden“ setzt das Ziel im bestehenden Builder.
- [ ] Klick auf Spieler öffnet Profil, „+“ fügt ihn in den manuellen Builder ein, sofern ein passender freier Slot besteht.
- [ ] NBA Lineup bleibt bei 16 Sternen maximal; Fußball EX bleibt ein Feldspieler.
- [ ] Watchlist, alte Lineups und Forecast Lab bleiben vorhanden.

## Grenzen / Datenquellen

Sorare GraphQL: https://github.com/sorare/api

BALLDONTLIE `GET /v1/games` (Start-/Enddatum): https://docs.balldontlie.io/

Arcade-Regeln: https://sorare.com/help/a/33949360053917/what-is-sorare-set-football

Das Gameweek Center behauptet ausdrücklich weder, alle Partien aus der kompletten Sorare-Datenbank abzurufen, noch aktuelle offizielle Level-/Score-Ziele zu synchronisieren. Diese Daten sind nur so vollständig wie die jeweils erreichbaren Quellfelder und die manuelle Eingabe.

## Tests im Projekt

`npm run test:arcade` führt alle bisherigen Regressionstests sowie `tests/v20-gameweek.test.js` aus. Der neue Test deckt Termin-Duplikate, Datumsgrenzen, Speicherung/Validierung der Boards, Level-Fortschritt, Undo, Kartenstatus und den isolierten NBA-Spielplanabruf ab.

Die TypeScript-/TSX-Prüfung war in der Entwicklungsumgebung erfolgreich. **Ein vollständiger Next.js-Produktionsbuild mit echten Vercel-Umgebungsvariablen war hier nicht möglich und muss im Preview geprüft werden.**
