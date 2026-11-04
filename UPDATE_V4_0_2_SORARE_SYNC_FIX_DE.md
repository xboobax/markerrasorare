# MarkErras Sorare Dream V4.0.2 – Sorare Collection Sync Fix

Die V4.0.2 korrigiert einen UI-/Synchronisierungsfehler der V4.0.1. Der Sorare-Login und ein **abgeschlossener, verifizierter Kartensync** sind getrennte Zustände.

## Behobene Probleme

1. **Tabwechsel:** V4.0.1 entwertete die lokale Collection bei jedem neuen Seitenaufruf und startete den vollständigen Abruf erneut. V4.0.2 merkt sich einen in dieser Browser-Sitzung erfolgreich abgeschlossenen vollständigen Sync für **15 Minuten** – strikt getrennt nach authentifiziertem Sorare-Slug.
2. **Laufender Sync:** Die neue Navigation zu `/builder/nba`, `/builder/football`, `/collection` oder `/daily-missions` startet keine zweite identische Paginierung. Ein laufender Abruf wird über das Seitenwechseln hinweg gemeinsam verwendet. Ein aktives Trennen des Kontos bricht den Abruf ab.
3. **Falscher Link:** Im Builder führte `#meine-karten` zu einem ausgeblendeten Bereich. Jetzt öffnet der Link `/collection?sport=nba#meine-karten` beziehungsweise `/collection?sport=football#meine-karten`.
4. **Echte Fehlermeldung:** Auth-Fehler, API-Fehler, Sorare-GraphQL-Fehler und unvollständige Paginierung werden sichtbar angezeigt. Bei HTTP 429 respektieren die Requests `Retry-After` (wenn geliefert). Nur vorübergehende Fehler werden automatisch erneut versucht.
5. **Große Sammlung:** Das Paginierungslimit beträgt 240 × 50 Karten. Die alte Sammlung wird bei einem abgebrochenen oder fehlgeschlagenen Sync nicht überschrieben.
6. **Sicherheit:** Eine nur im Browser gespeicherte Sammlung wird nach einem echten Neustart weiterhin nicht ohne Authentifizierung/erneuten Sync als aktuell verifiziert behandelt. Alte Fußball-Sets bleiben ausgeschlossen; das aktuelle Football-Set wird anhand der Sorare-Setkennung geprüft, nicht nach Saisonjahr. NBA bleibt davon unabhängig. Manuelle Besitz-Häkchen ersetzen keine Sorare-Verifikation.

## Update in GitHub und Vercel

- Die komplette neue ZIP entpacken und die **Dateien im Projekt-Root** in dein Repository übernehmen. Dies ist eine Weiterentwicklung von V4.0.1; bestehende `.env`-Werte und Vercel-Secrets nicht ersetzen oder veröffentlichen.
- Ein Deployment aus dem neuen Commit erstellen.
- Auf der fertigen Domain `/collection?sport=nba#meine-karten` öffnen und den angezeigten Sorare-Benutzer prüfen. Den automatischen Sync abschließen lassen; bei Bedarf **Jetzt synchronisieren** anklicken.
- Danach zur NBA-/Football-Builder-Seite wechseln, „Nur meine Karten“ aktivieren und kontrollieren, dass die Warnung bei bestätigtem Sync verschwindet.
- Falls stattdessen **Sync-Fehler:** angezeigt wird, die genaue Meldung und den HTTP-Status der Browser-Netzwerkabfrage `/api/collection` weitergeben – **niemals OAuth-Cookies, Tokens oder Passwörter**.

## Tests & Grenzen

Die bestehende Regressionstestsuite sowie der neue Test `tests/v402-collection-sync.test.js` sind erfolgreich. `npm run check:domain` und `npm run check:syntax` laufen ebenfalls. **Ein vollständiger Next.js-/Vercel-Produktionsbuild und der Abruf mit deinem Sorare-Konto wurden in der lokalen Testumgebung nicht ausgeführt.** Daher ist V4.0.2 zunächst ein Fix zur Vercel-Preview.
