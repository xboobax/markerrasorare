# Neon Builder Pro V3.7.1 – Fußball-Kartensync: aktuelles Set

## Behobener Fehler

Bisher synchronisierte `cardsWhere(ownedByMe: true)` alle historischen Sorare-Karten.
Der „Nur meine Karten“-Filter kontrollierte lediglich `sport: FOOTBALL`, nicht
das Set. Dadurch konnten abgelaufene Karten wie Hyperglitch in den Fußball-
Spielerpool und ihre Kartenboni in Prognosen gelangen.

## Neue Logik

- Sorare liefert pro Karte `cardSet { slug name }`.
- Sorare liefert das **aktuell aktive Fußball-Set** über
  `cardSet { currentSet(sport: FOOTBALL) { slug name } }`.
- Im Fußball-Builder, in „Sammlung“ und in „Daily Missions“ (mit „Nur meine
  Karten“) zählen ausschließlich Karten mit exakt übereinstimmender Set-ID.
- Pro-Karten ohne Set-ID, ältere Sets oder Karten mit unbekannter Set-ID gelten
  nicht als aktuelle Set-Karten. Saisonjahre werden absichtlich **nicht** als
  Ersatz für eine Set-ID verwendet.
- Kartenboni werden ausschließlich aus zugelassenen Karten übernommen.
  Veraltete, zuvor von Sorare übernommene Boni werden aus der aktiven Ansicht
  entfernt; die lokalen Originaldaten bleiben erhalten.
- Gespeicherte Bestände werden bei Start als unverifiziert behandelt, bis
  Sorare das aktive Set erneut bestätigt hat.
- Bei einem Setwechsel in der Mitte einer paginierten Synchronisierung wird
  die Synchronisierung sicher abgebrochen. Ein Fehler überschreibt nicht den
  zuletzt gespeicherten Bestand.
- Die NBA-Sammlung und der NBA-Stars-Optimizer bleiben unverändert.

## Inbetriebnahme

1. Die ZIP komplett in das GitHub-/Vercel-Projekt übernehmen und deployen.
2. Sorare anmelden wie bisher. Keine neuen Keys und keine Zusatzdatenbank nötig.
3. Den Tab **Sammlung** öffnen und **Jetzt synchronisieren** wählen.
4. Auf der Fußball-Seite die Anzeige **Aktuelles Fußball-Set: Divination**
   (beziehungsweise den von Sorare aktuell gemeldeten Setnamen) prüfen.
5. **Nur meine Karten** aktivieren und den Fußball-Spielerpool sowie den
   Daily Mission Picker testen.

**Hinweis:** Der Name des aktiven Sets wird aus Sorare abgefragt. Bei einem
künftigen Setwechsel arbeitet derselbe Filter automatisch mit der dann neuen
Set-ID. Eine Live-Abfrage mit dem persönlichen Sorare-Konto war in der
Bearbeitungsumgebung nicht möglich; sie wird nach dem Deployment bestätigt.
