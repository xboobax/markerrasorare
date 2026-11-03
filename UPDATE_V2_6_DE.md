# Markerras Sorare Helper V2.6 – Injury & Availability Center

## Installation – kleines Update (empfohlen)

1. V2.6-Update-ZIP entpacken.
2. GitHub Desktop öffnen und das bestehende Repository `xboobax/markerrasorare` auswählen.
3. Am besten zunächst auf Basis der funktionierenden **V2.5** einen neuen Branch `injury-center-v2-6` erstellen.
4. **Repository → Show in Explorer** öffnen.
5. Den gesamten Inhalt von `markerrasorare-main` aus dem ZIP in den bestehenden Projektordner kopieren. Gleichnamige Dateien ersetzen. `.git` niemals löschen.
6. In GitHub Desktop den Commit `Add Injury & Availability Center V2.6` erstellen und auf **Publish branch** klicken.
7. Das Vercel-Preview öffnen. Zuerst NBA, anschließend Bundesliga, Premier League, LaLiga und Ligue 1 prüfen.
8. Nach erfolgreichem Test die Änderungen über den üblichen Merge-Prozess in `main` übernehmen.

**Keine gespeicherten Teams löschen:** V2.6 verändert weder die V2.5-Workspace-Keys noch die alten Browserdaten. Sorare-Scores, Prognosen und offizieller NBA-Sterne-Sync bleiben unverändert.

## Was V2.6 macht

- Neue farbige Statusanzeige auf NBA- und Fußball-Spielerkarten sowie in der rechten Spielertabelle.
- Status: OUT, Doubtful, Questionable, Probable, Available oder „Nicht gemeldet“.
- Filter für gemeldete Ausfälle, fragliche Einsätze und Spieler ohne Statusmeldung.
- Quellenanzeige und Zeitpunkt des **letzten erfolgreichen Abrufs**.
- Regelmäßige Überprüfung, **solange die Webseite geöffnet ist**: normalerweise 30 Minuten, bei verifizierten Anstoß-/Tipoffzeiten innerhalb der kommenden 2 Stunden 10 Minuten und innerhalb der letzten 30 Minuten 5 Minuten. Browser- und Provider-Limits gelten.
- Manuelle Schaltfläche **„Jetzt prüfen“** und Prüfung beim Wiederöffnen/Fokussieren nach Ablauf des normalen Intervalls.
- Im bestehenden Team: Warnung im Risk Radar; *keine automatische Entfernung*, keine Änderung gespeicherter Lineups.
- Bei Smart Auto-Fill, automatischem Arcade-Optimizer und Quick Swap: Spieler mit gemeldetem OUT werden bei **neuen Vorschlägen** ausgeschlossen. Fragliche Spieler bleiben markiert und auswählbar.
- Bei einer neu eingetroffenen OUT-/Doubtful-Meldung während geöffneter Sitzung erscheint eine auffällige Warnung.

## Verwendete Quellen

- **NBA:** ESPN Injury Feed (öffentlicher, nicht offiziell unterstützter API-Endpunkt). Dessen Daten können unvollständig, verspätet oder vorübergehend nicht verfügbar sein. Die offizielle NBA veröffentlicht Injury Reports unter `https://official.nba.com/nba-injury-report-2026-27-season/`; V2.6 parst diese PDFs **nicht**.
- **Fußball, vier unterstützte Ligen:** ESPN-Liga-Injury-Feed als Best-Effort-Abruf. ESPN-Abdeckung schwankt. Für zusätzliche fixturebezogene Verletzungen und Sperren kann optional API-Football eingerichtet werden.
- **API-Football (optional):** `https://www.api-football.com/documentation_v3`, Endpoint `/injuries`, mit Bundesliga (78), Premier League (39), LaLiga (140) und Ligue 1 (61). API-Football dokumentiert **ca. vier Stunden** Aktualisierungsrhythmus für Verletzungen; alle fünf Minuten im Browser zu prüfen bedeutet **nicht**, dass der Lieferant neue Meldungen im selben Tempo liefert.

