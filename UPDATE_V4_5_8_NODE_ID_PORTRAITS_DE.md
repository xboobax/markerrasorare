# V4.5.8 – Sorare Game Node & echte Spielerporträts

## Warum V4.5.7 nicht funktionierte
- Sorare gibt globale `Game:...`-IDs aus. `football.game(id:)` konnte diese nicht auflösen.
- Der Bildabruf verwendete `pictureUrl(derivative: "avatar")`, das bei vielen Spielern null liefert.

## Umsetzung
- Globale Sorare-Spiel-IDs werden über `Query.node(id:)` und den Typ `Game` aufgelöst. Nur rohe IDs gehen in die Legacy-Fallback-Abfrage.
- Die Erkennung der Partie bleibt streng (Heim-/Auswärtsteam, Anstoßzeit, eindeutiger Match).
- Bilder: `avatarPictureUrl` vor `fullPictureUrl` vor `pictureUrl`, dann ESPN-Bildlink; ansonsten Platzhalter.
- Die Statuszeile zeigt getrennt zugeordnete Sorare-Scores und Sorare-Fotos.
- Keine Änderungen an NBA, Learning, Datenbank, Cron-Plan oder Secrets.

## Test nach Deployment
Football Live Match Center öffnen und den Sorare-Status prüfen. `matched` ist erforderlich; bei `unmatched` fehlen eindeutig zuordenbare Spiele. Einzelne Spieler können weiterhin ohne Foto bleiben, wenn beide Quellen kein Bild anbieten.
