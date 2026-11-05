# V4.5.8.1 – Next.js 14 Build-Hotfix

Fehler behoben: `sorareLiveQueries` war in `app/api/football-live/sorare-scores/route.ts` als zusätzlicher Top-Level-Export vorhanden. Next.js 14 erlaubt bei API-Route-Modulen nur bestimmte Konfigurations-Exports und HTTP-Handler. Der ungenutzte Export wurde entfernt; die Sorare-Abfragen und ihre Aufruflogik bleiben unverändert.

Prüfbar mit `node tests/v4581-next-route-exports.test.js` und `npm run build`.

Installation: Dateien des vollständigen Projekt-ZIPs wie üblich in GitHub übernehmen; Vercel deployed erneut. Keine SQL-Migration und keine neuen Umgebungsvariablen.