### Fußball API-Football verbinden (optional, für bessere Abdeckung)

1. Bei API-Football einen API-Key und einen passenden Tarif besorgen. Prüfen, ob der jeweilige Liga-/Saisonbereich die Funktion `injuries` abdeckt.
2. In **Vercel → Project → Settings → Environment Variables** eine neue Server-Variable mit **Name** `API_FOOTBALL_KEY` und **Wert** deinem persönlichen API-Key setzen. Den Key **nicht** in den Browser, die `.env.example` oder GitHub eintragen.
3. Für die gewünschte Umgebung speichern und ein **Redeploy** auslösen, damit die Server-Funktion den Schlüssel erhält.
4. Im Builder **„Jetzt prüfen“** drücken und unter **„Quellenstatus“** nachsehen, ob API-Football erfolgreich ist.

Ohne gültigen Fußball-Key wird nicht behauptet, dass es keine Verletzungen gibt. Bei fehlender bzw. nicht funktionierender ESPN-Abdeckung steht der Datenstatus auf „Nicht verfügbar“ bzw. „Nicht gemeldet“.

## Wichtig – kein Realtime-/Push-Versprechen

- Die App führt **keine unsichtbare Hintergrundüberwachung** und sendet keine Push-/E-Mail-Nachrichten, wenn der Browser geschlossen ist.
- Ein Polling-Intervall ist nur die Häufigkeit unserer Abrufversuche. Provider aktualisieren oft später; nicht jede Ausfallmeldung erscheint sofort.
- Die Anzeige `AVAILABLE` wird nur verwendet, wenn eine Quelle ausdrücklich eine solche Meldung liefert. Das Ausbleiben einer Meldung wird **niemals** als gesund interpretiert.
- Bei Fußball bezieht sich die API-Football-Abwesenheit auf das konkrete Spiel. Eine historisch alte Verletzungsangabe darf nicht ungeprüft für künftige Spiele gelten.
- Verschiedene Spieler mit gleichem Namen und unklarem Verein werden nicht automatisch vermischt. Wenn eine externe Teambezeichnung nicht zuverlässig zugeordnet werden kann, bleibt der Status unbekannt.
- Verletzungsdaten verändern **keine** Punkteprognose automatisch; Warnungen dienen der Entscheidung vor dem Sorare-Lock.

## Was im Vercel-Preview testen?

- NBA: Team Builder öffnen, Quelle und Zeitpunkt oben prüfen, Spieler-Statusfilter betätigen.
- Bei NBA knapp vor Spielbeginn: „Jetzt prüfen“ klicken; erneuten Providerabruf laut dessen Aktualisierungszeitpunkt kontrollieren.
- Fußball: jede Liga einzeln aufrufen und Quellenstatus anschauen. Ohne `API_FOOTBALL_KEY` eventuell keine Meldungen vorhanden – das ist erwartetes ehrliches Verhalten.
- Test mit einer echten gemeldeten OUT-Person: Spielerkarte erhält roten Rahmen und Risk Radar markiert diesen Spieler. **Quick Swap** zeigt nur zulässige Vorschläge.
- Smart Auto-Fill: bestehende Teamspieler und Fixierungen bleiben erhalten; OUT-Spieler werden nicht neu vorgeschlagen.
- NBA: 16-Sterne-Limit, Sternequelle, Scoreanzeige, Gegner und Datumsdarstellung weiterhin prüfen.
- Fußball: TW/VER/MF/ST/EX, Scorehistorie und Spieltermine weiterhin prüfen.

## Technische Prüfung

`npm install` und danach `npm run test:arcade` – enthält auch den neuen `v26-availability.test.js` und alle bestehenden Tests. API-Aufrufe wurden nicht live von diesem Arbeitscontainer verifiziert; der **Vercel-Preview-Test mit echten Datenquellen** ist deshalb erforderlich.
