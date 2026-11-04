# Markerras Sorare Helper V2.7 – Prediction Lab Pro

**Basis:** funktionierende V2.6 (Injury & Availability Center). **V2.7 ersetzt nicht** die V2.6-Datenquellen, sondern ergänzt einen aussagekräftigen Prognosevergleich für NBA und Fußball.

## Neu in V2.7

1. **Fehleranalyse nach Spieltag:** Bis zu zwölf chronologische Spieltage als Obsidian-Neon-Vergleichsgrafik. Niedrigerer MAE = genauere Vorhersage im betrachteten Archiv.
2. **Historischer Score nach Segmenten:** Auswertung nach **vorher prognostizierter Punktklasse**, Position (nur wenn beim Vor-Spiel-Snapshot gespeichert) und Verein. MAE/Bias getrennt für V1.7 und V1.8; kleine Stichproben werden gekennzeichnet.
3. **Größte Abweichungen:** Die zehn größten absoluten V1.7-Prognosefehler anhand offizieller, endgültiger Ergebnisse als Analysegrundlage.
4. **Zeitlicher Modelltest:** Experimentelle Mischungen von eingefrorenen V1.7- und V1.8-Werten werden auf älteren Tagen ausgewählt und auf späteren, ungesehenen Tagen bewertet. Ein positives Ergebnis ist nur ein **vorsichtiger Hinweis**, keine automatische Modellübernahme.
5. **Datenqualitätskontrolle:** Offene, manuell eingetragene, ältere ohne Modellvergleich, ungültige und doppelte Datensätze werden transparent angezeigt. Manuelle Scores sind weiterhin in der normalen Ergebnisübersicht sichtbar, fließen aber **nicht** in die Prüfung offizieller Modellvergleiche ein.
6. **Zeitraumfilter:** Gesamtes Archiv, letzte 30 oder letzte 90 Tage.
7. **Neue Vor-Spiel-Snapshots speichern die Position**. Ältere Archivdaten bleiben unangetastet und werden nicht nachträglich auf Basis aktueller Spielerpositionen verändert.

## Schnellinstallation über GitHub Desktop (bestehende V2.6)

1. GitHub Desktop öffnen und das Repository `xboobax/markerrasorare` auswählen.
2. Prüfen, dass V2.6 in deinem Projekt vorhanden ist. Neuen Branch z. B. `prediction-lab-pro-v2-7` erstellen.
3. `markerras-v2.7-nur-update.zip` herunterladen, entpacken. **Den Inhalt** des darin liegenden Ordners `markerrasorare-main` in den lokalen Projektordner kopieren und gleichnamige Dateien ersetzen. Den `.git`-Ordner **nicht** löschen oder überschreiben.
4. Commit-Nachricht: `Add Prediction Lab Pro V2.7`.
5. In GitHub Desktop auf **Publish branch** klicken. Vercel-Preview öffnen; zuerst NBA, dann Fußball testen.
6. Wenn der Build und das Preview passen, Branch in `main` übernehmen.

Alternativ enthält `markerras-sorare-helper-v2.7-prediction-lab-pro.zip` das gesamte Projekt, falls ein neues Repository benötigt wird.

## Wo finde ich es?

Im Bereich **Forecast Lab** befindet sich das bestehende V1.7/V1.8-Modellmenü. Weiter unten im Bereich **Prognose gegen Ergebnis** erscheint der neue Block **Prediction Lab Pro** unmittelbar unter dem bisherigen Evidence Board.

Empfohlene Reihenfolge:

