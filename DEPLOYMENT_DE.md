# DiviSorare 0.2 – GitHub / Vercel Deployment

## Was du bekommst
Ein vollständiges Projekt auf Grundlage deiner hochgeladenen ZIP-Datei. Die Sorare-Datenabfragen aus `lib/sorare.ts` wurden übernommen; sie müssen mit deinem API-Key geprüft werden.

## Empfohlene Schritte

1. Erstelle in GitHub im Repository `xboobax/divisorare` einen neuen Branch, z. B. `feature/arcade-16-stars`. Verändere den produktiven Hauptbranch zunächst nicht.
2. Entpacke `divisorare-updated.zip`, kopiere den Inhalt des enthaltenen Ordners `divisorare-main` in deinen Repository-Arbeitsordner. Die Dateien `app/page.tsx`, `app/globals.css`, `app/layout.tsx`, `config/divination.ts`, `package.json` und `README.md` werden ersetzt; `lib/arcade.ts`, `app/components/arcade-dashboard.tsx` und `tests/arcade.test.js` kommen neu hinzu.
3. Entferne die nicht mehr verwendeten Root-Dubletten `page (1).tsx`, `model.ts`, `sorare.ts`, `divination.ts`, `layout.tsx`, `globals.css`, `demo.ts`, `download`, falls sie dort noch existieren. Die kanonischen Versionen liegen unter `app/`, `lib/` und `config/`.
4. Öffne ein Terminal im Projektordner:

   ```sh
   npm install
   npm run test:arcade
   npm run build
   npm run dev
   ```

5. Stelle sicher, dass `SORARE_API_KEY` in Vercel **Project Settings → Environment Variables** vorhanden ist. Den Schlüssel nie in GitHub committen und nicht mit `NEXT_PUBLIC_` exponieren.
6. Prüfe in der Preview-Deployment-URL sowohl Football als auch NBA, den Wechsel von Liga/Team, manuelle NBA-Sterne, 16-Sterne-Grenze, Kartenboni, eigene Karten und die Spieler-Suche. Kontrolliere Browser-Konsole und Vercel Function Logs auf API-Fehler.
7. Merge erst nach erfolgreichem Test in `main`.

## Test-Szenarien
- NBA: 5 Karten mit Sternen `5 + 4 + 3 + 2 + 2 = 16` sind zulässig; mit `5 + 4 + 3 + 3 + 2 = 17` unzulässig.
- NBA: Ein Spieler ohne zugewiesene Sterne darf nicht ins automatische Lineup.
- Football: GK/DEF/MID/FWD/FLEX, nur ein Torwart, keine doppelten Spieler.
- Filter "Nur meine Karten": Spieler, die nicht markiert wurden, dürfen nicht ausgewählt werden.
- Spieler mit `hasGame === false` oder ohne positive Prognose werden nicht automatisch vorgeschlagen.
- Football-Ziele 180/360 sind vorerst nur Beispielwerte aus deinen Screenshots, nicht als allgemeingültige Arcade-Regel hinterlegt.

## Offene Integrationen
Die persönliche Sorare-Kartensammlung und tatsächliche tagesaktuelle NBA-Star-Ratings müssen als separater API-/Import-Schritt integriert werden. Ohne diesen Schritt werden Sternwerte und Kartenboni manuell erfasst.
