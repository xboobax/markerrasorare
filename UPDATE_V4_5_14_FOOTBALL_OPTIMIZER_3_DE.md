# MarkErras Sorare Dream V4.5.14 – Football Smart Optimizer 3.0

## Ersetzt den bisherigen Football Auto-Optimizer

Im bisherigen Menüpunkt **Fußball → Automatisch optimieren** liegt jetzt der neue Smart Matchday & Diversity Optimizer 3.0. Die alte separate Football Intelligence-Auswahl wird in diesem Bereich nicht mehr angezeigt. Die anderen Builder-, Karten-, Captain-, Learning- und Live-Center-Funktionen bleiben bestehen.

### Funktionen

- **Matchday Gate:** Heute, nächste 24 Stunden (Standard), morgen und kommende sieben Tage. Für Kalendertage muss Sorare `nextGame` mit Datum und zwei Teams ausgeben. Ein leeres/mehrdeutiges Spiel wird nicht als bestätigte Partie ausgegeben.
- **Rolling 24h:** Unabhängig bestätigte Anstoßzeit aus den vorhandenen öffentlichen ESPN-Fußball-Scoreboards; beide Mannschaften müssen eindeutig der Sorare-Paarung entsprechen. Geplante, aber bereits gestartete Partien werden nicht als kommende 24h empfohlen. Ist die Datenquelle nicht erreichbar oder eindeutig, darf die Karte nicht ohne Uhrzeit in den 24h-Pool.
- **Vier Profile:** Max Points, Smart Balance, Safety First und High Ceiling. Stets dieselben Positions- und V3.0-Risikoregeln; bis zu vier regelkonforme Varianten und ein Qualitätsschutz für Alternativen (mindestens 90 % der Max-Prognose).
- **Diversity:** Ziel 1, 2 oder 3 andere Spieler. Ist dies unmöglich, wird die Abweichung erkennbar gemacht, nicht stillschweigend als erreicht dargestellt.
- **One Click:** Ein vollständiges Fünferteam inkl. Captain wird in den manuellen Builder übertragen. Vor dem Import werden Termine, 5 Positionen, Verletzungen, Besitzfilter, Captain und Ausschlüsse erneut geprüft. Ein bestehendes Team wird nur nach expliziter Bestätigung ersetzt. Keine direkte Sorare-Einreichung.
- **Kein Sternebudget:** Die 16-/11-Sterne-Limits gelten für den NBA-Stars-Optimizer, nicht für Fußball.
- **Performance:** Begrenzte Beam-Suche, keine zusätzlichen Menü-Tabs, keine weiteren Datenbankmigrationen oder Cronjobs. Die Spieleliste wird nur für den 24h-Modus beim geöffneten Fußball-Auto-Optimizer angefragt.

### Bekannte Einschränkungen

- Ein bestätigtes ESPN-Spiel ist nicht automatisch ein offizieller Sorare-Gameweek-Teilnehmer. Ein Spieler wird bei Nationalmannschaften nur berücksichtigt, wenn sein Sorare-Fixture eindeutig zu dieser Partie passt; die Zugehörigkeit zu einem Verein in einer der vier beobachteten Ligen allein reicht nicht.
- Wenn ESPN und Sorare unterschiedlich geschriebene Mannschaftsnamen führen, kann die exakte 24h-Zuordnung aus Vorsicht ausfallen. Das erzeugt weniger Vorschläge, keine erfundenen Spiele.
- Es erfolgt keine automatische Lineup-Einreichung bei Sorare.
- Der vollständige Next.js-Produktionsbuild muss in Vercel bestätigt werden (lokal keine npm-Pakete in dieser Umgebung verfügbar).

### Installation

Wie üblich die Dateien der vollständigen ZIP in das GitHub-Repository übernehmen und Vercel Production Deployment prüfen. **Keine SQL-Migration und keine neue Umgebungsvariable.**

### Tests

- Vollständiges bisheriges `npm run test:arcade` erfolgreich.
- V4.5.14-Test: Tages-/24h-Zuordnung, fehlende Uhrzeit, laufende Spiele, Mehrdeutigkeit, Rollen, Captain, Diversity und Fünferteam-Transfer.
- TypeScript-Syntax-/Transpileprüfung aller Projektdateien erfolgreich.
