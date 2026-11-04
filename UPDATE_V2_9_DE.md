# Markerras Sorare Helper V2.9 – Neon Lineup Builder Pro

## Was ist neu?

### Fußball: Captain Intelligence, **immer +50 %**

- Pro Fünfer-Aufstellung genau eine **goldene Captain-Krone**. Klicke bei einem Spieler auf die Krone, um ihn manuell als Kapitän zu bestimmen.
- Beim ersten Öffnen alter Teams empfiehlt der Builder automatisch einen Captain, falls noch keiner gespeichert ist. **Eine ausdrückliche manuelle Captain-Wahl wird nicht automatisch überschrieben.**
- Der Captain erhält `Basisscore × 0,5` als Zusatzpunkte. Diese werden zusätzlich zu separaten manuell erfassten Kartenboni auf den Basisscore addiert. Prognose, Floor, Ceiling, Zielchance, Arcade Goal Meter und Team Battle verwenden die bereinigten Teamwerte.
- **Smart Captain**: Modus „Höchster Erwartungswert“ für maximale erwartete Captain-Zusatzpunkte, Modus „Sicher“ bevorzugt einen stabilen Floor und bewertet verfügbare OUT/QUESTIONABLE/DOUBTFUL-Meldungen als Risiko. Die Einsatzschätzung ist bereits Bestandteil der Basiserwartung und wird nicht doppelt gewichtet.
- Beim Austausch oder Entfernen des Kapitäns entsteht kein versteckter Captaintransfer: Wenn die gewählte Karte aus der Aufstellung verschwindet, schlägt der Builder einen neuen Spieler vor. Gespeicherte Teams bleiben erhalten.
- Bei als OUT gemeldeten Kapitänen erscheint eine Warnung. Die App ändert deine manuell gespeicherte Aufstellung nicht automatisch.
- Die automatische Fußball-Aufstellung zeigt ebenfalls eine Captain-Empfehlung mit festem +50-%-Aufschlag; du kannst für die ausgewählte Variante manuell einen anderen Captain auswählen. Die Auswahl des Fünferteams erfolgt weiterhin nach dem **bestehenden Optimizer**, nicht nach einer neu trainierten globalen Captain-Strategie.

### NBA: ausdrücklich **kein** Captain

- Keine Captain-Krone, keine Captain-Auswahl, keine Captain-Zusatzpunkte.
- Das 16-Sterne-Limit und die offiziellen NBA-Sterne bleiben wie zuvor.

### Quality of Life

- **Player Intelligence Panel**: Spielername in der Builder-Tabelle oder auf der linken Karte anklicken. Das Panel zeigt Form, L5/L10, erwarteten Score, Verfügbarkeit, Gegner, Spieltermin und Karteninformationen. Das ausführliche Original-Spielerprofil bleibt über „Ausführliches Profil“ erreichbar.
- **Smart Swap Preview**: Beim Öffnen von Quick Swap oder Lineup-Doctor-Wechseln zuerst einen Kandidaten für die Vorschau wählen. Angezeigt werden Veränderungen bei Prognose, Floor, Ceiling und NBA-Sternen. Erst „Wechsel übernehmen“ verändert das Team.
- **Card-Level Builder**: Bei vollständiger Sorare-Synchronisierung können konkrete Kartenexemplare eines Spielers nach Seltenheit, Saison und Seriennummer gewählt werden. Bonuswerte für individuelle Fußball-Karten können je Kartenexemplar manuell erfasst werden und fließen in diese Aufstellung ein. **Die bestehende Sorare-Sammlung enthält derzeit keine verifizierten XP- oder Collection-Bonusprozente. Diese werden nicht geraten.**
- **Tabellenansichten**: Alle Spalten / Kompakt / Scouting; eigene Spaltenauswahl je Sport lokal speicherbar.
- **Explain My Lineup**: Aufschlüsselung nach Spielern, Datengrundlage und Captain-Zuschlag.
- **Final Lineup Check**: Slots, Positionen, Sternelimit, Captain, gemeldete Ausfälle, synchronisierter Besitz und Stand der Verletzungsdaten. Dies ersetzt keine offizielle Sorare-Teilnahmeprüfung.

## Installation per GitHub Desktop (ausgehend von V2.8.3)

1. Die Datei `markerras-v2.9-nur-update.zip` herunterladen und entpacken.
2. In GitHub Desktop das Repository `xboobax/markerrasorare` öffnen. Am besten einen neuen Branch `neon-builder-pro-v2-9` auf Basis der funktionierenden V2.8.3 erstellen.
3. Unter **Repository → Show in Explorer** den lokalen Projektordner öffnen.
4. **Den Inhalt** des entpackten Ordners `markerrasorare-main` in diesen Projektordner kopieren; gleichnamige Dateien ersetzen. Den vorhandenen `.git`-Ordner niemals löschen.
5. GitHub Desktop: Commit `Add Neon Lineup Builder Pro V2.9`; anschließend **Publish branch**.
6. Das Vercel-Preview öffnen; zuerst Fußball-Captain und danach NBA ohne Captain prüfen. Erst danach nach `main` übernehmen.

### Testablauf

- Fußball: 5 Spieler (TW/VER/MF/ST/EX), einen Captain wählen, goldene +50 % prüfen; Captain wechseln und Scoreveränderung beobachten; Smart Captain testen.
- Prüfen, dass Captain nach Reload/Team duplizieren bestehen bleibt und bei Entfernung sinnvoll neu vorgeschlagen wird.
- Fußball: Quick Swap nur nach Vorschau ausführen, eine Auswahl mehrerer Sorare-Karten ausprobieren und unterschiedliche Kartenboni nur manuell eintragen.
- NBA: **keinen** Captain sehen und das 16-Sterne-Limit prüfen; NBA-Daten, Fotos und Gegner müssen wie in V2.8.3 funktionieren.
- Nach jedem Test: Sorare-Login und Synchronisierung unter „Meine Karten“ kontrollieren. Weder OAuth-Schlüssel noch Vercel-Secrets müssen geändert werden.

## Technische Hinweise

- Automatisierte TypeScript-Bibliothekstests inklusive neuer Captain-/NBA-Isolationsfälle: erfolgreich. TSX-Syntax aller 58 TS/TSX-Quelldateien geprüft.
- Ein vollständiger `next build` konnte wegen fehlendem Zugriff auf die npm-Registry hier **nicht** ausgeführt werden. Der Vercel-Preview-Build bleibt deshalb erforderlich.
- Keine Hintergrundüberwachung bei geschlossener Seite und keine automatische Sorare-Einreichung.
- Ein ausgewählter Captain +50 % ist eine vom Nutzer gewünschte feste Builderregel. Die tatsächliche Sorare-Wettbewerbsberechtigung und Bonusregel der gewählten Challenge sollten vor Einreichung geprüft werden.
