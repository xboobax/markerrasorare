# MarkErras Sorare Dream 4.0.4 – PP/Q80 Anzeige & Originalkarten (Preview)

## Diagnose aus den fünf Vergleichsspielern

- SoProb Q80: Wembanyama 67, Dončić 72, Ty Jerome 56, Landry Shamet 31, Jaylen Wells 36. Summe 262.
- Alter MarkErras-Builder: 51,7 / 59,2 / 35,4 / 21,3 / 22,4 (Summe etwa 190).
- Ursache im Programmcode: `lib/manual-lineup.ts` multipliziert `ceiling` mit `playProb` und nennt das Ergebnis `ceilingScore`; dieser Wert wurde früher im Builder ohne klare Unterscheidung zu Q80 gezeigt.
- **Das war kein mit SoProb vergleichbares Q80.** Eine weitere Abweichung kann aus Prognosebasis und Perzentil-Modell stammen.

## Korrekturen

1. Bei aktivem V3-Prognosemodell zeigt jede gefüllte Builder-Karte **PP bei Einsatz**, **Q80 inkl. genau gewähltem Kartenbonus** und **Risiko-PP** getrennt. Unter V2 bleiben ältere Werte als Risiko-Ceiling gekennzeichnet.
2. Der Teamkopf zeigt **Σ Q80** als Summe individueller Q80-Werte; dies ist **nicht** das echte 80. Perzentil der Team-Gesamtpunkte. Die bisherige risikoangepasste Team-Optimierung bleibt unverändert.
3. Auch der Fußball-Captain wird beim ausgewählten Kartenwert nur einmal über den bereits bekannten Lineupbonus berücksichtigt.
4. Die **verifiziert eigene, bei Sorare gewählte Karte** kann direkt mit ihrer echten `pictureUrl` im Team erscheinen. Die GraphQL-Abfrage versucht das optionale Bildfeld und fällt bei fehlender Schemaunterstützung auf die bisher funktionierende Sync-Abfrage zurück. Originalbilder sind **nicht für beliebige nicht besessene Spieler garantiert**; kein erfundenes Divination-Design.
5. Bei mehreren eigenen Karten wird eine vorhandene Divination-Set-Karte standardmäßig bevorzugt; ausdrücklich gewählte Karten bleiben erhalten. Der Football-Filter erlaubt weiterhin nur das offiziell aktuelle Set. Die NBA-30-Team-Prüfung bleibt erhalten.
6. Offizielle Gegnerlogos werden über einen **separaten, gecachten, optionalen Sorare-Teamfoto-Abruf** angefragt; bei fehlender URL wird nur der Gegnertext angezeigt. Kein zusätzlicher Blocker für Spielerkader oder Kartensync.
7. Die neuen Bildanfragen sind lazy und die neue Teamlogos-Abfrage läuft clientseitig nach dem Öffnen des Builders, damit sie das Seitenladen nicht blockiert.

## Wichtig: Prognosen noch nicht kalibriert

Dies ist zuerst eine **Korrektur falscher Vergleichsgrößen**, nicht der Beweis für genauere Prognosen. PP/Q80 bleiben statistische Modellschätzungen. Die V3-Verteilung ist ein Einzelspielmodell; speziell die NBA-Gameweek mit mehreren Spielen verlangt später ein eigenes Best-of-N-Modell. Es gibt keine bestätigte automatische Gleichheit mit SoProb. Für die eigentliche Modellverbesserung müssen Vorhersagen vor Kickoff gespeichert und später mit offiziellen Sorare-Endergebnissen und tatsächlichen Einsätzen verglichen werden. Diese Engine besitzt bereits eine vorsichtige Prospektiv-Evaluation (`evaluatePredictionV3`).

## Einführung und Prüfung

1. Vorherige 4.0.3-Version sichern und 4.0.4 in eigenem Vercel-Preview-Branch installieren.
2. Nach dem Deployment in der Builder-Auswahl **V3.0 PP + Q80** wählen.
3. Sorare-Sammlung neu synchronisieren, damit optionale `pictureUrl`-Daten geladen werden. Auf der Sammlung-Seite den Erfolg kontrollieren.
4. In einem vollständigen 5er-NBA-Team **Σ Q80** mit den Einzel-Q80 vergleichen (einschließlich Bonus), daneben das **Risiko-PP** prüfen.
5. Ein Foto kann mangels API-Bildfeld weiter als Avatar erscheinen. Andere Editionen über „Meine Karte“ auswählen.
6. Bei Vercel den Produktionsbuild prüfen. Lokal waren die Next-Abhängigkeiten nicht installiert, daher konnte hier kein vollständiger `next build` bestätigt werden.

## Tests

`npm run test:arcade` umfasst V4.0.4 Anzeige-/Bonus- und Bild-Fallback-Tests. `npm run check:syntax` prüft TS-/TSX-Syntax, `npm run check:domain` die typisierten Domainmodule. Kein echter Browser-Performance- oder Sorare-API-Test in dieser Umgebung.
