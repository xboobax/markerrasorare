# MarkErras Sorare Dream — V4.0 Blueprint

**Status:** Architektur- und Produktkonzept, noch keine Implementierung  
**Basis:** Neon Builder Pro V3.9.2 (separat sichern, produktive Version nicht überschreiben)  
**Design:** Schwarz / Gold, ruhig, kompakt, responsive  
**Kostenrahmen:** Vorhandene Sorare-Schnittstellen und kostenlose Daten; kein verpflichtendes Upstash und keine kostenpflichtigen Statistikdienste

## 1. Zielbild

Eine leistungsfähige, eigenständige Sorare-Analyse- und Lineup-Plattform für Fußball und NBA. Die Screenshots von SoProb sind Referenzen für Informationsarchitektur und Arbeitsabläufe, **keine Vorlage zum Kopieren von Marken, Quellcode, Bildrechten oder proprietären Prognosemodellen**. Das Produkt bekommt eigene UI-Komponenten, eigene Kennzahlen und die Marke **MarkErras Sorare Dream**.

Leitlinien: (1) Fünf bis acht zentrale Arbeitsbereiche, nicht eine endlose Seite. (2) Ein sichtbarer primärer Arbeitsablauf pro Seite; sekundäre Einstellungen in Drawer/Dialog. (3) Datenherkunft für jede Prognose nachvollziehbar. (4) Kein unnötiger Rechenaufwand außerhalb des aktiven Bereichs. (5) Produktionsrelease nur nach bestandenen Tests und Performance-Grenzwerten.

## 2. Designsystem

| Element | Vorschlag |
|---|---|
| Haupt-Hintergrund | `#08090A` |
| Oberflächen | `#111315`, `#191C1F` |
| Trennlinien | `#2A2D30` |
| Primäres Gold | `#D8B65B` |
| Gold hell / Hover | `#F0D487` |
| Text | `#F4F4F3`, sekundär `#A6A8AA` |
| Feedback | Grün/Rot/Amber nur für echte Statusunterschiede; Gold für Auswahl/Aktionen |
| Radien | 8–12 px, keine großen Glow-Effekte |
| Typografie | Sehr gut lesbare, kompakte Schrift; tabellarische Zahlen monospaced/tabular |

Desktop: schmale einklappbare Sidebar, globale obere Leiste für Sportart, Gameweek und Synchronisierungsstatus. Builder-Ansicht: links Teams (ca. 36–40 %), rechts Spieler (ca. 60–64 %), getrennt scrollbar. Mobil: einspaltig, Lineup als Drawer, Filter als Bottom Sheet.

## 3. Navigation und Seiten

1. **Übersicht:** Heutige Spiele, eigener Kartenbestand, zuletzt gespeicherte Teams, Schnellaktionen und Datenfrische.
2. **Football Builder:** Mehrere Lineups links, kompakte Spielertabelle rechts, positionsrichtige Slots, Captain, Bonus, Prognosen, manuelles Hinzufügen und Auto-Build.
3. **NBA Builder:** Mehrere 5er-Teams, Sternebudget, vier Optimierungsstrategien, Lineup Diversity, Spieltermine, Value und Risiko.
4. **Daily Missions:** Fußball „entscheidende Aktion“ und NBA „L10 + 7, mindestens 20 Punkte“, jeweils eigene Rankinglogik, Filter, Safety und One-Click-Pick.
5. **Match Center / Kalender:** Datumsleiste und Gameweek, Spielpaarungen, reale/erwartete Aufstellungen eindeutig gekennzeichnet, Scores und relevante eigene Spieler. NBA-Halbfeld/Ganzfeld als optionale Visualisierung, nie als Datenbeweis.
6. **Player Database:** Sortierbare, virtualisierte Spielertabelle; Filter nach Position, Team, Set, Spielstatus, Zeitfenster, Projektion, Risiko, Sternen, Kartenbesitz; Spalten-Presets.
7. **Sammlung:** OAuth/Collection-Sync, bestätigte Karten, aktuelles Football-Set (`currentSet`/`cardSet`), NBA-Karten, Boni, Dubletten, letzter Sync und Datenfehler.
8. **Analyse & Guides:** Prognosevergleich V1.7/V1.8/V2.0, lokale Historie soweit vorhanden, Qualitätskennzahlen, Erklärungen zu Spalten/Projektionen und geführte Workflows. Unterseiten/Tabs statt überladene Startseite.