- Den Haken bei **„Vor-Spiel-Snapshots automatisch sichern“** aktiviert lassen. Die App speichert bei geöffneten Seitenbesuchen bis zu 20 zulässige zukünftige Prognosen. **Ohne Browserbesuch kein Hintergrund-Speichern.**
- Regelmäßig auf **„Ergebnisse prüfen“** klicken, damit eindeutig passende `Sorare FINAL`-Einzelscores nachgetragen werden. Beim nächsten Seitenbesuch versucht die App bereits automatisch einen Abgleich.
- Nach einigen Spieltagen im **Prediction Lab Pro** die Fehlertendenzen anschauen: Ist der Fehler bei bestimmten Punktbereichen, Positionen oder Vereinen auffällig? Die Stichprobenzahl steht immer dabei.
- Die zeitlich getrennte Modellprüfung erscheint erst mit mindestens **30 offiziellen Vergleichen an acht unterschiedlichen Spieltagen**, davon mindestens 20 frühere und acht spätere Einzelscores.
- Das bisherige Standardmodell bleibt **V1.7**. Das vorhandene V1.8-Modell kann über den bestehenden Schalter manuell getestet werden; V2.7 ändert keinen Live-Score automatisch.

## Wie werden die Fehler gemessen?

- `MAE` = mittlerer absoluter Fehler (Punkte, kleiner ist besser).
- `RMSE` = größerer Einfluss großer Fehler (in der vorhandenen Übersicht).
- `Bias` = Prognose minus tatsächlicher Score; **positiv** bedeutet tendenziell zu hoch.
- `80-%-Intervall-Abdeckung` = Anteil der offiziellen Ergebnisse im vorab gespeicherten prognostizierten 10.–90.-Perzentil-Bereich. Ab zehn gültigen Intervallen angezeigt. Noch keine Garantie statistischer Kalibrierung.
- `V1.8 gewinnt` = Anteil der nicht unentschiedenen Spieler-Spiele mit kleinerem absoluten V1.8-Fehler; mindestens fünf auswertbare Entscheidungen.
- `Modell-Experiment`: Einfache Mischungen aus V1.7 und V1.8 mit 0/25/50/75/100 % V1.8-Anteil. Die Mischung wird **nur an älteren Spielen** festgelegt. Jüngere Spiele bleiben bis zur späteren Prüfung unberührt; ein Kandidat gilt erst bei mindestens drei Prozent und 0,5 Punkten geringerem Holdout-MAE als interessant. Eine echte Verallgemeinerung muss über weitere, neue Spiele bestätigt werden.

## Daten und Sicherheit

- Alle Snapshots und Ergebnisse bleiben wie bisher in deinem Browser (IndexedDB; lokaler Ersatzmodus). Keine zusätzlichen Zugangsdaten, keine neue Cloud-Datenbank.
- Alte gespeicherte Vorhersagen werden nie rückwirkend neu berechnet.
- Nur für `Sorare FINAL` markierte Ergebnisse mit gespeichertem V1.7/V1.8-Paar und **zeitlich davor** gespeichertem Snapshot zählen in die offiziellen Modellvergleiche.
- Pro Spieler und Ergebnis-Spiel ist maximal **eine** Beobachtung enthalten; bei Dubletten zählt der älteste gültige Vor-Spiel-Snapshot.
- Nicht passende Spieltage und später gespeicherte Prognosen werden ausgeschlossen.
- **Manuell eingetragene Ist-Scores** zählen nur zur älteren persönlichen Tracking-Übersicht, nicht zur offiziellen Modellprüfung.
- Bei JSON-Importen handelt es sich weiterhin um lokale Benutzerdaten; Herkunft/Unveränderlichkeit importierter Dateien ist nicht kryptografisch attestiert.
- NBA-Sorare-Sterne-Sync, Score-Abfragen, Spielplan, Verletzungscheck, 16-Sterne-Regel, Fußballslots und Builder bleiben unverändert.
- Keine Prognose kann Siege oder Ergebnisse garantieren. Ein bloß positiver MAE-Unterschied beweist weder eine echte Verbesserung noch einen wirtschaftlichen Vorteil.

## Tests und Grenzen

`npm run test:arcade` führt jetzt die Tests der V2.7-Auswertung mit den bestehenden Regressionstests aus. In der lokalen Arbeitsumgebung wurden zusätzlich TSX-Syntax und CSS-Parsing überprüft. **Ein vollständiger Next.js-Produktionsbuild und reale Vercel-/Sorare-Live-Tests stehen weiterhin aus** und müssen im Preview validiert werden.
