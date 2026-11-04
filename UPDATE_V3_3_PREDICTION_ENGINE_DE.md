# Neon Builder Pro V3.3 – Prediction Engine 2.0

## Was ist neu?

Unter **Forecast Lab** kann man für NBA und Fußball zwischen **V2.0 · Prediction Engine**, **V1.8 · Experiment** und **V1.7 · Standard** wählen. Die bestehende Modellwahl V1.7/V1.8 wird für bisherige Nutzer weiterhin respektiert; falls noch keine Auswahl gespeichert wurde, ist V2.0 die Voreinstellung. Der neue Auswahlwert wird separat unter `neon:prediction-engine-v33.<sport>` gespeichert; bisherige localStorage-Schlüssel und gespeicherte Aufstellungen bleiben unberührt.

V2.0 wird vom automatischen NBA- und Fußball-Builder ebenso wie vom Spielerpool genutzt, **wenn der Modus V2.0 aktiv ist**. Alle vorhandenen Regeln (16 NBA-Sterne, NBA ohne Captain, Fußball-Captain +50 %, Sammlung, Locks, Ausschlüsse, Kartenboni, Multi-Team, Q80/PS/Raw, Diversity) bleiben erhalten.

## Methodik – nachvollziehbar, keine künstlichen Daten

- Ausgangspunkt: vorhandene Sorare-Projektion, L5/L10 und tatsächliche Scores (Basis von `forecast` und `enrichForecast`).
- Für mindestens 2 reale, gültige Einzelscores wird deren robuste, zeitlich gewichtete Form gegen die Basis geschrumpft. Das Formgewicht steigt mit realen Beobachtungen bis höchstens **36 % NBA / 30 % Fußball**.
- Die erwarteten Punkte werden maximal ±14 % gegenüber der mit vorhandenen Scouting-Daten bereits berechneten Basisschätzung verändert. Gegnerwerte (falls vorhanden) und vom Nutzer eingegebene erwartete/typische Minuten wirken genau einmal. Ohne verifizierte Daten erfolgt keine angenommene Änderung.
- Spielwahrscheinlichkeit aus dem vorhandenen Modell senkt den gewichteten Punktescore. Score-Floor und -Ceiling gelten **bei Einsatz**. P10–P90 berücksichtigt den modellierten DNP-Anteil, ist jedoch nicht kalibriert.
- Der Risikoindex 0–100 ist ein **heuristischer Index** aus Einsatzrisiko, Score-Streuung, Datenabdeckung und unbekannten Spielterminen; er ist ausdrücklich **keine Ausfallwahrscheinlichkeit**.
- Keine Annahmen über zusätzliche Spielminuten, Gegnerstärke, Verletzungen oder Tor-/Assist-Chancen. xG/xA sind weiterhin nur Anzeige-/Scoutingfelder und werden nicht heimlich in Score umgerechnet.

## Neuer Spielerprofilbereich

Ein schwarzes Panel mit violettem Rand zeigt V2-Prognose, erwartete Punkte bei Einsatz, Floor/Ceiling, Risikoindex, Gegner- und Minutenfaktoren, verwendetes Formgewicht, Modellvergleich mit V1.8 und Gründe für die Berechnung. In der Spielertabelle gibt es bei aktiviertem V2.0-Modus eine zusätzliche Risiko-Spalte.

## Messung anhand echter Resultate

V3.3 speichert optional zusätzliche eingefrorene V2-Daten (`engineV2Predicted`, `engineV2P10`, `engineV2P90`) in denselben vorhandenen Prognose-Snapshots; frühere Einträge werden nicht nachträglich überschrieben. Erst offiziell abgeschlossene Sorare-Spiele, deren Prognosen vor dem offiziellen Endergebnis gespeichert wurden, werden für den paarweisen MAE-Vergleich V1.8 vs. V2.0 berücksichtigt. Das aktuelle Modell ist **keine trainierte oder bereits validierte ML-Vorhersage**. Für die Beurteilung, ob V2 tatsächlich besser ist, müssen genügend zukünftige Spieltage abgewartet werden.

## Deployment und Prüfung

`npm run test:arcade` umfasst nun **41 Testdateien**. `npm run build` ist der verbindliche Next.js-/Vercel-Produktionscheck; dieser konnte in der aktuellen Offline-Umgebung mangels installiertem Next.js nicht ausgeführt werden. Zusätzlich wurden TS/TSX-Syntax und die semantischen Fehler der geänderten UI mit provisorischen React-/Next-Typdeklarationen kontrolliert; dies ersetzt keinen echten Vercel-Build.
