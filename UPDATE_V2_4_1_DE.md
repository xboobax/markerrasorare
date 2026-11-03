# Markerras Sorare Helper V2.4.1 – NBA Spielplan-/Gegner-Fix

## Was wurde repariert?

In V2.4 wurden NBA-Spielpaarungen im Gameweek Center getrennt abgerufen, aber nicht den NBA-Spielern in der Tabelle und auf den Spielerkarten zugeordnet. Die NBA-Sorare-Abfrage selbst enthält diese Spielinformationen in der stabilen Datenstufe nicht. Deshalb wurde bei NBA-Spielern oft **„Termin unbekannt“** angezeigt und der Gegner fehlte.

V2.4.1 behebt genau diese Trennung:

- Die nächsten NBA-Spiele werden zunächst über den bestehenden BALLDONTLIE-Abruf geladen, falls dein API-Key dafür Zugriff erlaubt.
- Wenn BALLDONTLIE keinen Spielplan liefert, wird ein **öffentlicher ESPN-Webseitenfeed** als zusätzlicher, nicht offiziell unterstützter Ersatz versucht. Dafür wird kein weiterer API-Key benötigt. Sollte dieser Feed nicht erreichbar sein, wird ehrlich „Nicht verfügbar“ angezeigt.
- NBA-Teamnamen werden über eindeutige Franchise-Aliasse abgeglichen (z. B. `LA Clippers` / `Los Angeles Clippers`). Keine geratenen Gegner.
- Die nächste bestätigte Begegnung wird auf den **NBA-Spielerkarten, in der Spielerliste, im Spielerprofil und im Gameweek Center** angezeigt.
- Wenn der Anbieter eine echte UTC-Anstoßzeit liefert, wird sie in **MEZ/MESZ** ausgegeben. Der 24-Stunden-Filter berücksichtigt die Uhrzeit; ohne eine bestätigte Anstoßzeit wird ausschließlich das Datum gezeigt.
- Die Zeitverschiebung zwischen US-Spieltag und deutschem Kalendertag wird berücksichtigt.
- Mannschaften ohne eindeutige Zuordnung bzw. ohne verlässlichen Spielplan erhalten absichtlich keine erfundenen Angaben.

**Unverändert:** `lib/sorare.ts` (alle funktionierenden Scores, Bilder, L5/L10), `lib/nba-stars-feed.ts` (offizielle Sterne) sowie Prognose- und Optimizer-Formeln. Gespeicherte Teams bleiben erhalten.

## Installation über GitHub Desktop (kleines Update)

1. Bestehende V2.4 als Sicherheitskopie auf deinem `main`-Branch belassen.
2. Das ZIP `markerras-v2.4.1-nba-spielplan-fix-nur-update.zip` herunterladen und entpacken.
3. In **GitHub Desktop** Repository `xboobax/markerrasorare` öffnen.
4. **Branch → New Branch**: `fix-nba-spielplan-v241`.
5. **Repository → Show in Explorer**.
6. **Den Inhalt des Ordners `markerrasorare-main`** aus dem entpackten Update in das Hauptverzeichnis des Repositories kopieren. Vorhandene gleichnamige Dateien überschreiben; den `.git`-Ordner nicht löschen. Deine `.env`-Dateien bleiben unverändert.
7. GitHub Desktop: Commit Summary `Fix NBA dates and opponents V2.4.1`; **Commit** und **Publish branch**.
8. Im **Vercel Preview** NBA öffnen und mindestens zwei Spieler verschiedener Teams prüfen. Deren nächste Spiele, Gegner und (soweit verfügbar) deutsche Uhrzeiten sollten sowohl links auf den Karten als auch rechts in der Tabelle erscheinen.
9. NBA-Scores, L5/L10, Bilder und Sterne prüfen. Danach erst nach `main` mergen.

## Wenn NBA-Termine noch fehlen

Der neue Feed ist unabhängig vom Sorare-Score-Abruf. BALLDONTLIE kann für den `/v1/games`-Abruf je nach API-Tarif `403` liefern. Der Ersatzfeed von ESPN ist **nicht offiziell dokumentiert oder garantiert verfügbar** und kann von Vercel aus blockiert sein. In diesem Fall werden keine erfundenen Spiele gezeigt.

Prüfe in Vercel **Logs**, ob `BALLDONTLIE HTTP 403`, `ESPN HTTP 403` oder `ESPN: unbekanntes Antwortformat` auftauchen; teile mir die exakte Fehlermeldung mit. Der Spielplan ist serverseitig 30 Minuten gecacht; ein neues Deployment oder der Ablauf dieses Caches kann nötig sein, um frische Daten zu sehen.

## Tests

- Bestehende Regressionstests und ein zusätzlicher NBA-Termin-/Franchise-/Zeitzonen-/Fallback-Test bestanden.
- TypeScript/TSX mit lokalem Prüf-Shim erfolgreich geprüft.
- Sorare-Score-Datei und NBA-Sterne-Datei via SHA-256 identisch zur V2.4.
- Kein Live-Abruf im Vercel-Betrieb und kein vollständiger Next.js-Produktionsbuild in dieser Umgebung: daher zunächst Preview testen.
