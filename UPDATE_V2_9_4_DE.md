# Markerras Sorare Helper V2.9.4 – Kartenbonus-Reparatur

**Ausgangsbasis:** Deine funktionierende V2.9.3. Dieses Update ändert die Sorare-Kartenbonus-Auswertung, nicht den OAuth-Login, die Kartenbesitz-Daten oder den Fußball-Captain.

## Warum bei jeder Karte 0,0 % stand

V2.9.3 verwendete `bonuses { ... }` ohne Angabe eines Sorare-Wettbewerbs und interpretierte die leere Liste `[]` als überprüfte 0 %. Diese Bonusliste ist wettbewerbsabhängig und kann ohne Wettbewerb leer sein.

## Was sich ändert

- Der bereits funktionierende `cardsWhere(ownedByMe: true)`-Sync fragt nun zusätzlich `powerBreakdown` für **jedes NBA- und Fußball-Kartenexemplar** ab.
- Die separat ausgewiesenen, nicht teamabhängigen Bonuskomponenten werden übernommen: XP, Saison, Collection, Seltenheit, Sonderedition, Treue und sonstige Kartenboni, soweit von Sorare gemeldet. Wettbewerbsabhängige Boni können weiter abweichen.
- Captain- und Lineup-Bonusbestandteile werden **nicht** als Kartenbonus eingerechnet. Fußball bekommt weiterhin die vom Nutzer gewünschte feste +50-%-Captain-Berechnung; NBA bleibt ohne Captain.
- Die leere Bonusliste allein bedeutet jetzt **„Bonus nicht verfügbar“**, nicht „Sorare +0,0 %“.
- Alte V2.9.3-Bonuswerte im Browser-Cache werden beim Laden ungültig gemacht, aber die Kartensammlung samt Besitzdaten bleibt erhalten. Nach dem nächsten Sync werden die tatsächlich gelieferten Werte übernommen.
- Falls die API weder über `powerBreakdown` noch über `bonuses` brauchbare Werte liefert, zeigt die App **keine erfundene Prozentzahl** an. Manuelle Boni bleiben als Fallback verfügbar.

## Installation mit GitHub Desktop

1. ZIP **„nur Update“** herunterladen und entpacken.
2. GitHub Desktop → Projekt `markerrasorare` → **Repository → Show in Explorer**.
3. Den **Inhalt** von `markerrasorare-main` aus dem ZIP in den vorhandenen Projektordner kopieren, gleiche Dateien ersetzen.
4. Commit `Fix Sorare Card Bonus V2.9.4`, **Push origin**. Am besten zuerst einen Test-Branch nutzen.
5. Nach erfolgreichem Vercel-Deployment **Meine Karten → Jetzt synchronisieren** anklicken.
6. Bei NBA und Fußball einzelne Karten öffnen: Es sollten die aktuellen verfügbaren Boni und bei Bedarf die Teilbeträge angezeigt werden. Bei fehlenden Daten erscheint ein klarer Hinweis statt 0,0 % als offiziell bestätigt.

**Kein neues Sorare-Login und keine neuen Vercel-Variablen nötig.** Ein persönlicher Live-Test mit deinen Karten ist von hier aus nicht möglich; echte Bonuswerte sind deshalb erst nach deinem Sync verifiziert. Die Sorare-Schema-Felder können über https://api.sorare.com/graphql/schema überprüft werden.
