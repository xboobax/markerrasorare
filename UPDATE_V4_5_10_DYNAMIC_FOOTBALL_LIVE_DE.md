# V4.5.10 – Sorare Live-Center ohne feste Vereinslisten

## Ursache

V4.5.9 hatte für die unabhängige Club-Fotoabfrage nur Hoffenheim und Crystal Palace als manuell verifizierte Slugs hinterlegt. Bei anderen Partien konnte es deshalb trotz vorhandener ESPN-Aufstellungen keine Sorare-Fotos geben. Bei Sportarten/Wettbewerben mit abweichenden Teambezeichnungen konnte auch ein vorhandenes Sorare-Spiel nicht eindeutig gematcht werden.

## Lösung

1. Der bestehende Sorare-`competitionGames`-Abruf bleibt erhalten.
2. Für fehlende Vereinsslugs fragt die API Sorare-`football.clubsReady { name slug }` ab (öffentliche Metadaten, mit 6h-In-Memory-Cache).
3. Verifizierte Clubs werden nacheinander/parallel als **einzelne Club-Queries** geladen: `football.club(slug:) { activePlayers ... games ... }`. So werden keine High-Cardinality-Listen verschachtelt.
4. Spielerfotos werden unabhängig von der endgültigen Sorare-Scoresuche angeboten.
5. Scores werden ausschließlich nach eindeutigem Spiel-/Team-/Anstoß-Abgleich und globalem `node(id:)`-Abruf gezeigt.
6. Über die eingeklappte Quellenprüfung kann man für jedes Spiel sehen, ob beide Vereine erkannt wurden und ob Sorare Quellfehler meldet.

## Deployment

ZIP entpacken und Inhalt von `markerras-sorare-dream/` in das bestehende GitHub-Projekt übernehmen. Vercel Production Deployment starten. Keine neue Datenbankmigration, kein neuer Cron, keine neue kostenpflichtige API.

## Test nach Deployment

Im Football Live Match Center je **eine Partie aus Premier League, Bundesliga, LaLiga und Ligue 1** und eine UEFA-Partie auswählen. Unter `Quellenprüfung · Sorare` die Anzahl erkannter Vereine und Club-Porträts prüfen. Bei 0/2 Vereinen bzw. fehlender Score-Zuordnung die Diagnose der betroffenen Partie (ohne Cookies oder Zugangsdaten) bereitstellen.

**Wichtig:** Nicht alle ESPN-Spiele sind auch Sorare-Spiele. Nur für von Sorare tatsächlich erfasste Partien sind offizielle Sorare-Scores möglich; bei Fotos hängt die Deckung weiterhin von den verfügbaren Sorare-/ESPN-Bildquellen ab.
