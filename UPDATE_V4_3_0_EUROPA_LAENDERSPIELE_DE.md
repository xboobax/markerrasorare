# V4.3.0 – Europa + Länderspiele im Football Live Match Center

## Neu

Das Football Live Center (`/match-center?sport=football`) enthält jetzt vier Wettbewerbsgruppen:

- **Alle Clubspiele (Standard):** Bundesliga, Premier League, LaLiga, Ligue 1 + Champions League, Europa League, Conference League.
- **Ligen:** Die bisherigen vier nationalen Ligen.
- **Europapokal:** UEFA Champions League, UEFA Europa League, UEFA Conference League.
- **Länderspiele:** Freundschaftsspiele, UEFA Nations League, WM-Qualifikationen (UEFA, CONMEBOL, CONCACAF, CAF, AFC, OFC), FIFA WM, UEFA EM und EM-Qualifikation, Copa América, Gold Cup, CONCACAF Nations League, Afrika-Cup (+ Qualifikation) und Asienmeisterschaft.

Jeder Wettbewerb kann zusätzlich einzeln gewählt werden. Neue Wettbewerbe verwenden den bereits vorhandenen Gamecast-/Boxscore-/Scoring-Kern: Sie erhalten dasselbe Match-Center-Layout wie die vier Ligen.

## Meine Sorare-Set-Spieler

Die verifizierte eigene Sammlung wird nach dem **aktiven Fußball-Kartenset** gefiltert. Beim Öffnen eines Spiels werden Spieler über eindeutig übereinstimmende Namen im tatsächlich abgerufenen Spielerkader hervorgehoben. UEFA-Spiele und Nationalmannschaften verwenden dieselbe Erkennung; Kader sind nicht vorab erfunden.

**Grenzen:** Die öffentliche Gesamtmenge aller nicht im Besitz befindlichen Karten des aktuellen Sets wird nicht automatisch von Sorare abgerufen. Nicht im ESPN-Spielerkader aufgeführte Spieler können nicht zuverlässig einem Nationalteam oder seinem Spiel zugeordnet werden. Der Status "Set-Karte" beschreibt nur die verifizierten eigenen Karten, nicht automatisch die Teilnahmeberechtigung einer Karte für jeden Sorare-Wettbewerb.

## PP/Q80 bei Länderspielen

PP/Q80 auf Abruf bleibt für eindeutig zuordenbare Clubs verfügbar. Bei Länderspielen ist dieser Button **absichtlich deaktiviert**, weil die bisherige Prognoseroute nur Sorare-Clubkader unterstützt. Nationalmannschaftsnamen werden nicht fälschlich auf Clubs gemappt. Die tatsächlichen Spielereignisse und verifizierten Set-Spieler sind weiterhin sichtbar.

## Datenquelle und Zuverlässigkeit

ESPN-Soccer-Webfeed ist inoffiziell und keine garantierte, lizenzierte Entwickler-API. Vereinzelt können Wettbewerbe, Aufstellungen oder Spielaktionen unvollständig oder nicht erreichbar sein; die Anwendung zeigt entsprechende Hinweise. Die Fußball-Scoringmatrix aus V4.2.1 bleibt erhalten; ohne hinreichend vollständige Opta-/Sorare-Felder wird weiterhin **kein exakter Sorare-Score behauptet**.

## Performance

- Standard: **7 Club-Wettbewerbe** mit serverseitiger Wiederverwendung pro Wettbewerbsabfrage, statt sämtlicher internationaler Streams.
- Nur bei Auswahl **Länderspiele** werden die 17 internationalen Streams geladen. Mehrere Feeds werden parallel und mit Server-Zeitlimit abgefragt.
- Vereinzelte Fehlschläge zeigen die verfügbaren Spiele weiterhin an und benennen die fehlenden Wettbewerbe.
- Spielübersicht ca. 90 Sekunden, große Länderspiel-Gruppe ca. 120 Sekunden, nur im sichtbaren Browser-Tab; Spieldetails beim ausgewählten Spiel ca. 25 Sekunden live.
- Nur ein Spiel lädt Detail-/Kaderdaten. PP/Q80 bleiben auf Button-Klick.
- Keine zusätzlichen Drittanbieterpakete oder kostenpflichtigen Datenzugänge.

## Installation

1. Funktionierende Version sichern.
2. ZIP in separatem Git-Branch entpacken.
3. Auf Vercel als Preview deployen, erst danach Produktion umstellen.
4. `/match-center?sport=football` öffnen; bei Europapokal-Partien auf **Europapokal**, bei Nationalspielen auf **Länderspiele** filtern.
5. Verbindung, Spielerkader, PP bei Clubpartien, Datenlücken und Performance prüfen.

**Live-Validierung:** ESPN-Abrufe und kompletter Vercel-Produktionsbuild müssen nach Deployment mit echten Spielen geprüft werden. Die nächste Entwicklungsstufe (automatische historische Datenerfassung / Modelllernen) ist **nicht** Teil dieses Updates.

Referenzen für Endpunktkennungen:
- https://github.com/0xShakhawat/ESPN-API/blob/main/docs/sports/soccer.md
- https://py.sportsdataverse.org/docs/uel/reference/site
