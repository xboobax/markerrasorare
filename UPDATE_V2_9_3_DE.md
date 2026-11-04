# Markerras Sorare Helper V2.9.3 – Kartenbonus automatisch von Sorare

Dieses Update baut auf der funktionierenden **V2.9.2 Obsidian Black** auf und ergänzt die vorhandene Sorare-OAuth-Kartensynchronisierung um echte, kartenbezogene Bonusdaten.

## Neu

- Sorare GraphQL `cardsWhere(ownedByMe: true)` lädt jetzt für jedes NBA- und Fußball-Kartenexemplar zusätzlich `grade` und `bonuses { key title bonusBasisPoints }`.
- Der Kartenbonus wird in **Prozent** gespeichert. **100 Basispunkte = 1 %**. Er umfasst die von der Sorare-API zurückgegebenen aktuell verfügbaren Kartenboni. Ein leerer Bonusblock bedeutet 0 %, fehlende Bonusdaten werden dagegen ausdrücklich als unbekannt behandelt.
- „Meine Karten synchronisieren“ zeigt an, wie viele Karten einen abgerufenen Bonus besitzen; in der Kartenliste steht der Prozentwert und Kartenlevel.
- Im manuellen Neon Builder gilt der Bonus **der ausgewählten Karten-ID**. Mehrere Karten desselben Spielers können also unterschiedliche Boni haben. Ohne manuelle Auswahl wird zunächst die Karte mit dem höchsten verifizierten Bonus vorgeschlagen.
- Der automatische Lineup Builder verwendet die beste verifizierte Karte je Spieler als Basis für die Bonusprognose. Wenn man eine andere Karte bevorzugt, ist im manuellen Builder die Kartenwahl möglich.
- NBA und Fußball berücksichtigen diese Kartenboni in Prognose, Floor und Ceiling. **Nur Fußball:** der bereits vorhandene Captain-Bonus von +50 % wird unabhängig davon addiert. **NBA hat keinen Kapitän**; das 16-Sterne-Limit bleibt erhalten.
- Fehlende API-Daten werden weder als bestätigter Nullbonus dargestellt noch durch geschätzte Seltenheits-/XP-Boni ersetzt. Der manuelle Fallback bleibt möglich.
- Wettbewerbsabhängige Boni können von der gewählten Sorare-Competition abhängen. Die Daten ohne ausgewählte Competition bilden einen sinnvollen aktuellen Ausgangswert, aber keine Garantie für den finalen Score jeder Competition.

## Installation

1. Erstelle im GitHub-Repository optional einen Test-Branch auf Grundlage deiner funktionierenden V2.9.2.
2. Entpacke das kleine Update-ZIP; kopiere **den Inhalt** des Ordners `markerrasorare-main` in den Ordner des bestehenden GitHub-Desktop-Repositories (gleichnamige Dateien ersetzen).
3. Commit beispielsweise `V2.9.3 automatische Sorare Kartenboni` und klicke auf **Publish branch** bzw. **Push origin**.
4. Sobald der Vercel-Preview-Build durchgelaufen ist, öffne deine App. **Du musst den Sorare-Login nicht neu konfigurieren oder Secrets ändern.**
5. Öffne „Meine Karten“ und klicke auf **Jetzt synchronisieren**. Die Seite synchronisiert bei aktiver Verbindung ohnehin beim Laden und regelmäßig, wenn sie offen ist.
6. Kontrolliere NBA und Fußball jeweils in der Kartenliste, im Spielerpool und im manuellen Team Builder. Pro Spieler kannst du bei Mehrfachbesitz die Kartenexemplare wechseln und die jeweiligen Boni vergleichen.

## Prüfung

- `npm run test:arcade` inklusive neuer V2.9.3-Bonustests bestanden.
- React-/TSX-Dateien auf Syntaxfehler geprüft.
- Kein Live-Test gegen das private Sorare-Konto möglich. Falls der Server eine Sorare-GraphQL-Fehlermeldung zurückgibt, lässt der Sync den bisherigen erfolgreichen Sammlungsstand unberührt. Keine Zugangsdaten im Chat teilen.
- Einen vollständigen Next.js-Produktionsbuild sollte Vercel beim Deployment durchführen.
