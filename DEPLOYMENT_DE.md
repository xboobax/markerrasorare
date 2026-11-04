# Markerras Sorare Helper 1.1 – Update mit GitHub Desktop und Vercel

**Ziel:** Bestehende Website `https://markerrasorarev1.vercel.app/` aktualisieren. Es wird **kein neues Repository und kein neues Vercel-Projekt** benötigt.

## 1. Änderungen sichern
1. GitHub Desktop öffnen und das Repository `xboobax/markerrasorare` auswählen.
2. Auf **Fetch origin** und bei Bedarf **Pull origin** klicken.
3. Auf **Current Branch → New Branch** klicken und `feature/four-football-leagues` anlegen.
   Falls dieser Name schon vorhanden ist, einen neuen Namen wie `feature/four-football-leagues-v2` verwenden.

## 2. Version 1.1 kopieren
1. ZIP `markerras-sorare-helper-v1.1.zip` entpacken.
2. In GitHub Desktop **Repository → Show in Explorer** wählen.
3. **Nur den Inhalt** von `markerrasorare-main` in den angezeigten Repository-Ordner kopieren; vorhandene Projektdateien ersetzen.
4. Den versteckten Ordner `.git` und alle persönlichen `.env.local`-Dateien im Repository-Ordner unbedingt behalten; API-Schlüssel niemals ins Repository hochladen.
5. Kein zusätzlicher Unterordner `markerrasorare-main` innerhalb des Repositories anlegen.

## 3. Änderungen hochladen
1. In GitHub Desktop prüfen, dass unter **Changes** neue bzw. geänderte Dateien angezeigt werden.
2. Unten links bei **Summary (required)** eingeben: `Markerras Sorare Helper 1.1 – vier Fußballligen`.
3. **Commit to feature/four-football-leagues** klicken und danach **Publish branch** (oder **Push origin**).

## 4. Vercel-Preview prüfen
1. Im bestehenden Vercel-Projekt nach dem Preview-Deployment für diesen Branch sehen.
2. Auf der Preview-Seite prüfen, dass nur **Bundesliga, LaLiga, Ligue 1 und Premier League** verfügbar sind.
3. **Alle 4 Ligen** wählen: andere Liga-Spieler dürfen nicht erscheinen. Auch die Suche und der Fußball-Lineup-Builder dürfen keine anderen Ligen laden.
4. NBA prüfen: Spielerabruf, fünf Karten, manuell erfasste Sterne, **maximal 16 Sterne**.
5. Bei Datenfehlern die Vercel-Function-Logs prüfen und sicherstellen, dass `SORARE_API_KEY` in **Project Settings → Environment Variables** auch für Preview gesetzt ist.
6. Nur wenn Preview und Build erfolgreich sind, auf GitHub einen Pull Request **von diesem Branch nach `main`** erstellen und mergen.

## Hinweise
- Eine neu installierte ZIP-Datei ändert die Live-Webseite **nicht** von selbst.
- Der Browser-Tab und das sichtbare Logo heißen **Markerras Sorare Helper**. Die bestehende Vercel-Domain bleibt unverändert.
- Bereits markierte Karten werden auf derselben Domain über den vorherigen lokalen Speicherschlüssel `divisorare.cards.v2.*` übernommen. Beim Domainwechsel ist der Browserspeicher nicht automatisch verfügbar.
- Die Alias-Namen für die vier Fußballligen werden in `lib/leagues.ts` gepflegt. Wenn Sorare die offiziellen Anzeigenamen ändert, können betroffene Teams fehlen, bis diese Liste angepasst wird.
- Ein authentifizierter Sorare-Live-API-Test und ein vollständiger Next.js-Produktions-Build sind beim Upload auf Vercel nötig.


## V3.4: tägliche Hintergrund-Automatisierung aktivieren
Neben dem bisherigen Sorare-Deployment muss eine persistente Upstash-Datenbank verbunden werden. `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` und `CRON_SECRET` in Vercel nur als **serverseitige Production-Secrets** hinterlegen. Die Cron-Jobs werden aus `vercel.json` bei einem Production-Deployment registriert. Vollständige Anleitung: `UPDATE_V3_4_AUTOMATION_DE.md`.
