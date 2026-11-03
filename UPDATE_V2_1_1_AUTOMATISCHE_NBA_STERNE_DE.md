# Markerras Sorare Helper V2.1.1 – Offizielle automatische NBA-Sterne

## Was ist neu?

Beim Öffnen des NBA-Bereichs fragt die Anwendung die **aktuellen Sorare-NBA-Spielersterne** aus `gameplayTierStars` ab. Die Werte werden in Spielerlisten, Profilen, dem automatischen 16-Sterne-Optimizer, dem manuellen Lineup Builder, dem Lineup Doctor, Hidden Gems und dem Gameweek Center verwendet.

- Der Abruf ist **separat** vom bewährten Score-/L5-/L10-/Spielerbilder-Abruf (`lib/sorare.ts`). Diese Datei ist unverändert.
- Abfragen laufen automatisch, sobald die NBA-Spielerliste geladen ist. Für erneutes Abrufen gibt es im Bereich **Sorare Official · NBA Star Sync** den Knopf **„Sterne jetzt aktualisieren“**.
- Der normale Serverabruf verwendet ein 15-Minuten-Cache; der manuelle Knopf umgeht es.
- Offizielle Werte sind als **„✓ Sorare“** gekennzeichnet. Nur wenn sie fehlen, gelten zuvor selbst eingetragene Sterne als **manueller Fallback**. Es werden keine Sterne aus L5/L10 erraten.
- Deine bisherigen Kartenmarkierungen, Besitzangaben und Boni bleiben erhalten.
- Die Werte betreffen **geladene** NBA-Spieler. Falls die Sorare-Sterne-Abfrage ausfällt, funktionieren Scores und restliche Anwendung weiterhin. Fehlende oder teilweise verfügbare Werte werden angezeigt.

### Wichtige Sorare-Regel

`gameplayTierStars` ist die **aktuelle Spielerbewertung**. Der bereits für eine konkrete Gameweek festgeschriebene Sternpreis (`starCost`) kann davon abweichen. Daher unbedingt den tatsächlichen Sternpreis **in der betreffenden Sorare-Gameweek** prüfen, bevor du ein Lineup einreichst. Der Helper reicht kein Lineup automatisch ein.

## Installation mit GitHub Desktop – kleines Update (empfohlen)

1. Sicherstellen, dass deine funktionierende **V2.1** in GitHub Desktop ausgewählt ist und keine ungesicherten Änderungen bestehen.
2. Die ZIP **markerras-v2.1.1-auto-nba-sterne-nur-update.zip** herunterladen und entpacken.
3. In GitHub Desktop: **Branch → New Branch** und `nba-sterne-v2-1-1` eingeben.
4. **Repository → Show in Explorer** auswählen.
5. Im entpackten ZIP den Ordner `markerrasorare-main` öffnen und dessen **Inhalt** in deinen Repository-Hauptordner kopieren, vorhandene Dateien ersetzen. Die `.git`-Struktur des bestehenden Repos unbedingt behalten.
6. In GitHub Desktop die Änderungen prüfen, dann **Commit to nba-sterne-v2-1-1** mit `Add official Sorare NBA stars V2.1.1`.
7. **Publish branch** klicken. In Vercel zunächst das **Preview-Deployment** öffnen.
8. In der NBA-Ansicht prüfen, ob im Kasten **„Sorare Official · NBA Star Sync“** offizielle Bewertungen geladen werden. Einen Spieler mit Sternen aus der Liste im manuellen Builder, im Lineup Doctor und in Hidden Gems prüfen.
9. Nach erfolgreichem Test den Branch in `main` übernehmen. Die `.env`-/API-Key-Einstellungen nicht in GitHub hochladen.

## Bei Problemen

- „Sterneabruf nicht erreichbar“: 1–2 Minuten später **„Sterne jetzt aktualisieren“** drücken. Auch die Vercel-Function-Logs unter `/api/nba-stars` prüfen.
- Keine `✓ Sorare`-Werte: Sorare-Antwort bzw. GraphQL-Zugriff in Vercel prüfen. Manuelle Sterne bleiben als Reserve nutzbar.
- Bei Differenz zum Sorare-Gameweek-Lineup: Prüfe den **festgeschriebenen Gameweek-Sternpreis**; dieser kann von der aktuellen Spielerbewertung abweichen.
- Sollte das Preview Probleme haben, bleibt deine alte V2.1 unverändert. Wechsle in GitHub Desktop zum bisherigen Branch zurück.

## Tests und Grenzen

- 21 Testskripte inkl. neuer NBA-Stern-Tests bestanden.
- TypeScript/TSX-Check und CSS-Syntaxprüfung bestanden.
- `lib/sorare.ts` per SHA-256 gegen die stabile V2.1 geprüft: **unverändert**.
- Ein echter Sorare-Liveabruf und der vollständige Next.js-Produktionsbuild konnten in dieser Arbeitsumgebung **nicht** durchgeführt werden. Das Vercel-Preview ist der Live-Test.
- Keine dauerhafte Hintergrund-Synchronisierung: Der Abruf startet bei Besuch/Wechsel in die NBA-Ansicht. Der Knopf aktualisiert auf Wunsch direkt.
