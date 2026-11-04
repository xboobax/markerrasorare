# Neon Builder Pro V3.9.0 – NEON Intelligence / Compact Workspace

## Installation

1. Den Inhalt dieser ZIP in das bestehende GitHub-Projekt übernehmen (alle bisherigen Dateien bleiben grundsätzlich erhalten).
2. Bei Vercel ein Production Deployment auslösen und die Build-Ausgabe kontrollieren.
3. Unter **Sammlung** die Karten wie bisher synchronisieren. Für Fußball gelten weiterhin ausschließlich Karten aus dem per `cardSet.currentSet` ermittelten, aktiven Set (z. B. Divination).
4. Im Browser ggf. einmal neu laden. Vorhandene lokale Lineups, Presets, Prognosearchive und Karten-Einstellungen nutzen ihre bisherigen Speicherschlüssel.

**Keine Upstash-Pflicht, keine neuen Umgebungsvariablen und keine neuen kostenpflichtigen APIs.** `vercel.json` enthält weiterhin keine obligatorischen Cron-Jobs.

## Die zehn Funktionen – ohne neue Haupttabs

Die Navigation bleibt **Builder / Spieler / Analyse / Sammlung / Daily Missions**. Eine kleine **NEON Quick Actions**-Zeile ergänzt die Navigation. Die weitere Oberfläche nutzt bestehende Bereiche und eingeklappte Details.

1. **NBA Breakout Finder:** Im Daily-Missions-Tab als aufklappbare Liste; orientiert sich am echten NBA-Missionsziel `max(20, L10+7)`, Prognose, historischer Trefferanzahl und Risk Flags. Der Scouting-Index ist KEINE kalibrierte Erfolgswahrscheinlichkeit.
2. **Football Action Hunter:** Im selben aufklappbaren Bereich; priorisiert Feldspieler und Keeper anhand vorhandener Forecast-/Einsatzwerte und optionaler xG/xA-Eingaben. Der kostenlose Feed liefert keine bestätigten Tor-/Assist-/Torlinienklärungs-/Elfmeter-/Clean-Sheet-Ereignisraten. Es werden keine erfunden.
3. **Smart Gameday Center:** Schmale Statuszeile im Builder mit geladenen Spielen/Spielern und, falls vorhanden, einem verifizierten nächsten Spielbeginn; der bestehende ausführliche Gameweek Center bleibt aufklappbar.
4. **NEON Smart Advisor:** Aufklappbare Empfehlung in der schmalen Builder-Statuszeile sowie ein spezifischer Hinweis aus dem bestehenden Lineup Doctor im manuellen Builder.
5. **One-Click Rebuild:** Im manuellen Builder. Repariert *nur* freie oder tatsächlich problematische Slots, erhält fixierte und gesunde Spieler, respektiert Spieltag, Sperren, Sammlung, globale und per-Team-Einstellungen sowie das 16-Sterne-Limit. Fehlgeschlagene Reparaturen ändern das Team nicht. Undo bleibt verfügbar. Kein stilles Überschreiben und keine Einreichung bei Sorare.
6. **Hidden Gems Detector:** Bestehende Funktion über Quick Actions erreichbar, standardmäßig jetzt nur 3 kompakte Vorschläge. Bei „Nur meine Karten“ wird eine vollständig verifizierte aktuelle Sammlung vorausgesetzt.
7. **Prediction Reality Check:** Kleine Zusammenfassung im Analyse-Tab. Nutzt nur FINAL-Sorare-Scores und Prognosen, die vor einem bestätigten Spielbeginn eingefroren wurden; meldet wenig Daten, statt Genauigkeit zu behaupten. Bestehende umfangreiche Tracking-Auswertung bleibt erhalten.
8. **Multi-Lineup Portfolio 2.0:** In der automatischen Builder-Ansicht als geschlossenes Detail mit Anzahl unterschiedlicher Spieler, Überschneidung, Prognoseschnitt und optionaler diversifizierter Auswahl. Die Auswahl nutzt **nur bereits regelkonforme** Lineup-Kandidaten, respektiert maximale Kartennutzung und mindestens 90 % der Max-Prognose. Bei individuellen per-Team-Profilen bleiben diese Regeln vorrangig.
9. **Mission Deadline Radar:** Zeigt den nächsten verifizierten Spielbeginn, falls vorhanden. **Nicht** die offizielle Sorare-Missionsfrist! Für einen verbindlichen Lock muss Sorare selbst geprüft werden.
10. **NEON Quick Actions:** Kleines Menü mit Tastenkürzel **Strg+K** (Mac: Cmd+K) zum Wechseln zwischen Builder, Spielersuche, Hidden Gems, Missions, Reality Check und Sammlung.

## Was wurde nicht verändert?

Die bestehende Prediction Engine 2.0, NBA Stars Optimizer 2.1, Lineup Diversity, Fußball-Captain +50 %, NBA 16 ★, Sorare-OAuth, Collection-Setfilter, Kartenbonus-Logik, fünf Tabs und persönlichen Browserdaten bleiben bestehen. Prognosen und Scouting-Rankings sind Modellwerte, keine Ergebnisgarantien.

## Qualitätssicherung

- **48/48** vorhandene und neue Testdateien erfolgreich (`npm run test:arcade`).
- Dazu Syntaxprüfung der geänderten React-TSX-Dateien und Typprüfung der neuen TypeScript-Berechnungen.
- Die bestehenden UI-Regressionstests wurden nur für aktualisierte **Versionsbeschriftungen** angepasst.
- **Offen:** Ein vollständiger `next build` konnte hier mangels lokal installierbarer Next.js-/React-Abhängigkeiten nicht ausgeführt werden. Bitte Vercel-Deployment abwarten. Das ist nicht mit einem erfolgreichen Produktionsbuild gleichzusetzen.

## Datenschutz und Betriebsgrenzen

Keine zusätzlichen Drittanbieter und kein dauerhafter Hintergrundprozess. Browserlokale Prognosen werden nur beim Öffnen/Speichern oder manuell ausgelösten Prüfungen aktualisiert. Keine automatischen Sorare-Missionseinreichungen. Für Deadline- und Gesundheitsangaben werden unbekannte Werte als unbekannt angezeigt.
