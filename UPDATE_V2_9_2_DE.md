# Markerras Sorare Helper V2.9.2 – Obsidian Black & Matchday Ready

Basis: funktionierende V2.9.1. **Nur die hier gelieferten Dateien in deinem bestehenden Projekt ersetzen.**

## Neu

- **Obsidian Black:** deutlich dunklere Flächen, weniger Farbverläufe, klare Trennlinien, ruhigere Spielernamen und Statistik-Chips. Nur der Builder wird umfassend umgestaltet; die globale Seitenhintergrundfarbe wird dunkel. Sorare, OAuth, Score- und API-Dateien bleiben unverändert.
- **Vereinfachte Navigation:** Spieltag, `⚡ Matchday Ready` und `✦ Smart Auto-Fill` sind oben direkt erreichbar. Team Battle, Team kopieren, Undo, Mehrfachspielzeitraum, Zusatzfilter und Optimierungsstrategie liegen unter **Weitere Optionen**. Der Verletzungsstatus ist einklappbar. Die Spielertabelle startet in der kompakten Ansicht, individuell gespeicherte Spalten bleiben erhalten.
- **Matchday Ready** für NBA und Fußball: Prüft den **heutigen deutschen Kalendertag**, lässt **nur verifiziert synchronisierte eigene Karten** zu und blendet Spieler mit bestätigter `OUT`-Meldung aus. Der Button benötigt eine vollständig synchronisierte Sorare-Sammlung, sonst erscheint ein Hinweis. Aktivierung setzt Suche, Position, Zusatzfilter, Verletzungsansicht und Mehrfachspielfilter zurück; sie ändert **niemals** vorhandene Aufstellungen oder Kartenbesitz. Der Filter wirkt auf Spielerpool, manuelles Hinzufügen, Quick Swap und den Smart Auto-Fill. Ein manuell geänderter Zeithorizont schaltet Matchday Ready aus.
- **NBA Value Finder:** „Alle“ oder jeweils das **obere Viertel** der im aktuellen Spielerpool verfügbaren Prognose/★-, Floor/★- oder Ceiling/★-Werte. Bei einem Gleichstand bleiben alle Kandidaten an der Grenze sichtbar. Nur verifizierbare gültige Sternwerte (1–5 in halben Schritten), vorhandene Prognosequellen und keine bestätigte OUT-Meldung. Kein Ersatzsternwert wird erfunden; die Kennzahl ist eine **Modellschätzung** und keine offizielle Sorare-Rangliste. Der Filter beschränkt zunächst den **sichtbaren Spielerpool**, nicht den Smart Auto-Fill. Die Sortierung und sichtbare Wert/★-Spalte passen sich automatisch an.
- **Fußball:** 50 % Captain-Bonus unverändert. **NBA:** kein Captain, 16-Sterne-Limit unverändert.

## Installation – GitHub Desktop

1. Sichere die funktionierende V2.9.1 (am einfachsten neuer Test-Branch `v2-9-2-obsidian-black`).
2. Kleine Update-ZIP herunterladen und **entpacken**.
3. GitHub Desktop öffnen → `markerrasorare` → `Repository` → `Show in Explorer`.
4. **Inhalt** des entpackten Ordners `markerrasorare-main` in den lokalen Projektordner kopieren, vorhandene Dateien bestätigen/ersetzen. Nicht den äußeren Ordner in einen zweiten Ordner verschachteln.
5. GitHub Desktop → Commit `Add Obsidian Black Matchday Ready NBA Value V2.9.2` → `Publish branch` oder `Push origin`.
6. Vercel Preview/Production Build abwarten und dann beide Sportarten testen.

## Smoke-Test

1. NBA aufrufen → Spieltag **Heute** → `⚡ Matchday Ready` einschalten. Prüfen, dass nur Spieler mit tatsächlichem NBA-Spiel heute (Europe/Berlin), mit verifizierten eigenen Sorare-Karten und ohne bestätigte OUT-Meldung angezeigt werden.
2. Den NBA Value Finder auf `Top 25 % · Ceiling/★` stellen. Prüfen, dass die Trefferzahl sinkt, Top-Kandidaten nach Ceiling/★ sortiert sind und die Wertspalte erscheint.
3. Zurück zu `Alle Spieler`, Matchday Ready deaktivieren. Danach `Weitere Optionen` und `Mehr Filter` öffnen und Änderungen testen.
4. Fußball auswählen. Matchday Ready testen und die Captain-Krone **+50 %** prüfen; bei NBA darf es keine Captain-Funktion geben.
5. Bereits gespeicherte Teams, Login, Synchronisierung und Stars prüfen. Ohne erfolgreich synchronisierte Sorare-Sammlung muss Matchday Ready einen erklärenden Hinweis statt unbestätigter Karten zeigen.

## Technische Prüfung

- `npm run test:arcade`: 35 Testskripte (inklusive V2.9.2) auf den lokalen Dateien erfolgreich.
- TypeScript/TSX-Syntaxprüfung: erfolgreich.
- **Kein vollständiger Next.js-Produktionsbuild durchgeführt**, da die benötigten Projekt-Dependencies hier nicht installiert sind. Deshalb zuerst Vercel Preview prüfen.
