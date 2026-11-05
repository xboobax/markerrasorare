# V4.5.4 – Fußball-Quellenprüfung und alternativer Statistikparser

## Befund aus Produktion am 05.11.2026
- V4.5.3: 720 Fußball-Prognosen sind gespeichert, alle für zukünftige Spiele.
- Fußball-Europa-Job meldete 10 abgeschlossene Spiele, aber 0 archivierte Einzelstatistiken ohne Feedfehler.
- Daraus folgt **nicht**, dass ESPN in allen 10 Spielen keine Daten hat: die bisherige Parser-Logik las nur fest definierte `boxscore.players[].statistics[].athletes[]` und ignorierte alternative, benannte Roster-Stats.
- Ohne eine aktuelle Rohdaten-Stichprobe lässt sich **nicht sicher** entscheiden, ob der Feed keine Einzelstatistiken liefert oder sein Format nicht erkannt wird.

## Fix
- Parser liest zusätzlich nur **eindeutig benannte und numerisch bestätigte** Statistikfelder aus alternativen Spieler-Roster-Zeilen; unterstützt `stats` als benannte Schlüssel-Wert-Struktur oder Liste benannter Werte.
- `--`, `DNP` und fehlende Zellwerte werden **nicht** mehr als beobachtete 0 gewertet.
- Eine reine Aufstellung ohne Minuten/Ereignisse führt weiterhin zu keiner archivierten Spielerleistung.
- Vorhandene 32 Cronjobs, Fußball-/NBA-Prognosen, Learning-Modell und Datenbankstruktur bleiben unverändert; keine Migration.

## NEU: gezielte Quellen-Diagnose
Nach Deployment, ohne Login, nur Zusammenfassungen ohne Personen-/Teamdaten:

- `/api/football-stats-diagnostics?competition=uefa.champions&day=2026-11-05`
- `/api/football-stats-diagnostics?competition=ger.1&day=2026-11-05`
- Auch `uefa.europa`, `uefa.europa.conf`, `uefa.nations` oder andere erlaubte Wettbewerbs-IDs sind möglich.

Der Endpunkt untersucht maximal 2 abgeschlossene Partien am angegebenen Tag und unterscheidet u. a.
`source_has_no_parseable_individual_stats`, `no_player_roster_or_boxscore`, `ready` und `observations_not_archivable`.
Ein vollständiger Saisonimport oder Spielerdatenimport wird **nicht** angestoßen.

## Abdeckung (Achtung!)
- Live- und Statistik-Cron-Konfiguration umfasst 4 heimische Ligen, die 3 UEFA-Pokale und 17 internationale Wettbewerbe (einschließlich Freundschaftsspiele und Qualifikationen).
- Der Statistik-Job erfasst derzeit den bestätigten Kader beider Mannschaften eines besuchten Spiels, **nicht ausschließlich** Spieler mit aktueller Zugehörigkeit zu den vier Ligen. Eine verlässliche klubübergreifende Stammdaten-/Transfer-Zuordnung ist gesondert zu entwickeln.
- Bei Europa- und Nationalspielen kann die ESPN-Quelle keine Einzelspielerstatistiken bieten; dann bleibt der Archivzähler ehrlich bei 0.
- Die V4.4-Prognoseaufnahme nutzt Sorare `nextGame` bei Spielern der vier Ligen. Noch nicht belegt ist, dass `nextGame` *jeden* Pokal-/Nationalspieltermin erfasst; der Live-Match-Center-Feed allein beweist keine automatisierte PP/Q80-Prognose für Nationalteams.
- Es werden **keine** falschen offiziellen Sorare-FINAL-Scores, keine unsicheren Club-Nationalteam-Zuordnungen und kein automatischer Modell-Promote erzeugt.

## Folgeprüfung
Nach erfolgreichem Deployment den Europa-Diagnose-Endpunkt öffnen und die gesamte JSON-Antwort senden. Erst damit wird sichtbar, ob ein Quellendaten- oder Formatproblem besteht; am Folgetag anschließend `/api/learning-v45?sport=football` prüfen.