Globale Schnellaktion (`Strg+K`): Spieler suchen, zum Builder wechseln, Karten synchronisieren, Daily Mission, Aufstellung prüfen. Nicht als weiteres großes Panel.

## 4. Bildschirm-Anforderungen (aus den Screenshots abgeleitet)

### Builder — Fußball und NBA
- Haupttoolbar: Zeitfenster, Spielerpool („alle“/„meine gültigen Karten“), aktives Set, Anzahl Teams, `Auto Build`, Einstellungen, Sync.
- Links: Teams mit ein-/ausklappbaren Slots und Meta-Zeile (Prognose, Ziel, Sterne bei NBA), Drag/Click zum Austauschen, Team Duplizieren/Löschen, fixierte Karten.
- Rechts: Tabelle mit Spielerfoto, Name, Team/Gegner, Spielzeit, Startwahrscheinlichkeit (wenn modelliert), Form, Kartenbonus, PP/PP Q80/Raw, Value, Risiko, NBA L10 und Sternen; Spalten individuell wählbar.
- `+` fügt in ausgewählten Slot ein; Klick auf Name/Foto öffnet **verifizierten Sorare-Profillink** im neuen Tab; eigenes Info-Icon öffnet interne Detailansicht. Bei fehlendem echten Profil-Link kein erfundener Slug.
- Auto-Builder-Einstellungen in eigenem Dialog: Projektion, Spieleranzahl pro Team, Gegnerkonflikte, Spieler-/Kartendiversität, Mindestprognose, Mannschaftslimits, Stacks, Classic-Präferenz und vorhandene Sonderregeln. Regeln werden nur angeboten, wenn sie für den Wettbewerb sinnvoll sind.
- One-Click Rebuild respektiert gesperrte Spieler, tatsächlichen Kartenbesitz und alle Limits. Bei fehlender gültiger Lösung klare Erklärung, keine defekte Teilaufstellung.

### Daily Missions
- Fußball: Feldspieler Goal/Assist/Goal-Line-Clearance; Torhüter Penalty Saved/Clean Sheet. Ohne offizielle Aktionshistorie nur **heuristische Rangfolge mit Hinweis**; keine erfundenen Prozentwerte.
- NBA: Ziel = `max(20, L10+7)` gemäß bisheriger Mission, historisches Upside/Volatilität und DNP-Gefahr; aktualisierte Missionsregeln vor Veröffentlichung erneut verifizieren.
- Kandidaten mit überprüfbarem Kartenbesitz priorisieren, `Nur meine Karten` als Standardoption; One-Click öffnet Auswahl/Builder, keine externe Sorare-Einreichung behaupten.

### Match Center
- Links Spiel- und Datumsnavigation, rechts Detailansicht. Aufstellungen nur als „erwartet“, sofern nicht bestätigt. Ergebnisse/Live-Status nur aus belastbarer Quelle.
- NBA: Court-Visualisierung optional und erst beim Öffnen geladen. Fußball: Spielübersicht, Matchup-Daten und eigene Karten.

### Profile, Guides und Analysen
- Interne kompakte Profilansicht mit L5/L10, Spieleliste, Prognosemodellen, Formverlauf, Teamstatus, Kartenbonus und externem Sorare-Link.
- Kontext-Hilfe bei Spaltenüberschriften sowie Guide-Seite im Stil der gelieferten Arbeitsablauf-Screenshots.

## 5. Datenarchitektur und Validierung

**Sorare API (GraphQL):** Bestehende serverseitige Integrationsschicht beibehalten und schrittweise modularisieren. Server-Only Zugangsdaten; API-Key/JWT niemals im Client. Queries schlank, wo sinnvoll paginiert und wiederverwendet. `429`/`Retry-After` mit kontrolliertem Backoff. Quelle: https://github.com/sorare/api

**Fußball-Set:** Offizielles aktives `currentSet` über Set-ID mit jeder `cardSet` abgleichen. Historische Karten im Archiv erhalten, aber nicht in der aktiven `Meine Karten`-Auswahl verwenden.

