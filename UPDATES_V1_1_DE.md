# Markerras Sorare Helper – Änderungen V1.1

1. **Programmname** in Header, Footer, Browser-Tab, Paketname und Konfiguration geändert.
2. **Fußball-Whitelist:** Bundesliga, LaLiga, Ligue 1 und Premier League (in dieser Reihenfolge). Andere Liga-Daten werden auf Serverebene ausgefiltert. Unterstützte Varianten der Ligabezeichnung werden normalisiert.
3. **Liga-Auswahl:** Schaltfläche „Alle 4 Ligen“ lädt ausschließlich Spieler dieser vier Ligen. Manipulierte/veraltete Liga-Links fallen auf Bundesliga zurück; Teamfilter wird anschließend geprüft.
4. **NBA bleibt erhalten**, einschließlich 16-Sterne-Optimizer.
5. **Eigene Kartenmarkierungen:** bisheriger localStorage-Schlüssel wird aus Kompatibilitätsgründen einmalig ausgelesen und unter dem neuen Programmnamen weiter gespeichert.
6. **Tests:** `npm run test:arcade` prüft auch die Fußball-Liga-Whitelist.

Keine Änderungen am Sorare-API-Key oder an der Vercel-Projekt-URL. Für echten Live-Betrieb den Build und die vier Liga-Datensätze mit gültigem API-Key im Vercel-Preview prüfen.
