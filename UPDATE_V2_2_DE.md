# Markerras Sorare Helper V2.2 – Arcade Lineup Intelligence

## Was bringt das Update?

Der bisherige automatische NBA-/Fußball-Lineup-Optimizer wird um ein eigenes **Arcade Intelligence Studio** ergänzt:

1. **Safety First** – eine regelkonforme Variante mit Fokus auf einen höheren prognostizierten Floor.
2. **Best Projection** – eine Alternative mit Fokus auf den erwarteten Gesamtscore.
3. **High Ceiling** – eine offensive Alternative mit Fokus auf den prognostizierten Ceiling-Score.
4. **Arcade Target** – nach Eingabe eines Score-Ziels eine weitere Variante, die unter den zuvor berechneten Kandidaten die höchste *geschätzte* Zielerreichungschance hat.

Jede angezeigte Variante enthält fünf Spieler, erwarteten Score, Floor, Ceiling, einen heuristischen Risikoindex, die Spieler mit erhöhtem Einsatzrisiko und – sofern ein Ziel angegeben wurde – eine geschätzte Zielchance. Es werden **unterschiedliche** fünf-Spieler-Kombinationen angezeigt; bei zu wenigen gültigen Alternativen werden nicht künstlich vier Varianten behauptet.

Mit **„Diese Aufstellung ansehen“** übernimmt der Helper diese fünf Spieler unmittelbar in die *automatische Vorschau*. Der manuelle Builder und die bisherigen gespeicherten Lineups werden **nicht überschrieben**. Die Standard-Optimierung bleibt weiterhin erreichbar.

### Wo finde ich das Studio?

Im **Lineup Builder → „✦ Automatisch optimieren“**. Das Studio erscheint im oberen Teil der automatischen Optimierung. Dort das **Arcade-Punkteziel** eingeben, die Varianten vergleichen und die gewünschte direkt auswählen. Die klassische Optimierung mit Fixieren/Sperren und den bisherigen Aufstellungen bleibt erhalten.

## Sicherheits- und Datenhinweise

- **Unverändert:** `lib/sorare.ts`, die offiziellen NBA-Sterne-Module `lib/nba-stars-feed.ts`, `lib/nba-stars.ts`, bestehende Forecast-Modelle und die beiden grundlegenden Arcade-Regelprüfer.
- NBA: genau **5 verschiedene Spieler** und **maximal 16 Sterne** in 0,5er-Schritten; Sterne aus V2.1.1 von Sorare oder gekennzeichnetem manuellen Fallback.
- Fußball: **TW, VER, MF, FWD und ein zusätzlicher Feldspieler**. Fixierte, ausgeschlossene und gegebenenfalls nur eigene Karten werden berücksichtigt.
- Chancen und Risikoindex sind **heuristische Modellwerte**, keine trainierten, kalibrierten Gewinnchancen und keine offiziell von Sorare stammenden Wahrscheinlichkeiten. Es werden keine Verletzungen oder Spieltage erfunden.
- Die Zieloptimierung sucht unter einer **begrenzten Auswahl** an durch die drei Ausgangsstrategien generierten Kandidaten. Eine global optimale Lösung über sämtliche möglichen Aufstellungen ist nicht garantiert.
- Aktuelle NBA-Sterne (`gameplayTierStars`) können von den für eine konkrete Sorare-Gameweek bereits festgeschriebenen Sternkosten abweichen. Diese vor dem Einreichen auf Sorare prüfen.
- Die Anwendung **sendet keine Aufstellung an Sorare** und verwaltet keinen automatischen Kartenbesitz.

## Update mit GitHub Desktop – nur Update-ZIP (empfohlen)

1. Stelle sicher, dass die funktionierende **V2.1.1** in GitHub Desktop vorliegt, und sichere ungespeicherte Änderungen.
2. Lade `markerras-v2.2-nur-update.zip` herunter und **entpacke** die Datei.
3. Öffne GitHub Desktop mit `xboobax/markerrasorare`.
4. Wähle **Branch → New Branch** und gib `arcade-intelligence-v2-2` ein.
5. Wähle **Repository → Show in Explorer**.
6. Öffne im entpackten ZIP `markerrasorare-main` und kopiere **dessen Inhalt** in das bestehende Projektverzeichnis. Überschreibe gleichnamige Dateien; **den `.git`-Ordner nicht entfernen**. Die vorhandene `.env.local`/API-Keys keinesfalls veröffentlichen.
7. Prüfe in GitHub Desktop die Änderungen und erstelle einen Commit: `Add Arcade Intelligence Studio V2.2`.
8. Klicke auf **Publish branch**, öffne das neue **Vercel-Preview** und prüfe **NBA und Fußball**.
9. Wenn die Preview-Prüfungen erfolgreich sind, den Branch in `main` übernehmen.

### Was im Vercel-Preview testen?

- NBA: offizielle Sterne laden weiterhin; wähle **Automatisch optimieren**, setze z. B. ein eigenes Punkteziel, vergleiche Varianten. Jede Vorschau hat 5 Spieler und höchstens 16 Sterne.
- Fußball: TW/VER/MF/FWD/EX passend besetzt; keine doppelten Spieler.
- Klicke auf zwei unterschiedliche Intelligence-Varianten. Die große Aufstellung darunter muss sich entsprechend ändern, ohne deine manuell gespeicherten Lineups zu überschreiben.
- Teste **„Nur meine Karten“**, einen **fixierten** und einen **ausgeschlossenen** Spieler.
- Kontrolliere weiter Spielerbilder, L5/L10, Hidden Gems und den Sterne-Sync.
- Wenn zu wenige geeignete Spieler vorhanden sind, wird eine erklärende Meldung statt einer erfundenen Aufstellung angezeigt.

## Technische Tests

- `npm run test:arcade`: 22 automatisierte Testgruppen inklusive der neuen Varianten-, Ziel-, Risiko- und Budgetprüfungen.
- TypeScript-/TSX-Prüfung und CSS-Syntaxprüfung ausgeführt.
- `lib/sorare.ts` und `lib/nba-stars-feed.ts` per SHA-256 mit V2.1.1 abgeglichen: **identisch**.
- Große NBA-Spielerpools mit simulierten Daten (80, 250, 500 Spieler) auf Laufzeit geprüft.

**Grenze:** Ein vollständiger Next.js-Produktionsbuild und echte Sorare-Live-Antworten waren in der lokalen Testumgebung nicht verfügbar. Nutze daher zuerst das Vercel-Preview und behalte den bisherigen stabilen Branch für einen möglichen Rollback.
