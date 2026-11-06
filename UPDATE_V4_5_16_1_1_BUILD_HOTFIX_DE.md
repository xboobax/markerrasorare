# V4.5.16.1.1 – Neon TypeScript-Build-Hotfix

## Fehler in Vercel

`app/api/learning-diagnostics/route.ts:23:26 Type error: Expected 2-3 arguments, but got 1.`

Die verwendete Version von `@neondatabase/serverless` erwartet bei `sql.query()` die Signatur `query(sqlText, params, options?)`. Vier bisherige Diagnoseabfragen ohne Parameterliste wurden zu `sql.query(sqlText, [])` korrigiert. Die beiden bisherigen parameterisierten Abfragen bleiben bestehen. Das ändert **keine Daten und kein SQL-Ergebnis**, sondern behebt lediglich den Typfehler.

## Installation

1. Das vollständige ZIP wie gewohnt entpacken und die Projektdateien in GitHub ersetzen.
2. Vercel Production-Deployment starten.
3. Auf `Ready` und erfolgreiches `Linting and checking validity of types` achten.
4. Erst danach `reconcile_import` bei GitHub Actions ausführen.

**Keine Neon-Migration, kein neuer CRON_SECRET, keine Änderung an Predictions, NBA-/Football-Optimizern oder der Spielerzuordnung.**

## Tests

Ein neuer Regressionstest prüft die Neon-Query-Signaturen in der Diagnose-Route. Lokale Syntax- und Fachtests wurden geprüft. Ein vollständiger Next.js-Produktionsbuild war in dieser Umgebung wegen einer nicht erreichbaren npm-Registry nicht möglich und muss bei Vercel bestätigt werden.
