# MarkErras Sorare Dream 4.0.1 – Vercel-Build-Fix

## Problem
Vercel hat bei Next.js 14.2.35 nach erfolgreicher Kompilierung, Typprüfung und Erstellung aller 15 statischen Seiten während des Datei-Tracings abgebrochen:

`ENOENT: lstat .next/server/app/(dream)/page_client-reference-manifest.js`

Der Fehler tritt **nach** der eigentlichen Seitenkompilierung auf und betrifft die interne Next.js-Manifest-Zuordnung, nicht Sorare, die Authentifizierung oder die Prediction Engine.

## Korrektur
- Die nicht für URLs benötigte Route-Gruppe `app/(dream)/` wurde entfernt. Alle bisherigen URLs bleiben unverändert.
- Workspace-Seiten liegen jetzt unter `app/page.tsx`, `app/builder/[sport]/page.tsx`, `app/players/page.tsx` usw.
- Die bestehende schwarz-goldene Navigation wird jetzt über `app/layout.tsx` und `features/shell/dream-app-router.tsx` persistent gerendert.
- `/legacy`, `/status` und `/diagnose` bleiben im bisherigen separaten Layout.
- Autoprefixer-Warnungen im neuen `dream.css` wurden durch `flex-start`/`flex-end` bereinigt.
- Neuer Regressionstest `tests/v401-vercel-manifest.test.js` prüft Route-Struktur und Authentifizierungsroute.

## Installation
1. ZIP entpacken; den **Inhalt** des Ordners `markerras-sorare-dream` in das GitHub-Projekt übernehmen.
2. Achtung: **Alten Ordner `app/(dream)` auch im Repository löschen**! Nur neue Dateien hochzuladen reicht nicht, da sonst beide Routen konkurrieren.
3. Neues Vercel-Deployment starten; nach Möglichkeit bei **Redeploy → Use existing Build Cache deaktivieren**.
4. Unter den Build-Logs prüfen, ob `next build` **und das abschließende Vercel-Datei-Tracing** fehlerfrei abschließen.
5. Danach `/`, `/builder/football`, `/builder/nba`, `/daily-missions`, `/players`, `/match-center`, `/collection`, `/analytics`, `/guides` und `/legacy` kurz testen.

## Tests / Grenzen
Die lokale Projekt-Testsuite und Syntax-/Typprüfungen lassen sich ohne komplettes `next`-Paket ausführen. Ein vollständiger Next.js/Vercel-Build ist nur dann bestätigt, wenn er in einer Umgebung mit installierten Next.js-Abhängigkeiten tatsächlich ausgeführt wurde. Wenn Vercel weiterhin mit einem Manifestfehler abbricht, das **neue** Build-Log prüfen, insbesondere ob `app/(dream)` im Deployment noch existiert.

Keine neuen Kosten, kein Upstash erforderlich. Bestehende Sorare-Daten und lokale Browserdaten bleiben unangetastet.
