# MarkErras Sorare Dream V4.0.3 – Prediction Engine 3.0 (Beta)

## Grundlage
Vollständiges Update der V4.0.2 inklusive Sorare-Sync-Verbesserungen. Bestehende NBA-/Fußball-Builder, Set-Regeln, Sterne, Daily Missions, Divination-Set-Filter, Sammlung, Match Center und schwarz-goldene Navigation bleiben enthalten.

## Wichtigste Änderung: Vergleichbare Definitionen

- **PP Raw:** erwartete Sorare-Punkte **bei Einsatz**, ohne Karten- oder Captainbonus.
- **Q80 Raw:** modelliertes **80. Perzentil bei Einsatz** (nicht Prognose × Einsatzwahrscheinlichkeit). Individuelle Streuung aus tatsächlich vorhandenen Scores, mit vorsichtigem Shrinkage zu einer konservativen Varianzschätzung. Für PP und Q80 wird **eine gemeinsame bedingte Normalverteilung** angenommen; keine Behauptung einer gelernten/verifizierten Verteilung.
- **Q20 Raw:** entsprechendes geschätztes 20. Perzentil bei Einsatz (Floor).
- **PP / Q80 + Karte:** bei bestätigtem Kartendatensatz + Kartenbonus einmalig. Bonus bleibt bei fehlendem Sync nicht automatisch als verifiziert gemeldet.
- **Risiko-PP:** PP Raw × modellierte Einsatzwahrscheinlichkeit. Dieses Feld priorisiert weiterhin risikoarme Lineups. Die Einsatzwahrscheinlichkeit ist **keine verifizierte Startelfwahrscheinlichkeit**.
- **P70/P80:** geschätzte bedingte Chancen im Builder, ausdrücklich **noch nicht kalibriert**.
- Alte **V2.0 / V1.8 / V1.7** bleiben im Builder und in Presets auswählbar.

## Neue Funktionen

1. Neuer, reiner Prognosekern `lib/prediction-engine-v3.ts` für beide Sportarten mit Datenqualitätsstufen, Erläuterungen, Bonusberechnung und official-only Auswertungsfunktion.
2. Engine V3 standardmäßig bei Erstinstallation; bestehende V1.8-/Classic-Auswahl wird erhalten. Auswahl separat unter `markerras.sorare.prediction-mode.v3.<sport>` gespeichert.
3. V3 in alter Player-Tabelle (PP/Q80 Raw, mit Karte, Risiko-PP), in Spielerprofilen, im manuellen Builder und in der neuen virtuellen Player Database.
4. Q80 mit Karte wird in der Tabelle **bedingt** gezeigt; die *Auto-Build-Auswahl* berücksichtigt für Q80 weiterhin das Einsatzrisiko. Das sind bewusst unterschiedliche Kennzahlen.
5. Vor-Spiel-Snapshots speichern PP Raw und Q80 Raw separat. Backtesting zählt ausschließlich **offiziell bestätigte Scores bei verifizierter Teilnahme**, die nach einem vorab gespeicherten Snapshot liegen. Da der Sync derzeit keine verifizierte Teilnehmer-Flag mitschickt, bleibt diese Metrik vorerst ohne Stichprobe statt falsche 80%-Erfolge zu melden.
6. Performance: keine zusätzlichen Netzwerkaufrufe; Nutzung des bereits berechneten V2-Kerns; Q80 direkt mit Normalquantil statt iterativer Suche; Filter und Tabellen unverändert inkrementell/virtualisiert.

## Einschränkungen, bewusst offen

- Das ist **nicht** die proprietäre SoProb-Engine. Exakt gleiche Werte können nicht zugesagt werden.
- **NBA:** PP/Q80 wird derzeit pro einzelnes Spiel berechnet. Das *beste Spiel einer mehrteiligen Gameweek* wird noch nicht zuverlässig als Verteilung modelliert. Die bestehende Mehrfachspielanzeige bleibt erhalten.
- **Fußball:** Eigene kalibrierte Modelle für Decisive Actions, xG/xA, Clean Sheets und echte Startwahrscheinlichkeiten benötigen weitere belastbare Daten. Ohne sie keine erfundenen Prozentsätze.
- Q80 und P70/P80 sind **unkalibrierte Modellschätzungen**; historische, vor Spielbeginn eingefrorene Prognosen mit bestätigter Teilnahme müssen für die Kalibrierung gesammelt werden.
- Ohne bestätigte Daten werden fehlende Werte mit „—“ dargestellt; selbst bei weniger als 8 Einzelscores wird Q80 nur als unsichere Schätzung bereitgestellt.
- Ein vollständiger Next.js-Vercel-Produktionsbuild konnte in dieser Umgebung mangels installierter Next/React-Abhängigkeiten nicht ausgeführt werden. Der endgültige Build muss in einer Vercel-Preview erfolgen.

## Installation / Rückfall

1. Aktuelle V4.0.2 als Sicherheitskopie behalten.
2. ZIP komplett in **einen Testbranch** übertragen; keine selektive Übertragung einzelner `.tsx`-Dateien.
3. Vercel-Preview erstellen; zunächst `npm run build` vollständig prüfen.
4. Football- und NBA-Player-Tabelle, Card-Sync, PP / Q80 + Karte und Auto-Builder testen.
5. Wenn nicht erfolgreich, auf Branch V4.0.2 zurückgehen.

Keine neuen kostenpflichtigen Datenquellen, kein Upstash.
