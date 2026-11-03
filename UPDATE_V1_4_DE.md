# Markerras Sorare Helper V1.4 — Daten, Suche, Matchups & Tracking

## Was wurde verändert?

1. **Kadersuche & Pagination:** `lib/sorare.ts` ruft Fußball- und NBA-Teamkader über die Sorare-GraphQL-API ab. Cursor-Pagination verhindert, dass Spieler hinter den ersten 100 Datensätzen stillschweigend verschwinden. Ein veraltetes API-Schema führt zu einem **explizit als unvollständig gekennzeichneten** Fallback. Alle NBA-Teams des Sorare-Teamindex werden berücksichtigt (nicht mehr nur `ready`-Teams). Duplikate werden anhand der Spieler-Slugs entfernt.
2. **Spielersuche & Detailprofile:** Namen in Tabelle, Top Picks, Matchups und Lineups sind anklickbar. Spielerprofile zeigen Team, Position, Foto/Initialen, Formbalken für historische Scores, L5/L10, Einsatzwahrscheinlichkeit, Floor/Ceiling, Gegner und nächstes Spiel. Escape oder X schließt das Profil. Diakritische Zeichen werden bei der Suche ignoriert, z. B. `Mbappe` findet `Mbappé`.
3. **Fußball-Scope:** Durch „Alle 4 Ligen“ werden aktuelle Sorare-Kader aus Bundesliga, LaLiga, Ligue 1 und Premier League zusammen gesucht. Standardmäßig ist zunächst Bundesliga ausgewählt, um unnötig viele API-Anfragen zu vermeiden. Andere Ligen werden weiterhin serverseitig ausgeschlossen.
4. **Automatische Matchup-Daten (optional):** Die Module können reale Gegentore/Spiel (API-FOOTBALL) sowie Gegenpunkte/Spiel (BALLDONTLIE) einlesen, in relative 1–5-Abwehrstufen umrechnen und bekannte Gegnernamen eindeutig zuordnen. Eine falsche oder mehrdeutige Namenszuordnung bleibt *unbewertet*; manuelle Einstufungen haben Vorrang. Dies sind statistische **Team-Form-Proxys**, nicht direkte positional defensive matchups oder Sorare-Punkt-Prognosen.
5. **Lineup Builder:** Fünf Varianten und eine Tabelle für den Direktvergleich von Prognose, Floor, Ceiling, NBA-Sternen und Zielchance. Bestehende Regeln bleiben: fünf Spieler, NBA maximal 16 Sterne, Fußball GK/DEF/MID/FWD/FLEX.
6. **Prognose-Tracking:** Einzelne Spieler oder fünf Lineup-Prognosen können lokal gespeichert werden. Nach dem Spiel trägst du den echten Sorare-Score ein. Der Tracker zeigt MAE (mittlerer absoluter Fehler), RMSE und Bias. Diese Ergebnisse sind **nicht automatisch mit Sorare abgeglichen**; dafür benötigen wir später ein persistentes Backend und eindeutige Spiel-IDs.

## Wichtige Einschränkung zur Vollständigkeit

„Jeden Spieler der Sorare-Datenbank“ kann die App **noch nicht garantieren**. Der verfügbare Datenadapter fragt die **aktiven Kader** der von Sorare gelieferten Teams ab. Spieler ohne aktiven Mannschaftskader, historische/vereinslose Spieler und Teams, die der Sorare-Index nicht zurückgibt, können fehlen. In Fußball beschränkt sich die Suche absichtlich auf die vier gewünschten Ligen. Die App zeigt fehlgeschlagene und unvollständige Kader an statt „100%“ zu behaupten. Ein vollständiger globaler Sorare-Index würde einen anderen offiziell unterstützten Endpunkt oder periodisch synchronisierten Backfill in einer Datenbank erfordern.

## Einrichtung der Matchup-Daten auf Vercel

**Die Anwendung funktioniert auch ohne zusätzliche Schlüssel.** Wenn du automatische Defensivdaten nutzen möchtest, erstelle ggf. bei den jeweiligen Anbietern einen eigenen API-Zugang und hinterlege in Vercel (Project → Settings → Environment Variables):

- `API_FOOTBALL_KEY`: API-FOOTBALL (API-Sports). Benötigte Berechtigung: `/standings` für vier Fußballligen. Der Adapter nutzt Ligacodes `78`, `140`, `61`, `39` und die aktuelle Saison.
- `BALLDONTLIE_API_KEY`: BALLDONTLIE NBA. Der Adapter nutzt `/v1/games` und abgeschlossene Spiele der aktuellen Saison. Beachte mögliche Plan-, Raten- und Kostenlimits.
- `SORARE_API_KEY`: Bestehender Sorare-API-Schlüssel bleibt nötig, wenn du damit bereits auf deine Daten zugreifst.

**Niemals API-Schlüssel in die öffentliche GitHub-Datei, als `NEXT_PUBLIC_`-Variable oder in einen Screenshot schreiben.** Nach Einrichtung ggf. neu deployen. Je nach API-Tarif sind Feeds eventuell nicht verfügbar. Der UI-Hinweis sagt dann, ob ein Feed fehlt oder einen Fehler meldet. API-Aufrufe sind serverseitig und werden 6 Stunden über das Next.js-Fetch-Caching zwischengespeichert.

Die automatischen Matchup-Bewertungen basieren auf Ligaperzentilen der kassierten Tore/Punkte. Es sind **keine** direkten Spieler-gegen-Position-Defensivdaten. Verletzungen stammen weiterhin aus Sorare-Feldern, wo vorhanden. Prognoseminuten und xG/xA sind derzeit manuelle Scouting-Eingaben. Keine Verletzungsmeldungen werden geraten.

## GitHub Desktop & Vercel

1. Erstelle im GitHub Desktop für `xboobax/markerrasorare` einen neuen Branch `helper-v1-4`.
2. Entpacke diese ZIP; kopiere **den Inhalt** von `markerrasorare-main` in den lokalen Repository-Ordner (Repository → Show in Explorer). Den versteckten `.git`-Ordner niemals löschen.
3. Commit Summary `Markerras Sorare Helper V1.4`, Commit → Publish branch/Push origin.
4. Prüfe das Vercel Preview-Deployment und suche nach einem bekannten Spieler aus jeder der vier Ligen und aus NBA. Teste im Detailprofil das Speichern einer Prognose, im Tracker den Ist-Wert und im NBA-Builder das 16-Sterne-Budget.
5. Erst danach den Branch über GitHub Pull Request nach `main` mergen; bei aktiviertem GitHub/Vercel-Deployment wird die neue Version veröffentlicht.

## Qualitätschecks

`npm install` und `npm run test:arcade` (Sechsteiliges Testpaket inklusive V1.4). `npm run build` auf deinem Computer oder im Vercel Preview überprüfen. Die hier durchgeführten Prüfungen umfassen Tests und TypeScript-Syntaxchecks. Ein vollständiger Next.js-Build und echte API-Anfragen waren in dieser Ausführungsumgebung wegen fehlender Internet-/Paketverbindung nicht möglich.
