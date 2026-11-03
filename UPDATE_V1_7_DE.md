# Markerras Sorare Helper V1.7 – automatischer Ergebnisabgleich (November 2026)

**Ausgangsversion:** V1.6.2 (funktionierende Fußball-Scores und Spielerbilder). Der bestehende `lib/sorare.ts`-Code ist UNVERÄNDERT. Die vier Fußballligen, NBA-Sternegrenze, Spielerprofile und manuelle/automatische Lineup Builder bleiben bestehen.

## Was ist neu?

- Im Bereich **„Prognose gegen Ergebnis“** wird beim Öffnen der App einmal nach offiziell abgeschlossenen Sorare-Spielergebnissen für bereits **vor dem Spiel gespeicherte** Prognosen gesucht. Du kannst auch auf **„Ergebnisse prüfen“** klicken.
- Die Zuordnung erfolgt nur bei eindeutiger Übereinstimmung: gleicher Spieler, gleicher UTC-Spieltag, Score mit Status `FINAL`, und Prognose gespeichert **vor** dem Spiel. Unsichere Fälle bleiben offen. Keine Schätzwerte werden als echte Ergebnisse eingetragen.
- Die automatische Prüfung arbeitet in kleinen Paketen mit höchstens 12 gespeicherten Einträgen pro Klick/Seitenaufruf. Sie läuft **nicht im Hintergrund**, wenn die Webseite geschlossen ist.
- Unter **„Prognose gegen Ergebnis“** erscheinen MAE, RMSE, Bias, Anzahl automatisch zugeordneter und manuell eingetragener Ergebnisse.
- Bei mindestens **20 Ergebnissen aus fünf verschiedenen Tagen** erhältst du einen vorsichtigen Hinweis auf eine mögliche Korrektur der Prognosen. Dieser Hinweis verändert die bestehende Berechnung **nicht** automatisch.
- **„Prognosen sichern (JSON)“** / **„Sicherung importieren“** speichern oder laden deinen lokalen Bestand. Die Vorhersagewerte bleiben nach dem Speichern unverändert (kein rückwirkendes Update).

## Grenzen und wichtige Hinweise

1. Du musst die Prognosen **vor dem Spiel** ausdrücklich speichern (im Spielerprofil oder als Lineup). Ohne vorherigen Snapshot lässt sich die Vorhersage nicht nachträglich seriös bewerten.
2. Die automatische Zuordnung setzt voraus, dass Sorare einen **Spieltermin** im gespeicherten Eintrag liefert. Fehlt der Termin, kannst du den Score weiterhin manuell eintragen.
3. Die neue separate Sorare-Abfrage ist auf `anyPlayer -> allPlayerGameScores -> nodes { score scoreStatus anyGame { date } }` ausgelegt. Diese API-Annahme ist durch öffentlich dokumentierte Sorare-Abfragen plausibel, aber **nicht in einer Live-Vercel-Umgebung verifiziert**. Falls Sorare das Feld für einzelne Spieler ablehnt, bleibt die Prognose unangetastet und es wird ein API-Fehler angezeigt.
4. `DID_NOT_PLAY` wird **nicht** automatisch als null Punkte gewertet. Dadurch kann die Auswertung von nicht eingesetzten Spielern verzerrt sein; solche Fälle können manuell ergänzt werden. Ebenso werden Bonuspunkte einer spezifischen Sorare-Karte nicht automatisch rekonstruiert.
5. **Kein dauerhaft laufender Job, keine Cloud-Datenbank:** Die Daten bleiben im Local Storage des Browsers. Auf einem anderen PC/Gerät sind sie ohne JSON-Export/Import nicht verfügbar. Automatisches Archivieren aller Vorhersagen, eine echte Cron-Auswertung und gemeinsamer Zugriff mehrerer Geräte würden eine Datenbank und eine geplante Serveraufgabe benötigen.
6. Für Ergebnisabgleiche wird nur die bestehende `SORARE_API_KEY`-Konfiguration verwendet. BALLDONTLIE ist für dieses Feature nicht nötig. API-Limits bleiben relevant.
7. Die Beispiel-Turniere, Spieler-Limits und Arcade-Sterne-/Positionsregeln der bestehenden Version sind unverändert. Eine Backup-Version behalten!

## GitHub Desktop / Vercel

1. Das ZIP herunterladen und entpacken.
2. GitHub Desktop: Repository `xboobax/markerrasorare`, von funktionierendem `main` einen neuen Branch `helper-v1-7` erstellen.
3. **Repository → Show in Explorer**. Dateien aus `markerrasorare-main` hineinkopieren, vorhandene gleichen Namens ersetzen. **`.git` niemals löschen.** `.env` und Geheimnisse nicht hochladen.
4. Commit Summary: `V1.7 Prognose-Tracking mit Sorare FINAL Scores`.
5. **Commit to helper-v1-7 → Publish branch**.
6. Vercel-Preview öffnen. Bundesliga, LaLiga, Ligue 1, Premier League, NBA-Statistiken und Spielerbilder testen. Eine Prognose vor einem zukünftigen Spiel speichern und erst nach dem Spiel die automatische Prüfung nutzen. Für einen schnellen Test mit bereits gespeicherten alten Prognosen kann eine JSON-Sicherung verwendet werden – aber keine Prognosen nachträglich vortäuschen.
7. Erst nach erfolgreichem Preview den Branch per Pull Request in `main` mergen.

## Entwickler / Tests

- `lib/tracking-auto.ts`: Datumsvalidierung, eindeutige FINAL-Zuordnung, kein Rateversuch ohne Spieltermin.
- `app/api/tracking-results/route.ts`: serverseitiger POST, 12-er-Limit, Spiel-/Statusabfrage ohne Offenlegung der API-Keys.
- `lib/tracking.ts`: unveränderliche Prognose-Snapshots, Ergebnisübernahme, Backup-Parser, Statistik/Kalibrierung.
- `app/components/arcade-dashboard.tsx`, `app/globals.css`: neue Bedienoberfläche.
- `tests/v17-tracking.test.js`: automatisierte Tests einschließlich fehlender, falscher, doppelt passender und noch nicht finaler Ergebnisse.
- `npm run test:arcade` testet die TypeScript-Kernmodule; einen vollständigen `npm run build` bitte über das Vercel-Preview prüfen.

## Rückfall / Rollback

Wenn Vercel eine Fehlermeldung meldet, den Preview-Branch **nicht** in `main` mergen. Wenn bereits live, in GitHub den V1.7-Commit revertieren oder bei Vercel ein vorheriges erfolgreiches Deployment wiederherstellen. Der bestehende funktionierende `lib/sorare.ts` muss nicht ersetzt werden.
