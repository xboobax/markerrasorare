# Markerras Sorare Helper V2.4 – Obsidian Neon Builder

## Überblick

V2.4 erweitert den V2.3-Workspace anhand der vier vom Nutzer gelieferten Screenshots. Der Aufbau bleibt: **links mehrere Teams mit fünf Spieler-Kacheln, rechts ein durchsuchbarer Spielerpool, oben die Steuerzentrale**. NBA und Fußball erhalten weiterhin getrennte Kartendetails. Diese Version ist ein echtes Code-Update, nicht nur eine Design-Vorschau.

### Neue Funktionen

1. **Neon Dark-Mode-Design:** Electric Purple `#A855F7` für Auswahl, Neon Mint `#2EE6B5` für Prognosen, Cyber Cyan `#22D3EE` für Formwerte, Gold `#FBBF24` für offizielle NBA-Sterne und Fußballboni, Koralle `#FB7185` für Risiken. Die neuen CSS-Regeln betreffen den Builder und ersetzen nicht das Design der anderen App-Bereiche.
2. **Spieler pro Team fixieren:** Auf jeder besetzten Karte mit dem Schloss-Symbol den Spieler fixieren/entsperren. Fixierte Spieler können nicht versehentlich entfernt, im Quick Swap ersetzt oder per Drag & Drop verschoben werden. Die Sperre wird gemeinsam mit der jeweiligen Team-Aufstellung lokal gespeichert. Du kannst denselben Spieler unabhängig in anderen Teams verwenden.
3. **Smart Auto-Fill:** Der Stern-/Auto-Fill-Knopf ergänzt **nur leere Slots**. Bereits vorhandene Spieler werden nie überschrieben oder umsortiert. Das Verfahren beachtet NBA (fünf verschiedene Spieler, maximal 16 Sterne), Fußball (TW/VER/MF/ST/EX), die aktuelle Spielerpool-Auswahl und Ausschlüsse. Ungültige oder nicht vervollständigbare Aufstellungen bleiben unverändert. Das Ergebnis ist die beste gefundene Variante eines **begrenzten Suchverfahrens**, keine global garantierte Optimallösung.
4. **Drag & Drop:** Spielerzeilen aus der Tabelle auf Team-Slots ziehen. Auch Spielerkarten innerhalb eines Teams oder zwischen Teams bewegen beziehungsweise tauschen. Ein ungültiger Tausch wird abgelehnt und verändert keine Aufstellung. Für Smartphone/Tablet und Tastatur weiterhin die **+**- und **✎**-Buttons nutzen; natives Drag & Drop ist vor allem für Desktop-Browser vorgesehen.
5. **Quick Swap:** Auf der betreffenden Spielerkarte **⇄** wählen; es erscheinen bis zu fünf regelkonforme Spieler-Alternativen mit prognostiziertem Unterschied. Wechsel werden **nur nach Klick auf „Übernehmen“** durchgeführt, nie automatisch. Fixierte Spieler sind geschützt.
6. **Arcade Goal Meter:** Unter jedem Team zeigt ein Balken die erwartete Punktzahl im Verhältnis zum individuellen Zielscore. Bei gültiger vollständiger Aufstellung und hinreichenden Scores auch die bereits vorhandene, **nicht kalibrierte** Zielchance. Die Anzeige stellt kein tatsächliches Spielergebnis und keine garantierte Trefferquote dar.
7. **Formkurven auf den Karten:** Die letzten bis zu zehn geladenen Sorare-Einzelscores werden als Mini-Balken angezeigt. Fehlende Score-Daten werden nicht erfunden.
8. **Lineup Risk Radar:** Hinweise zu unvollständigen Teams, Positions- und Sternenproblemen, nicht bestätigten Spielen, Kartenbesitz, Datenlücken und Warnungen des bestehenden Lineup Doctors. Einsatzwahrscheinlichkeiten und Verletzungsindikatoren sind weiterhin Modellschätzungen, sofern nicht anderweitig verifiziert.

## Bewahrte Funktionen und Datenquellen

- Sorare-Score-Abfrage `lib/sorare.ts` bytegenau unverändert.
- Offizielle NBA-Sterne `lib/nba-stars.ts` und `lib/nba-stars-feed.ts` bytegenau unverändert. Die beiden `app/api`-Routen für die Daten bleiben ebenfalls unverändert.
- Keine Änderungen an `lib/model.ts`, `lib/arcade.ts`, den vier Fußballliga-Filtern oder dem automatischen NBA-16-Sterne-Optimizer außerhalb dieses neuen Auto-Fill-Verfahrens.
- Forecast Lab, Prognosedatenbank, Backtesting, Gameweek Center, Arcade Tracker, Data Health, Hidden Gems, Watchlist und Arcade Intelligence Studio V2.2 bleiben enthalten.
- Die V2.3-Daten werden über den **gleichen lokalen Storage-Key** wiederhergestellt; Teams und ihre Zielwerte werden nicht gelöscht. Beim ersten Speichern von V2.4 kommt lediglich das neue Feld `locks` hinzu.

## So benutzt du den neuen Builder

