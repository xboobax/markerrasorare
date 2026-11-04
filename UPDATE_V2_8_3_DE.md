# Markerras Sorare Helper V2.8.3 – Nur meine Karten (NBA & Fußball)

**Basis:** Deine funktionierende V2.8.2 mit Sorare-Login und synchronisierter Sammlung.

## Neue Bedienung

Im Bereich **Arcade Lineup Workspace** gibt es direkt oberhalb der zwei Builder-Modi einen gut sichtbaren **„Nur meine NBA-Karten“**- bzw. **„Nur meine Fußball-Karten“**-Schalter. Er wechselt automatisch mit der ausgewählten Sportart.

- **AUS**: Alle aktuell geladenen Spieler können angezeigt und für neue Aufstellungen verwendet werden.
- **AN**: Die rechte Spielertabelle, Smart Auto-Fill, automatische Optimierung, Quick Swap und Übernahmevorschläge beschränken sich auf Spieler aus deiner **vollständig synchronisierten Sorare-Sammlung**.
- Die Einstellung wird **getrennt für NBA und Fußball** auf diesem Gerät gespeichert. Der Wechsel zwischen manuellem und automatischem Builder ändert die Einstellung nicht.
- Eine zusätzliche Auswahl „Watchlist / Gute Datenlage“ kann weiterhin innerhalb der erlaubten Spielermenge filtern.
- Die Anzeige nennt die Anzahl der eigenen Spieler im **aktuell gewählten Datenbereich**. Beispiel: Wenn du nur Bundesliga ausgewählt hast, sind eigene Karten aus anderen Fußballligen dort nicht sichtbar.
- Ist deine Sammlung noch nicht vollständig geladen oder ist die Sorare-Verbindung getrennt, gibt es im Modus AN **keinen Ersatz über manuell gesetzte Besitz-Häkchen**. Warte auf den Sync bzw. folge dem Link **„Sammlung / Sync“**.
- Bereits vorhandene, gespeicherte Aufstellungen bleiben unangetastet. Bei eingeschaltetem Filter werden eventuell vorhandene Fremdspieler markiert; sie müssen bei Bedarf manuell entfernt oder ersetzt werden.
- Bei einer vollständigen Sorare-Synchronisierung kann die Besitzmarkierung in der Spielerliste nicht versehentlich manuell überschrieben werden.

## Installation – GitHub Desktop

1. **Sichere deinen letzten funktionierenden V2.8.2-Stand** (Commit/Branch).
2. Lade `markerras-v2.8.3-nur-update.zip` herunter und entpacke es.
3. Öffne GitHub Desktop für `xboobax/markerrasorare` und erstelle am besten einen Branch namens `collection-filter-v283` auf Basis des funktionierenden Standes.
4. Wähle **Repository → Show in Explorer**.
5. Kopiere den **Inhalt** des ZIP-Ordners `markerrasorare-main` in den bestehenden Repository-Ordner; gleiche Dateien ersetzen. Den vorhandenen `.git`-Ordner behalten.
6. Commit: `Add per-sport My Cards toggle V2.8.3`, dann **Publish branch**.
7. Teste im Vercel-Preview: NBA-Schalter AN/AUS, Fußball-Schalter AN/AUS, automatischer Builder und Smart Auto-Fill.
8. Nach erfolgreichem Test in `main` übernehmen oder auf dem Hauptbranch `Push origin` ausführen.

**Keine neuen Vercel-Variablen**, keine neue Sorare-Anmeldung und kein erneuter OAuth-Antrag nötig.

## Was absichtlich unverändert bleibt

- `lib/sorare.ts` (Sorare-Abfragen/Score-Adapter)
- `lib/nba-stars-feed.ts` und `lib/nba-stars.ts` (offizielle NBA-Sterne)
- OAuth-Start, Callback, Cookies und Token-Sitzung
- Karten-Sync-Endpunkt, Prognosemodell, Verletzungs- und Spielplandaten
- NBA-Sternelimit, Fußballpositionen und gespeicherte Teams

## Prüfstand

32 automatische Node-Testskripte inklusive neuem separatem Besitzfilter-Test. TSX-Dateien wurden syntaktisch geprüft. Ein vollständiger Next.js-Produktionsbuild wurde in dieser Umgebung nicht durchgeführt (npm-Abhängigkeiten sind nicht lokal verfügbar); deshalb das Vercel-Preview vor dem Merge testen.