**NBA-Teams:** Regulären NBA-Wettbewerb anhand einer gepflegten Liste von 30 NBA-Franchise-IDs und zugehörigen gültigen Fixtures abgrenzen; Team Melo und andere All-Star-/Event-Teams nicht als reguläre Teamzuordnung verwenden. Spielers aktuelle reguläre Zugehörigkeit unabhängig von Event-Teilnahmen auflösen; nur relevante Wettbewerbe filtern, keine Spieler pauschal nach historischem Teamlabel entfernen.

**Prognosen:** Rohwerte, Faktoren, Zeitstempel, Modellversion und Datenqualität trennen; kein doppelter Gegner-/Kartenbonus. Die App unterscheidet eindeutig zwischen offiziell, abgeleitet, geschätzt und unbekannt. Odds-basierte oder proprietäre Kennzahlen nur bei verlässlicher, kostenlos verfügbarer Quelle.

**Lokale Persistenz:** Teamzustände/Filter/Presets in versioniertem lokalen Speicher; große Statistikhistorien vorzugsweise in IndexedDB mit Export/Import und Migrationsstrategie. Ohne Server-Datenbank **keine** Zusage geräteübergreifender Synchronisation oder Hintergrund-Lernjobs.

## 6. Performance-First-Architektur

### Trennung der Module
Aktuell befinden sich viele Verknüpfungen in `app/components/arcade-dashboard.tsx` (>1.100 Zeilen) und `app/components/builder-workspace.tsx` (~700 Zeilen). Neue Struktur nach Sport und Feature, z. B. `features/football`, `features/nba`, `features/collection`, `features/missions`, `features/match-center`, `features/analytics`, jeweils mit `components/`, `hooks/`, `domain/` und `api/`. Die vorhandenen `lib/`-Rechenkerne werden gezielt wiederverwendet, nicht unkontrolliert kopiert.

### Technische Regeln
1. **Route-Level Code-Splitting:** Jede Hauptseite lädt nur ihre Komponenten. Schwere Diagramme, Court-Grafik und Statistiken dynamisch bei Bedarf.
2. **Virtualisierte Tabellen:** Auch bei Tausenden Spielern nur sichtbare Zeilen plus Puffer rendern; stabile Keys und konstante Zeilenhöhen, wo möglich.
3. **Gezielte Berechnung:** Prognosen einmal pro fachlichem Datensatz/Modellversion berechnen, Memoisierung nach stabilen Schlüsseln. Bei Filterwechseln nur abhängige Selektionen neu berechnen.
4. **Schwere Optimierungen entkoppeln:** Rechenintensive Auto-Build-Vorgänge in einem Web Worker oder backendseitig; abbrechbare Jobs, Fortschritt und neueste Anfrage gewinnt. Keine Blockierung des Hauptthreads.
5. **API-Caching:** Frischeabhängige TTLs je Ressource; laufende identische Requests deduplizieren; kontrollierter Refresh; keine Update-Schleifen. Verletzungs- und Fixturedaten kürzer als Historie cachen.
6. **Stabile State-Grenzen:** Global nur Auth, Sport/Datum, Collection-Status und benötigte gemeinsame Selektion; Builder-/Analyse-Zustände lokal halten. Keine globalen Re-Renders bei jeder Tastatureingabe.
7. **Suche/Filter:** Suchfeld de-bouncen (ca. 150–250 ms), keine Vollsuche durch unindizierte Sammlungen bei jedem Keypress, Vorindexierung per ID/Team/Set.
8. **Bilder und CSS:** Lazy Playerfotos, dimensionierte Bilder, passende Thumbnails, keine teuren `backdrop-filter`/Blur-Layer über scrollbaren Tabellen.
9. **Fehler/Status:** Kein Blocking-Sync für Seitenwechsel; Ladezustände und Fehler je Bereich, robuste Wiederholung und Offline-Hinweise.
10. **Grenzwerte im CI:** Build/TypeScript, Unit-/Integrationstests und Browser-Benchmarks vor Freigabe.

### Zielwerte, die gemessen werden müssen
- **INP < 200 ms**, **LCP ≤ 2,5 s**, **CLS ≤ 0,1** bei realen Nutzungsdaten (Core Web Vitals). Quelle: https://developers.google.com/search/docs/appearance/core-web-vitals
- Ziel auf Referenz-Desktop: Tab-/Seitennavigation nach Initialladung gefühlt sofort, sichtbare Eingabereaktion <100 ms, flüssiges Scrollen nahe 60 FPS ohne lange Frames.
- Testgrößen: mindestens 500/2.000/5.000 Spieler, 500/2.500 Karten, 10+ Teams, mehrere Varianten und gleichzeitige Such-/Filteraktionen.
- Build-Größen, Renderzeit und Long Tasks mit Chrome Performance/React Profiler dokumentieren; Grenzwerte müssen auf realer Vercel-Preview und mittelklassigem Gerät gemessen werden. Zielwerte sind **keine vorab garantierten Resultate**.

