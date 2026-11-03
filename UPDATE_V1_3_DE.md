# Markerras Sorare Helper V1.3 — Matchups, Prognosen und Zielchance

## Was hinzugekommen ist

- **Matchup Studio** mit von Sorare bereitgestelltem kommenden Gegner, soweit die Fixture-Zuordnung möglich ist. Du kannst für jeden Gegner eine subjektive Defensivstärke von **1 (leicht)** bis **5 (sehr stark)** eingeben. Die Werte bleiben lokal im Browser. Ohne Eingabe werden **keine** Gegnerboni berechnet.
- **Transparentes Matchup-Ranking** für Spieler, deren nächste Gegner du bewertet hast. Die Bewertung beeinflusst die Punkteprognose um höchstens ±10 %; das ist eine **manuelle Szenario-Annahme**, kein gemessener Liga-Defense-Index.
- **Erwartete und übliche Spielminuten** (manuell) für NBA und Fußball: Sind beide Werte vorhanden, wird die Prognose im Bereich ±20 % angepasst. Ohne beide Werte bleibt sie unverändert.
- **xG und xA** als zusätzliche Eingabefelder bei Fußball. Sie dienen **noch nicht als automatisch kalibrierte Sorare-Punkteprognose**; eine automatische Datenanbindung fehlt noch.
- **Score-Ziel-Strategie** im Lineup Builder: Sie priorisiert aus einer begrenzten Auswahl gültiger Aufstellungen die **geschätzte** Wahrscheinlichkeit, die eingestellte Zielpunktzahl zu übertreffen.
- **Zielchance in %** und Vergleich mehrerer Lineups. Berechnungsbasis: geschätzter Score-Mittelwert, Streuung, Einsatzwahrscheinlichkeit, konservative angenommene Korrelation bei Spielern desselben Teams. **Keine statistisch kalibrierte Eintrittswahrscheinlichkeit!**
- Die existierende Sorare-Datenanbindung, Spielerbilder (sofern verfügbar), Kartenmarkierungen, 16-Sterne-Grenze für NBA und fünf Fußballslots bleiben bestehen.

## Welche Funktionen sind automatisiert, welche nicht?

**Automatisch:** vorhandene Sorare-Scores, Projektionsfelder und Fixture-Gegner, sofern das Sorare-API-Schema und die Zuordnung erfolgreich sind; Basisschätzung; Lineup-Optimierung; Näherung der Zielchance.

**Manuell:** Bewertung gegnerischer Defensivstärke, erwartete und übliche Minuten, xG/xA, NBA-Sterne, Kartenboni, Kartenbesitz. Ein professioneller automatisierter Stats-Feed mit NBA Defensive Rating, Pace, Verletzungs-News, bestätigten Minuten, Fußball-xG/xA, wahrscheinlichen Startelfen und Backtesting ist **noch nicht angeschlossen**. Bitte keine Platzhalterangaben als reale Daten interpretieren.

## Installationsanleitung (GitHub Desktop + Vercel)

1. Vorhandenes Repository `xboobax/markerrasorare` in GitHub Desktop öffnen.
2. **Current branch → New branch**: `helper-v1-3` (oder bestehenden Test-Branch auswählen).
3. ZIP entpacken, **nur den Inhalt** von `markerrasorare-main` in `Repository → Show in Explorer` kopieren; Dateien bei Nachfrage ersetzen. Den versteckten `.git`-Ordner und bestehende lokale `.env`-Dateien **nicht** löschen oder ins Repository committen.
4. In GitHub Desktop `Markerras Sorare Helper V1.3` als Commit-Summary eingeben → **Commit** → **Publish branch / Push origin**.
5. In Vercel das **Preview-Deployment** öffnen und prüfen:
   - Bundesliga, LaLiga, Ligue 1, Premier League laden wie bisher.
   - NBA-Spieler und Bilder laden wie bisher; manuelle Sterne bleiben erhalten.
   - Im Matchup Studio werden Gegner gezeigt, sofern Sorare Fixturedaten liefert; nach einer manuellen Einstufung ändern sich entsprechende Prognosen.
   - Im Spieler Explorer ändern sich die Prognosen bei validen *beiden* Minuteneingaben; xG/xA werden nur als Scouting-Notizen gespeichert.
   - Im NBA-Builder passen fünf Karten in 16 Sterne; `Zielchance` funktioniert erst nach Eingabe eines Score-Ziels.
   - Im Fußball-Builder passen TW, VER, MF, FWD und ein weiterer Feldspieler; Score-Ziel ist frei einstellbar.
6. Preview erfolgreich? GitHub Pull Request von `helper-v1-3` nach `main` erstellen und mergen. Vercel-Produktionsdeployment unter `markerrasorarev1.vercel.app` beobachten.

### Fehlersuche

- `Keine identifizierbaren Gegner`: Der Sorare-API-Abruf liefert in der aktuellen Feldstufe kein `nextGame`, der Fixture-Eintrag fehlt oder Teamname stimmt nicht überein. Die Basisprognose und Lineup-Berechnung bleiben funktionsfähig.
- `Keine Fotos`: Sorare-Fotofelder werden ggf. vom GraphQL-Schema nicht unterstützt; die vorhandenen Initialen-Fallbacks bleiben sichtbar.
- `Kein NBA-Lineup`: Fünf gültige NBA-Karten benötigen 1–5 Sterne in 0,5er-Schritten und höchstens 16 Sterne insgesamt. Bei `Nur meine Karten` muss der Bestand markiert sein.
- `Zielchance` lässt sich nicht anklicken: zuerst im Lineup Builder ein positives Score-Ziel eingeben.
- Vercel zeigt `Build failed`: den **ersten** tatsächlichen Fehler der Vercel-Build-Logs prüfen und nicht ungeprüft in `main` mergen.

## Teststatus

Erfolgreich ausgeführt: `npm run test:arcade` mit Tests für Liga-Whitelist, Karten- und Slot-Regeln, Basisscore, Bilder-URL-Sanitizing, Szenariomultiplikatoren, Matchup-Labels, Zielchance und Zieloptimierung. TypeScript/TSX-Syntax ist geprüft. **Ein vollständiger Next.js-Build, echte Bilder, NBA-/Football-API-Aufrufe und das Vercel-Deployment konnten in dieser Umgebung nicht verifiziert werden.** Vor Produktion Preview testen.

## Datenmodell und Dateien

- `lib/model.ts`: Basisscore und Forecast, mit optionalem nächstem Gegner.
- `lib/sorare.ts`: Sorare GraphQL Adapter und vorsichtige Fixture-Gegner-Zuordnung.
- `lib/matchups.ts`: reine Funktion für manuelle Gegner- und Minutenszenarien.
- `lib/target-probability.ts`: Moment-Näherung mit DNP und Teamkorrelation.
- `lib/arcade.ts`: vorhandene positions- und budgetgerechte Optimierung, neu `strategy: "target"` mit Shortlist-Suche.
- `app/components/arcade-dashboard.tsx`: neues Matchup Studio, Scouting-Eingaben und Zielchance.
- `app/globals.css`: Ergänzungen für die UI.
- `tests/v13.test.js`: zusätzliche Regressionstests.

Das Matchup-Ranking ist *ohne bewertete Gegner absichtlich leer*, statt scheinpräzise Werte zu erfinden. Der Target-Optimizer ist eine heuristische Kandidatensuche und beweist nicht global die bestmögliche Zielchance.