1. In der App **Lineup Builder → Selbst aufstellen** öffnen. Zuerst Sportart und gegebenenfalls Fußballliga auswählen.
2. Ein Team auf der linken Seite als aktiv markieren. Spieler aus der Tabelle rechts entweder mit **+** hinzufügen oder die Spielerzeile direkt auf die gewünschte Karte ziehen.
3. Auf der Spielerkarte **♧** zum Fixieren anklicken; das Symbol wechselt zu einem **Schloss** und die Karte erhält einen goldenen Rahmen. Zum Entsperren erneut klicken.
4. **✦ Smart Auto-Fill** ergänzt alle noch freien Slots. Wenn kein gültiges vollständiges Team möglich ist, erscheint ein Grund und es wird nichts ersetzt.
5. Für Alternativen auf der gewünschten Karte **⇄** öffnen. Die fünf besten zulässigen Vorschläge mit Punkteunterschied erscheinen unter diesem Team. Erst ein Klick übernimmt den Wechsel.
6. **ZIEL** je Team eintragen. Der Arcade Goal Meter erscheint direkt unter den fünf Karten.
7. **Risk Radar** aufklappen, um Hinweise zu den verwendeten Daten, Spielberechtigung und ggf. fehlenden Spielern zu prüfen.
8. Teams werden automatisch im Browser gespeichert. Alle bestehenden Funktionen zum Duplizieren, Einklappen, Rückgängigmachen und Kopieren bleiben verfügbar.

## GitHub Desktop – kleines Update installieren

1. Deine aktuelle funktionierende **V2.3 sichern** (neuer Git-Commit oder Tag). Falls du V2.3 noch nicht hast, die **komplette V2.4** verwenden.
2. `markerras-v2.4-nur-update.zip` herunterladen und **entpacken**.
3. GitHub Desktop öffnen und Repository `xboobax/markerrasorare` auswählen.
4. Branch **`obsidian-neon-v2-4`** erstellen.
5. **Repository → Show in Explorer** öffnen; den **Inhalt** des entpackten Ordners `markerrasorare-main` in dein bestehendes Projektverzeichnis kopieren. Dateien überschreiben; `.git`, `.env*` und eigene Zugangsdaten nicht löschen.
6. Änderungen in GitHub Desktop kontrollieren, Commit **`Obsidian Neon Builder V2.4`** anlegen, dann **Publish branch** klicken.
7. Die Vercel-Preview-URL des Branches öffnen. **Erst nach bestandener Funktionskontrolle** in `main` übernehmen.

### Preview-Test-Checkliste

- NBA: offizielle Sterne aus Sorare noch vorhanden? Sterne-Summe bei fünf Spielern maximal 16? Versuch, eine sechste oder teure Karte einzusetzen, muss abgelehnt werden.
- NBA: zwei Spieler platzieren, einen fixieren, Smart Auto-Fill klicken. Die beiden vorhandenen Spieler müssen an denselben Plätzen stehen bleiben.
- Fußball: TW, VER, MF, ST, EX testen. Ein TW darf nicht in einen DEF- oder EX-Slot verschoben werden.
- Quick Swap: fünf Alternativen oder korrekte Meldung bei zu wenigen Spielern. Einen fixierten Spieler darfst du nicht ersetzen können.
- Drag & Drop: Spieler aus der Tabelle in einen leeren Slot ziehen; mit zwei belegten Slots tauschen, auch zwischen Teams. Bei Regelverletzung muss die Aufstellung unverändert bleiben.
- Arcade Goal Meter: Zielscore verändern und prüfen, dass Balken und Differenz angepasst werden.
- Formkurven: nur echte Einzelscores anzeigen. Keine künstlichen Formwerte bei Spielern ohne Scores.
- Datenqualität: Warnungen im Risk Radar lesen und verifizieren. Andere Module und alte Team-Speicherungen durch erneutes Laden der Seite prüfen.
- Smartphone: Statt Drag & Drop die `+`-/Slot-Auswahl benutzen; horizontal scrollbare fünf Karten bleiben verfügbar.

## Technische Prüfungen

- **24 automatisierte Testgruppen bestanden**, einschließlich neuer V2.4-Tests für NBA-Sternebudget, Positionsregeln, Sperren, Drag-Tausch, V2.3-Migration, Quick Swap und Smart Auto-Fill.
- TypeScript-/TSX-Integrationsprüfung bestanden. CSS mit Parser geprüft, keine Syntaxfehler.
- Belastungstest mit 500 simulierten NBA-Spielern für Smart Auto-Fill erfolgreich.
- Byteidentität von Sorare-Score- und NBA-Sterne-Modulen gegenüber V2.3 geprüft.

**Grenzen:** Keine Live-Sorare-Abfrage oder vollständiger Next.js-Produktionsbuild in dieser lokalen Umgebung. Der finale Funktionstest erfolgt auf Vercel. Aktuelle Spielersterne (`gameplayTierStars`) können vom für eine konkrete Gameweek festgeschriebenen Sternpreis abweichen. Keine automatische Einreichung an Sorare. Lokale Browserdaten sind nicht Cloud-synchronisiert.