## 7. Testmatrix und Sicherheitsnetz

- NBA: 5 Spieler, 16-Sterne-Regel wo zutreffend, Sterne-Stufen, L10, DNP/OUT, nur aktuelle gültige Spiele, Sonderteams ausgeschlossen, Kartenmehrfachnutzung gemäß Regeln.
- Fußball: GK/DEF/MID/FWD/Extra, Captain, Boni, echte Set-ID, aktuelle Divination-Karten, korrektes Fixture/Datum, Spiele ohne bestätigte Daten.
- Sammlungs-Sync: Karten aus altem + aktuellem Set für denselben Spieler, Karten ohne Set-ID, temporäre API-Fehler und lokale Cache-Invalidierung.
- Missionen: NBA `max(20,L10+7)`, fehlender L10, zeitlich relevante NBA-Nachtspiele, Football-Aktionsstatistiken absent, One-Click-Besitzvalidierung.
- UI: Filterwechsel ohne Zustandverlust, große Tabellen, Tastatur/Touch, Mobil-Breakpoints, Drawer, gespeicherte Teams, Sync-Warnungen.
- Deployment: `npm run build` einschließlich voller Next.js-Typprüfung **muss** vor Übergabe grün sein; Regressionstests ebenfalls. Keine Freigabe mit „nur Syntaxcheck“.
- Browser: Test auf Vercel-Preview unter realistischem Netzwerk, Performance-Recording und nachweislich keine Regression gegenüber V3.9.2.

## 8. Entwicklung in kontrollierten Etappen

1. **Foundation:** Projektduplikat/Branch, neue Markenidentität, Design Tokens, App-Shell, modularer State/API-Layer, Smoke Tests. Altversion bleibt produktiv.
2. **Builder MVP:** Football + NBA Layout links/rechts, Tabellenvirtualisierung, Slot-Aktionen, Spielerlinks, reguläre NBA-Teams, Set-Sync. Performance vergleichen.
3. **Auto-Builder:** Bestehende Optimierungs-Engines und Regel-Dialog integrieren; vollständige Validierung und Benchmarks.
4. **Daily Missions & Sammlung:** Neue UI ohne doppelte Berechnungen; kostenloser Datenpfad und Datenqualitätsindikatoren.
5. **Match Center, Profile & Guides:** Schrittweise und lazy geladen. Nur belegbare Daten anzeigen.
6. **Hardening & Migration:** Teams/Presets migrieren, Tests, Cross-Browser, mobile Ansicht, Vercel-Preview und Performance-Messungen. Erst dann Wechsel von V3.9.2 zur neuen Produktion.

## 9. Nicht-Ziele / Grenzen

- Keine 1:1-Reproduktion von SoProb-Quellcode, Texten, Markenassets oder nicht öffentlichen Algorithmen.
- Keine scheinbar präzisen Tor-, Assist-, Clean-Sheet- oder DNP-Wahrscheinlichkeiten, wenn Trainingsdaten bzw. Kalibrierung fehlen.
- Keine kostenpflichtigen APIs oder verpflichtenden Datenbanken.
- Keine Garantie „immer 60 FPS“ ohne Tests auf Gerät/Netzwerk/Datensatz; stattdessen harte Release-Gates und kontinuierliche Messung.

## 10. Abnahme von V4.0

**Funktional:** Alle bisherigen wesentlichen Fußball-/NBA-Regeln und Collection-/Daily-Mission-Abläufe laufen korrekt. **UX:** Schwarzes/goldenes eigenes Design, leistungsstarker Zwei-Spalten-Builder, verständliche Dialoge und verlässliche Spielerlinks. **Performance:** Lasttests, Core-Web-Vitals und vollständiger Next.js-Produktionsbuild bestanden. **Betrieb:** Keine zusätzliche kostenpflichtige Infrastruktur erforderlich; V3.9.2 bleibt als Rollback-Pfad erhalten.
