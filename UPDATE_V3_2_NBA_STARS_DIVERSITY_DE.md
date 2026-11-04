# Neon Builder Pro V3.2.0 – NBA Stars Optimizer 2.1

## Was ist neu?

- **Lineup Diversity:** Normal (1), Balanced (2, Standard) oder High Diversity (3) neue Spieler pro Teamvergleich.
- **Verbindliche Diversitätsprüfung:** Die NBA-Suche kann alternative Kombinationen per zusätzlicher DP-Überlappungsdimension suchen, statt lediglich ähnliche Top-Listen umzusortieren. Unterschiede zu *allen* angezeigten Varianten werden geprüft.
- **Deutlichere Strategieunterschiede:** Max Points bleibt die unveränderte Referenz; Smart Value priorisiert Punkte pro Stern, Safety First berücksichtigt Floor, Einsatzwahrscheinlichkeit und Datenabdeckung stärker, High Ceiling fokussiert das Potenzial.
- **Transparenter Prognosevergleich:** Die erwarteten Punkte und die prozentuale Differenz zum Max-Points-Team stehen direkt an jeder Variante; im ausgewählten Team erscheinen die aktuelle Punkteabweichung und die Anzahl ausgetauschter Spieler.
- **Begrenzte Prognoseverluste:** Andere Varianten müssen mindestens 90 % der Max-Points-Prognose behalten. Wenn Filter, gesperrte/fixierte Spieler, Kartenverfügbarkeit, 16-Sterne-Limit oder die Qualitätsgrenze die gewünschte Anzahl an Wechseln verhindern, zeigt die App die tatsächlich erreichte Diversität und eine Warnung an. Sie erfindet keine Alternativen.
- **Einstellung wird lokal gespeichert:** Browser-Storage-Key `neon:nba-diversity-v32`, Standard 2.

## Bewährte Regeln bleiben erhalten

- NBA: exakt fünf unterschiedliche Spieler, maximal 16 Sterne, kein Captain.
- Bestehende Sorare-Kartenboni, echte Sterne, vorhandene Matchup-Prognosen, Verletzungs-/DNP-Filter, Ausschlüsse, Locks, Owned-only, V3.0-Pro-Team-Regeln sowie die drei Prognosemethoden bleiben bestehen.
- Die Fußball-Logik und bestehende manuelle Teams werden nicht verändert.
- Gegnerwerte werden nie als zusätzlicher Bonus ein zweites Mal eingerechnet. Unbekannte Gegnerwerte werden nicht erfunden.

## Tests / Deployment

`npm run test:arcade` führt die bestehende Regressionstest-Suite sowie den neuen `tests/v32-nba-diversity.test.js` aus.

`npm run build` muss zusätzlich in einer Umgebung mit installierten Next.js-/React-Abhängigkeiten ausgeführt werden. Der npm-Registry-Zugriff kann in abgeschotteten Entwicklungsumgebungen fehlen; dann erfolgt der Build erst in Vercel.

## Dateiübersicht

- `lib/nba-stars-optimizer.ts`: Such- und Variantenauswahl, Overlap-Limit und Metriken.
- `app/components/arcade-dashboard.tsx`: Auswahl, Persistenz, Vergleich und Warnungen.
- `app/globals.css`: responsive Dark-Mode-Oberfläche.
- `tests/v32-nba-diversity.test.js`: Grenzen, Strategievarianten, Prognoseverlust und UI-Verknüpfung.
