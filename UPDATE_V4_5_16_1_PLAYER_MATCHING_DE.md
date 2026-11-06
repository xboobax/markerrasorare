# V4.5.16.1 – Sicherer ESPN ↔ Sorare Spielerabgleich

## Was wurde korrigiert?

Nach dem historischen ESPN-Import lagen 17.289 Spielerleistungen aus 552 Spielen und 96 offizielle Sorare-FINAL-Scores für 6 Spieler vor. 58 mögliche Namens-/Zeit-Treffer wurden festgestellt, aber bisher wurden keine verifizierten Links gespeichert.

Der frühere Sorare-Import prüfte höchstens 16 Scores pro Lauf und verwendete bei manchen Vereinen inkompatible Namensschreibweisen. V4.5.16.1 ergänzt einen **eigenen, wiederaufnehmbaren Archivabgleich**, der sich nicht auf neue Sorare-Downloads verlassen muss.

- Bereits gespeicherte offizielle FINAL-Scores in Neon seitenweise prüfen (40 pro Aufruf; maximal 60).
- Spielername **und** Spielerteam **und** beide Vereine des Spiels **und** Anstoßzeit (max. ±3 Stunden) müssen übereinstimmen.
- Konservative Vereinsvarianten: Liverpool FC/Liverpool, Stade Rennais F.C./Stade Rennais, FC Lorient/Lorient, RC Lens/Lens u. a.
- Mehrdeutige Namen, mehrere ESPN-IDs, widersprüchliche Identitätszuordnungen oder falsche Gegner werden **nicht** automatisch verknüpft.
- Verifizierte Zuordnungen dauerhaft in `football_stats_v4515_identity_links` speichern; dazugehörige ESPN/Understat-Spielstatistiken dem Sorare-Slug zuordnen.
- Die Profildarstellung verwendet denselben Vereinsabgleich, damit ESPN-Statistiken und Sorare-Scores zur richtigen Partie zusammen angezeigt werden.
- Bereits gespeicherte Statistikwerte und offizielle Sorare-Scores bleiben unverändert.

## Installation

1. Das vollständige Projekt aus dem V4.5.16.1-ZIP in GitHub hochladen. **Den versteckten `.github`-Ordner mit hochladen.**
2. In Vercel prüfen, dass das Production-Deployment **Ready** ist.
3. **Keine neue Neon-SQL-Migration nötig.** Die vorhandenen Tabellen von V4.5.15 und V4.5.16 bleiben erhalten.
4. GitHub: `Actions → Football-Stats Saisonimport (ohne Python am PC) → Run workflow`.
5. Im Feld `mode` **`reconcile_import`** auswählen. Andere Felder bleiben unverändert und sind für diesen Modus irrelevant.
6. Den Lauf starten und **„Import ausführen“** aufklappen. Erwartete Ausgabe:
   `Page 1: ... FINAL-Scores, ... candidates, ... verified identities, ... matched stat rows`
   Am Ende: `Completed mode=RECONCILE processed=... verified=... linked rows=...`.
7. Auf der eigenen Vercel-Domain `/api/football-stats/status` öffnen. Prüfen:
   - `verifiedLinks` enthält jetzt, **sofern eindeutig belegbare Zuordnungen existieren**, einen Eintrag `espn` mit `count > 0`.
   - `sourceStats[].linked` kann größer als 0 sein.
   - `jobs` zeigt `v45161:reconcile`.
   - `officialScores.rows` und `sourceStats.rows` bleiben erhalten.
8. Ein betroffenes Fußball-Spielerprofil neu öffnen und `REAL STATS · SORARE SCORING` aufklappen.

## Automatik und Wiederaufnahme

Ein neuer täglicher Vercel-Cron `/api/cron/v4515?job=reconcile` läuft laut Schedule um **16:00 UTC**, nach den bestehenden Sorare-Score-Jobs. Er verarbeitet **40 offizielle Scores je Lauf**. Das bisherige ESPN-GitHub-Importskript ruft den Archivabgleich nach erfolgreichem Import ebenfalls auf. Der GitHub-Modus `reconcile_import` verarbeitet das gesamte Archiv in mehreren Seiten und kann bei Fehlern erneut gestartet werden. Der Offset ist in der **bestehenden Neon-Tabelle** `football_stats_v4515_import_cursor` gespeichert.

## Hinweise

- Die 58 SQL-Treffer sind **Kandidaten**, nicht automatisch 58 bestätigte Spieleridentitäten. Ein Spieler mit zehn Partien wird nur einmal als Identität verknüpft, aber mehrere Statistikzeilen können dadurch zum Profil zugeordnet werden.
- Es werden keine Sorare-Scores aus ESPN nachberechnet. Sorare-FINAL-Scores bleiben offiziell und eigenständig.
- Die neuen Regeln ändern **keine PP-/Q80-Prognosen**, NBA, Optimizer, Kartenboni, bestehende Learning-Werte oder vorhandene ESPN/SoccerData-Statistiken.
- SoccerData-xG/xA bleibt ein separater Datenimport und wird durch den Abgleich nicht erfunden oder automatisch heruntergeladen.
- Automatisierte externe Datenabrufe erfolgen weiterhin nur mit zulässigem Datenzugang.
- Der lokale TypeScript-Test und die Fachtests sind grün; ein echter Vercel-Produktionsbuild und produktiver Neon-Abgleich müssen nach dem Deployment noch bestätigt werden.
