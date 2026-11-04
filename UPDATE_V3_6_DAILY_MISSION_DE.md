# Neon Builder Pro V3.6 – Daily Mission Assistant

## Wo finde ich den Picker?

Im Tab **Builder** oben auf **⚡ Daily Mission** klicken und das kompakte Panel öffnen. Die vier Bereiche Builder / Spieler / Analyse / Sammlung bleiben unverändert.

## Fußball – Entscheidender-Spieler-Picker

Ausgewertet werden Spieler mit bestätigtem Spiel im ausgewählten Berliner Kalenderzeitraum. Feldspieler und Torhüter erhalten getrennte Top-6-Listen. Gesuchte entscheidende Aktionen laut bereitgestelltem Sorare-Screenshot und Nutzerangabe:

- Feldspieler: Tore, Assists, auf der Linie geklärt.
- Torhüter: Elfmeter gehalten, zu null gespielt.

**Einschränkung:** In der bereits vorhandenen Sorare-Datenabfrage stehen L5/L10, Prognosen, Einsatzstatus und Gesamtscores zur Verfügung, aber **keine zuverlässigen ereignisbezogenen Häufigkeiten** für diese fünf Aktionen. Die Empfehlungen nutzen daher einen transparenten, ausdrücklich **nicht kalibrierten Ranking-Index** aus Prognose, Form, geschätztem Einsatz und – falls bereits verfügbar – optionalen xG/xA-Angaben. Insbesondere wird NICHT behauptet, ein hoher Score belege eine bestimmte Anzahl Tore/Clean Sheets/Elfmeter-Paraden. Torhüter und Feldspieler werden bewusst **getrennt** bewertet. Einzelne Aktionen auf der Torlinie sind nicht mit Sorare-„Last Man Tackles“ gleichzusetzen.

## NBA – Daily Picker Classic

Der Kandidat muss mit seinem tatsächlichen Score gleichzeitig

1. seine offiziell verfügbare L10-Marke um mindestens 7 Punkte übertreffen und
2. mindestens 20 Managerpunkte erzielen.

Darum ist die nötige Schwelle `max(20, L10 + 7)`. Der Picker zeigt die aktuelle Prognose **bei Einsatz**, den Abstand zur Zielmarke und gegebenenfalls `x/n` historische Score-Treffer. Als L10 wird kein Mittelwert aus nur zwei oder drei Spielen missbraucht. Das Ranking kombiniert Prognoseabstand, Verlaufsdaten und Einsatzrisiko. Der Index ist keine statistisch überprüfte Trefferwahrscheinlichkeit. Sorare entscheidet über die tatsächlich erreichten Managerpunkte und Missionsanerkennung.

## Zeit, Besitz und Sicherheit

- Auswahl **Heute / Morgen** nach Europe/Berlin; für NBA außerdem **Nächste 24 Stunden** auf Basis bestätigter Tipoff-Zeiten.
- Verletzte, bereits ausgeschlossene Spieler und NBA-Spiele ohne nachweisbare Ansetzung werden nicht empfohlen. Schon begonnene NBA-Spiele werden nicht als kommende Tipps geführt.
- Optionaler Filter **Nur meine Karten**; bei nicht synchronisiertem Bestand wird deutlich auf lokale Markierungen hingewiesen.
- Ergebnisse beziehen sich **nur auf den gerade geladenen Liga-/Team-Spielerpool**, nicht auf die vollständige Sorare-Datenbank.
- **+ Builder** trägt den Spieler lediglich in die lokale manuelle Aufstellung ein. Es findet keine automatische Abgabe einer Daily Mission bei Sorare statt.
- Keine Pflicht zu Upstash oder zusätzlichen API-Schlüsseln. Die bisherige V3.5-Logik, Optimizer, Prognosen und vier Tabs bleiben erhalten.

## Tests und Deployment

`npm run test:arcade` prüft alle bisherigen Tests und `tests/v36-daily-mission.test.js`: Schwellen, L10-Fehlwerte, lokale/UTC-Spielzeiten, Besitz, Ausfälle, bestätigte NBA-Tipoffs sowie den Fußball-Fallback. Ein vollständiger Next.js-Produktionsbuild muss auf Vercel mit den dort verfügbaren Next.js-Abhängigkeiten erfolgen.
