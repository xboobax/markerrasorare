# V3.0 – Neon Builder Pro: Advanced Strategy & Projection Intelligence

**Ausgangsversion:** funktionierende V2.9.4 „Kartenbonus-Fix“. Keine neuen Sorare-/Vercel-Schlüssel notwendig.

## Installation (GitHub Desktop)

1. Zur Sicherheit den funktionierenden Stand V2.9.4 als Branch/Backup behalten.
2. Kleines Update-ZIP entpacken. Darin liegt `markerrasorare-main/`.
3. GitHub Desktop → Repository `xboobax/markerrasorare` → möglichst Test-Branch `v3-advanced-builder` anlegen.
4. Repository → **Show in Explorer**; **Inhalt** des entpackten `markerrasorare-main`-Ordners in das bestehende Repo kopieren, gleichnamige Dateien ersetzen. NICHT den ganzen ZIP-Ordner als Unterordner einfügen.
5. Commit „Advanced Strategy and Projection Intelligence V3.0“ und **Publish branch**.
6. Vercel Preview-Build prüfen. In beiden Sportarten erst automatische und dann manuelle Aufstellung testen, danach ggf. nach `main` übernehmen.

## Neue Einstellungen (NBA & Fußball)

Im Auto-Builder und im manuellen Neon Workspace befindet sich der Bereich **Auto-Builder-Einstellungen**:

- **Geltungsbereich:** „Alle Teams“ oder „Je Team“. Voreinstellung: gemeinsam. Pro Sportart im eigenen Browser gespeichert. Der Auto-Builder nutzt die Einstellungen für Varianten/Teams 1–5; im manuellen Workspace wird die jeweilige Teamkonfiguration für Smart Auto-Fill verwendet.
- **PS Standard:** erwartete Sorare-Punkte unter Berücksichtigung bekannter Kartenboni, vor Fußball-Captain.
- **PS Raw:** ausschließlich Spielerprognose ohne Karten- oder Captain-Bonus als **Auswahlziel**. Angezeigte tatsächliche Teamprognose enthält weiterhin Karten-/Captain-Zuschläge.
- **PS Q80:** experimentelle **Modellquantilschätzung**. Erfordert mindestens acht reale letzte Scores und belastbare Prognosegrundlagen. Ohne ausreichende Daten ist ein Spieler im Q80-Optimierungspool nicht auswählbar. Dies ist **keine statistisch kalibrierte 20-%-Überschreitungswahrscheinlichkeit und keine offizielle Sorare-Prognose**.
- **Strategien:** Safe (Floor + vermeidet bestätigbare Gegenpartien), Balanced (PS Standard), High Ceiling (experimentelles Q80 als Auswahlziel). Custom für eigene Kombinationen.
- **Gegner-Konflikte:** Verhindert gemeinsame Aufstellung direkt gegeneinander spielender Vereine nur bei eindeutiger Zuordnung.
- **Maximale Teamverwendungen:** 1–6 pro Spieler in automatisch gebauten Varianten bzw. anderen bestehenden manuellen Teams. Vorhandene Teams werden nicht automatisch verändert.
- **Mindestpunkte:** Verlangt das prognostizierte Teamziel; für Fußball wird die automatische Kapitän-Zugabe (+50 %) berücksichtigt.
- **Fußball:** Ausgeschlossene geladene Liga, Pflicht-Stack (Defensiv TW+VER, Offensiv MF+ST oder ≥3 aus einem Verein), Extra-Position. Classic-Kartenpräferenz bleibt deaktiviert, bis die Karten-API eine belastbare Classic-Kennzeichnung liefert.
- **NBA:** Kein Captain; das bestehende 16-Sterne-Limit bleibt strikt erhalten.

### Datengrenzen / Anzeige im Fußball-Spielerpool

Im Spaltenmanager („Alle Spalten“) sind zusätzliche Spalten verfügbar: PS Raw, PS Standard, PS mit Kartenbonus, Q80 Raw / Q80 mit Bonus und **historische** Häufigkeit von mindestens 70 Punkten (erst ab 8 Spielen). PS Raw, Q80 und die historische 70+-Quote können außerdem sortiert werden.

**Keine erfundenen Daten:** Echte Startelf-% (nicht identisch mit Einsatzchance), kalibrierte P70-/P80-/G/A-/WIN-/Clean-Sheet-Wahrscheinlichkeiten und Team-xG/xGA sind in dieser Version **nicht belastbar verfügbar** und erscheinen als „—“, nicht als fiktive Zahlen. Die Anzeige „Q80*“ ist ausdrücklich experimentell, nicht kalibriert.

## Testcheckliste nach Vercel Preview

1. Fußball → Auto-Builder → „Je Team“ → Team 1 PS Standard / Team 2 PS Raw wählen: Empfehlungen vergleichen.
2. Fußball → Defensiv-Stack wählen: mindestens ein Torwart und ein Verteidiger desselben Clubs müssen Teil der vorgeschlagenen Aufstellung sein. Wenn nicht möglich, erscheint kein passender Vorschlag.
3. Fußball → Extra-Position „Nur Verteidiger“ wählen und die Teamaufstellung prüfen.
4. Fußball → Captain bleibt +50 %; manuelle Captain-Auswahl funktioniert weiterhin.
5. NBA → PS Standard und PS Raw vergleichen; Sternenlimit maximal 16. NBA **hat nie einen Captain**.
6. Beide Sportarten → übertrieben hohe Mindestpunktzahl: Keine erfundene gültige Aufstellung.
7. Manueller Builder → zwei freie Slots lassen sich mit den gewählten Regeln füllen; bereits gespeicherte Slots bleiben erhalten.
8. Fußball-Spielerpool → „Scouting“ oder „Alle Spalten“, danach PS Raw und Q80 sortieren; fehlende Werte müssen „—“ bleiben.
9. Sorare-Karten synchronisieren, Bonuswerte kontrollieren. Login und Sync-Routen sind gegenüber V2.9.4 unverändert.

**Technik:** Die TS-Pure-Funktionen sowie der Quellcode der neuen TSX-Komponenten wurden getestet. Vollständiger Next.js-Produktion-Build konnte in dieser Umgebung ohne installierbare npm-Abhängigkeiten nicht ausgeführt werden. Unbedingt zunächst Vercel Preview prüfen.
