# Neon Builder Pro V3.1.0 — NBA Stars Optimizer 2.0

## Neu im NBA Auto-Builder

- **Max Points:** Punktestärkstes vollständiges Fünferteam innerhalb des 16-★-Budgets, basierend auf den verfügbaren Kandidaten.
- **Smart Value:** Maximiert die erwarteten Sorare-Punkte pro Stern. Damit keine leistungsschwache Kombination allein durch niedrige Sternkosten gewinnt, müssen mindestens 90 % der höchsten gefundenen Gesamtprognose erreicht werden.
- **Safety First:** Optimiert den heuristischen Floor und berücksichtigt DNP-Einsatzrisiko und unvollständige Daten.
- **High Ceiling:** Sucht Teams mit höherem Punktemaximum (heuristischer Ceiling).
- **Alternativen:** Bis zu vier unterschiedliche Profil-Teams. Klick auf eine Variante übernimmt genau diese Kombination in der automatischen Lineup-Ansicht.
- **Matchup:** Nutzt die bereits im bestehenden `enrichForecast()` berücksichtigte gegnerbasierte Anpassung und zeigt die Datenabdeckung und qualitative Gegnerbewertung an; keine doppelte Anpassung und keine erfundenen Daten.
- **Kennzahlen:** Punkte pro Stern, ungenutztes Budget, heuristischer Risikoindex, günstige/schwierige bekannte Matchups.
- **Zielchance:** Die bisherige Zielchance kann bei eingegebenem Score-Ziel zusätzlich priorisiert werden; sie bleibt eine unkalibrierte Modellschätzung.

## Unverändert / Kompatibilität

- 5 Spieler, maximal 16 Sterne in 0,5-Schritten, kein NBA-Captain; Sorare-Sterne und Kartenbonus werden unverändert aus dem bisherigen Datenpfad übernommen.
- Fixierte und gesperrte Spieler, vollständig synchronisierter Kartenbestand, bestätigte OUT-Meldungen, V3.0-Scope je Team, PS Raw / Standard / Q80, Mindestpunkte, Gegner-Konfliktfilter und maximale Wiederverwendung bleiben erhalten.
- Bestehende manuelle Teams, Browser-Speicherkeys, Favoriten, Fußball-Optimierer und Anmeldung werden nicht migriert oder verändert.
- Wird ein bestehendes V3.0-Safe/Ceiling-Preset genutzt, hat es weiterhin Vorrang, bis bewusst ein NBA-Profil ausgewählt wird. Dann wird nur dieses Preset auf `Custom` umgestellt; die übrigen Einstellungen bleiben erhalten.

## Technische Hinweise / Grenzen

- Die Suche nutzt eine begrenzte Mehrziel-0/1-DP pro Halbstern-Budget und fünf Spielern. Bei großen Spielerpools werden maximal 150 Top-Profilkandidaten plus 50 Kandidaten mit hoher Punkte/Stern-Effizienz pro Profil geprüft. Dies ist keine Garantie des globalen mathematischen Optimums über alle geladenen Karten.
- Risiko/Floor/Ceiling sind nicht extern kalibriert. Ohne echte Gegner- oder Verletzungsdaten gibt es keinen fiktiven Bonus.
- `gameplayTierStars` zeigt aktuelle Spielerwerte; eine bereits eröffnete offizielle Gameweek kann einen anderen Sternpreis festgeschrieben haben. Die offizielle Wettkampfzulässigkeit muss vor Einreichung weiterhin geprüft werden.
- Neu: `lib/nba-stars-optimizer.ts`, `tests/v31-nba-stars-optimizer.test.js`, Einbindung in `app/components/arcade-dashboard.tsx` und `app/globals.css`.
- Unit-/Regressionstests können mit `npm run test:arcade` nach `npm install` ausgeführt werden. Eine bestehende asynchrone V2.0-Gameweek-Testdatei kann nach Erfolgsmeldungen aktive Node-Handles halten; unabhängige Ausführung mit Timeout möglich.
