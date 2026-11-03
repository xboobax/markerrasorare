# Markerras Sorare Helper V1.5 – Eigener manueller Lineup Builder

## Neu

Im Abschnitt **03 / LINEUP STUDIO** gibt es zwei klar getrennte Ansichten:

- **✋ Selbst aufstellen:** Du entscheidest für alle fünf Plätze selbst, wer spielt. Eine Spieler-Suche mit Namen/Verein, ein Filter „Nur meine markierten Karten“, Bilder und anklickbare Spielerprofile sind integriert. Spieler lassen sich hinzufügen, austauschen und entfernen.
- **✦ Automatisch optimieren:** Der bisherige Algorithmus mit mehreren Lineup-Vorschlägen bleibt erhalten.

### Manuell: Fußball

- Slots: Torwart (TW), Verteidiger (VER), Mittelfeld (MF), Stürmer (FWD), zusätzlicher Feldspieler (EX).
- EX darf Verteidiger, Mittelfeldspieler oder Stürmer sein, aber kein weiterer Torwart.
- Doppelte Spieler und falsch besetzte Slots werden als ungültig gekennzeichnet.
- Die verfügbare Auswahl bezieht sich auf den geladenen Liga-/Team-Bereich. Für einen Mix über die vier erlaubten Ligen links die Auswahl **Alle 4 Ligen** verwenden (oder `/?sport=football&league=__all`). Andere Fußballligen werden weiterhin nicht geladen.

### Manuell: NBA

- Fünf frei wählbare Spieler.
- Sterne pro Spieler manuell eintragen; gültiger Bereich 1–5 in 0,5er-Schritten.
- **Maximal 16,0 Sterne insgesamt.** Der Builder zeigt den Verbrauch und markiert ungültige Aufstellungen.
- Kartenbonus und die Markierung „Meine Karte“ werden aus der bestehenden Kartenverwaltung übernommen.

### Statistiken und Speichern

- Sofortige Gesamtscore-Prognose mit Kartenboni und Einsatzwahrscheinlichkeit, heuristischer Floor-/Ceiling-Spanne und optionaler Zielchance bei vollständigen, gültigen Lineups und vorhandenen Daten.
- **Drei Speicherplätze** („Aufstellung 1, 2, 3“), mit „Speichern“ und „Laden“. Die aktuelle Auswahl wird zusätzlich automatisch gespeichert.
- Gespeichert wird ausschließlich im **lokalen Browser**. Keine Synchronisierung über Geräte hinweg und keine Übertragung an Sorare.
- Über „Prognosen für diese Aufstellung merken“ lassen sich die fünf Vorhersagen dem bisherigen Prognose-Tracking hinzufügen.

## Wo geändert?

- `app/components/manual-lineup.tsx` – neuer manueller Builder
- `lib/manual-lineup.ts` – unabhängige Regelprüfung und Score-Berechnung
- `app/components/arcade-dashboard.tsx` – Umschalter zwischen manuell/automatisch
- `app/globals.css` – dunkle, responsive Oberfläche
- `tests/manual-lineup.test.js` – Tests für Fußballslots, Duplikate, NBA-Sterne, unvollständige Daten und fehlende Spieler
- Basierend auf den lokal vorhandenen Reparaturdateien von V1.4.1 mit gesondertem Score-Fallback. Live-Daten sind nicht neu konfiguriert worden.

## Vor dem Live-Deployment

1. In GitHub Desktop Repository `xboobax/markerrasorare` öffnen und einen **neuen Branch** `manual-builder-v1-5` erstellen.
2. ZIP entpacken. **Inhalt** des Ordners `markerrasorare-main` in den von GitHub Desktop geöffneten Repository-Ordner kopieren; vorhandene gleichnamige Dateien ersetzen. `.git` und deine lokalen `.env`-Dateien nicht löschen oder hochladen.
3. Commit Summary: `V1.5 Manueller Lineup Builder`; dann `Publish branch` / `Push origin`.
4. Das Vercel **Preview** öffnen und NBA, Fußball, Sorare-Scores, Spielerfotos, manuelle Aufstellung und Auto-Optimierung testen.
5. Erst danach Branch via Pull Request in `main` übernehmen.

## Grenzen

- Der Builder arbeitet nur mit **geladenen Spielern**, nicht mit einer garantiert vollständigen globalen Sorare-Datenbank.
- Er überprüft nur die in der Anwendung implementierten Slots und das NBA-Sternelimit. Individuelle Arcade-Sets, Editionsregeln, Kartensperren und die tatsächliche Sorare-Spielberechtigung werden nicht offiziell abgefragt.
- **Keine automatische Einreichung bei Sorare**. Der Nutzer trägt sein Lineup selbst bei Sorare ein.
- Sterne, Boni und Kartenbesitz sind manuelle Eingaben. Prognosen / Zielchancen sind heuristisch, nicht garantiert.
- `npm run test:arcade` und lokale TSX-Typ-/Syntaxprüfung wurden ausgeführt; ein echter Sorare-API-Lauf und vollständiger Next.js/Vercel-Build müssen im Preview geprüft werden.
