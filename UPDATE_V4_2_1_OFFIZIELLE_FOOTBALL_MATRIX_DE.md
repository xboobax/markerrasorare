# MarkErras Sorare Dream V4.2.1 – Football Scoring Matrix

## Wichtige Korrektur der V4.2-Wertung
V4.2 hatte eine stark vereinfachte, nicht Sorare-konforme Addition von Toren, Assists und wenigen Matchstatistiken. **Diese Formel wurde entfernt.**

Die eigenständige und getestete Datei `lib/sorare-football-scoring.ts` bildet die veröffentlichte **Standard-Scoringmatrix** positionsabhängig ab. Enthalten sind:

- Decisive-Level −3 bis +5 mit Punktetreppe 0/5/15/35/60/70/80/90/100.
- Plus-/Minusereignisse: Tore, Assists, verwandelter herausgeholter Elfmeter, Rettung auf der Linie, Torwart-Clean-Sheet, Strafstoßabwehr, Last-Man-Tackle, rote Karten, Eigentore, verursachte Elfmeter, Fehler vor Gegentor.
- Positionsabhängige AA-Aktionen: Karten, Fouls, Fehler vor Schüssen, Clean Sheet DEF, Gegentore, Klärungen, Tackles, Blocks, Ballgewinne/-verluste, Duelle, Interceptions, Big Chances, Assist-Versuche, **erfolgreiche Pässe**, erfolgreiche Pässe im letzten Drittel, präzise lange Pässe, Fehlpässe, Schüsse aufs Tor, Dribblings, Strafraumaktionen, vergebene Chancen/Elfmeter und Torwartaktionen.
- Double-Double (+4), Triple-Double (+6) und Triple-Triple (+12), wobei jeweils nur der **höchste** erfüllte Bonus gilt.
- AA-Schutz bei positivem DS-Level, 0–100-Obergrenze des Player Scores und separate Kartenbonusfunktion.
- Sorare-26-Torwartänderung: Gegentore −5 AA je Gegentor, **keine** alte negative decisive Aktion für drei Gegentore.
- Sorare-26-Elfmeteränderung: Beim herausgeholten und verwandelten Elfmeter zusätzlich +3 AA, neben dem positiven DS-Level.

Regelwerk-Quellen (offiziell):
- https://help.sorare.com/hc/en-us/articles/4402904001809-How-does-scoring-work-in-Sorare-Football
- https://help.sorare.com/hc/article_attachments/33844626528925
- https://help.sorare.com/hc/article_attachments/33844656986397
- https://sorare.com/blog/football/sorare-26-prize-pools-competition-structure-more-details

### Kein falscher Live-Gesamtscore
Der kostenlose ESPN-Webfeed liefert nicht alle für eine exakte Sorare-Wertung erforderlichen Opta-Einzelaktionen. Darum wird **keine unvollständige Gesamtpunktzahl als offizieller Sorare-Score ausgegeben**. Fehlende Felder werden nicht als Null behandelt. Die angezeigte `AA aus bekannten Quellenwerten` ist eine **Teilberechnung**, kein Spieler-Score.

Nur wenn alle relevanten DS- und AA-Felder vorhanden sind, berechnet die Engine einen Gesamtwert, der **auch dann noch gegen die offizielle Sorare-Wertung abgeglichen** werden muss, da sich die statistische Klassifikation bei den Anbietern unterscheiden kann. Live-Feeds können korrigiert werden.

Die echten Sorare-FINAL-Scores dürfen später für die Prognosekalibrierung verwendet werden. **Teilschätzungen sind ausdrücklich nicht trainingsfähig.**

### Live-Interface
Im Football Live Center gibt es nun eine standardmäßig eingeklappte vollständige Matrix-Tabelle (GK, DEF, MID, FWD), detaillierte Prüfungen pro Spieler und deutliche Hinweise auf fehlende DS-/AA-Daten. Das NBA Live Center bleibt unverändert. Kein neuer permanenter API-Abruf.

### Einschränkungen
- Spezielle, zeitlich begrenzte Event-Multiplikatoren (beispielsweise Sorare-Sonderwettbewerbe mit dreifacher Passbewertung) gehören **nicht** zum Standardmodell und müssten separat anhand der jeweiligen Wettbewerbsvorgaben aktiviert werden.
- Ohne einen verlässlichen Opta-kompatiblen Feed kann selbst eine vollständige Punktematrix keine punktgenauen offiziellen Live-Scores garantieren.
- Die exakte Ergebniskontrolle gegen reale Sorare-Scores und der vollständige Vercel-Produktionsbuild müssen in der Zielumgebung erfolgen.

### Installation
V4.2.0 zunächst sichern. Die gesamten V4.2.1-Projektdateien in einen separaten Branch übernehmen und unter `/match-center?sport=football` prüfen. Danach erst produktiv schalten.
