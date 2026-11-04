# Neon Builder Pro V3.9.2 – Vercel Build Fix

## Ursache

In `app/components/arcade-dashboard.tsx` war `CachedPrediction` als `Forecast` plus Prognosemodelle definiert. Der Matchup-Bereich braucht aber auch die bereits von `enrichForecast()` berechneten Scouting-Felder wie `opponentRating` und `matchupAdjustmentPct`. Beim Vercel-TypeScript-Check führte das zum Fehler `Property 'opponentRating' does not exist on type 'CachedPrediction'`.

## Korrektur

`CachedPrediction` ist nun `ScoutedForecast & { modelV18; modelV2 }`, wobei `ScoutedForecast` direkt aus `lib/matchups.ts` importiert wird. Die Werte und Berechnungsformeln wurden nicht verändert. Das Ranking im Analytics-Tab verwendet weiterhin dieselben Matchup-Felder.

## Tests und Deployment

Zusätzlicher Regressionstest überprüft den tatsächlichen Typ der zwischengespeicherten Matchup-Prognosen. Die bestehende Projekt-Testsuite bleibt erhalten. Lokal war wegen fehlendem Zugang zur npm-Registry kein vollständiger Next.js-Build möglich; der Production-Build ist erst nach dem Vercel-Deployment bestätigt.

Bitte diese Version vollständig anstelle von V3.9.1 nach GitHub `main` übertragen. Der TypeScript-Build sollte anschließend den gemeldeten Fehler nicht mehr ausgeben. Sollte Vercel weitere Fehlstellen zeigen, bitte den neuen Log senden.
