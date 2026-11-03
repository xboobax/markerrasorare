# Markerras Sorare Helper V1.8 – Forecast Lab & Prognose-Datenbank

## Einfache Installation mit GitHub Desktop

**Diese Version baut auf der funktionierenden V1.7.2 auf.** Die bestehende `lib/sorare.ts` wurde nicht verändert. Die Fotos, L5/L10-Abfragen, vier Fußballligen und der NBA-16-Sterne-Builder bleiben damit in derselben Datenanbindung.

1. Öffne in GitHub Desktop das Repository `xboobax/markerrasorare` und wähle den **aktuellen funktionierenden Stand (V1.7.2)**.
2. Erstelle über **Current Branch → New Branch** den Branch `forecast-lab-v1-8`.
3. Entpacke das ZIP. Öffne **Repository → Show in Explorer**.
4. Kopiere **die Inhalte des Ordners** `markerrasorare-main` aus dem ZIP in den geöffneten Repository-Hauptordner. Vorhandene gleichnamige Dateien ersetzen. **Niemals `.git` löschen; keine `.env`- oder API-Key-Dateien kopieren.**
5. GitHub Desktop: Summary `Markerras Sorare Helper V1.8 – Forecast Lab`, dann **Commit → Publish branch**.
6. Öffne bei Vercel das **Preview-Deployment** des Branches. Prüfe Bundesliga, LaLiga, Ligue 1 und Premier League sowie NBA (L5, L10, Fotos), beide Builder und „Forecast Lab“.
7. Erst wenn das Vercel-Preview erfolgreich gebaut wurde und alles läuft, den Branch über einen GitHub Pull Request in `main` zusammenführen.

**Bei Fehlern:** Nicht auf `main` mergen. Den Preview-Fehler aus `Vercel → Deployments → Build Logs` oder `Runtime Logs` kopieren (API-Keys nicht teilen). Die funktionierende V1.7.2 bleibt erhalten.

## 1. Neues Forecast Lab

* Auswahl zwischen **V1.7 Standard** (voreingestellt) und **V1.8 Experiment**. Die gewählte Einstellung bleibt im Browser gespeichert.
* V1.8 verarbeitet vorhandene Sorare-Spielwerte mit abnehmender Zeitgewichtung und begrenzt den Einfluss einzelner Ausreißer. Die Gewichtung ist für NBA und Fußball getrennt konfiguriert.
* Kurze Formhistorie wird zur bisherigen V1.7-Prognose hin **geschrumpft**; eine neue Vorhersage darf höchstens ±15 % vom Basismodell abweichen.
* Nicht-Einsatz-Risiko bleibt ausdrücklich Teil des Erwartungswerts. Neben einer Prognose bei Einsatz wird ein geschätztes Score-Intervall **inklusive Null bei Nicht-Einsatz** angezeigt.
* Im Spielerprofil erscheinen Modellvergleich, relative Änderung, zwei Schwellwertwahrscheinlichkeiten und Datenqualitäts-Hinweise.
* Die Schwellwertchancen sind **unvalidierte Modellschätzungen**, keine garantierte Eintrittswahrscheinlichkeit. Es wurden keine externen Statistiken oder erfundenen xG-/NBA-Minuten eingefügt.

**Wichtig:** Das neue Modell ist zunächst **nicht automatisch das Standardmodell**. Nur wenn zukünftige vor dem Spiel gespeicherte Vorhersagen anhand echter Resultate im zeitlichen Test eine nachweisliche Verbesserung zeigen, sollte man es dauerhaft übernehmen.

## 2. Lokale Prognose-Datenbank

* IndexedDB speichert jetzt deine Snapshots dauerhaft **im selben Browser auf demselben Gerät**. Es gibt keine Cloud-Datenbank und keine geräteübergreifende Synchronisation.
* Bereits vorhandene Prognosen aus dem bisherigen `localStorage` werden beim ersten Besuch übernommen.
* Als Ausfallsicherung wird das bekannte `localStorage`-Format weiterhin gespiegelt, soweit das Browserlimit es zulässt.
* Über **Prognosen sichern (JSON)** kannst du ein Backup erstellen. Bitte gelegentlich exportieren, besonders vor Browserbereinigung oder einem Gerätewechsel. **Der Verlust der Browserdaten löscht die lokale Datenbank.**
* Die Speicherkapazität ist auf maximal 1.500 Vorhersagen pro Sportart begrenzt; alte Snapshots sollten daher regelmäßig gesichert werden.

### Automatische Vor-Spiel-Snapshots

* Der Schalter **„Vor-Spiel-Snapshots automatisch sichern“** ist beim ersten Besuch aktiviert und kann jederzeit deaktiviert werden.
* Bei einem Besuch der Anwendung werden bis zu 20 Spieler des aktuell geladenen Bereichs erfasst, **wenn ein bekannter Spieltermin an einem zukünftigen Kalendertag existiert** und Score-Daten vorliegen.
* Am Spieltag selbst wird mangels verlässlicher Uhrzeit nicht automatisch archiviert, um versehentliches Speichern nach dem Spiel zu vermeiden.
* **Es gibt keine Hintergrundüberwachung oder tägliche Cron-Ausführung**. Ein Snapshot entsteht nur, wenn die Webseite tatsächlich geöffnet wird.
* Die gespeicherten Prognosen werden bei späteren Modelländerungen nicht nachträglich überschrieben. Dein bestehender manueller Speicherknopf funktioniert weiter.

## 3. Backtesting – nur echte, vor dem Spiel gespeicherte Modelle

* Neue Snapshots speichern **die V1.7- und V1.8-Vorhersage gleichzeitig**, das aktive Modell, Zeitpunkt und ein modelliertes 10-%-/90-%-Intervall.
* Nach einem eindeutig zuordenbaren offiziellen Sorare-`FINAL`-Ergebnis zeigt das Dashboard **MAE** (mittleren absoluten Fehler), **RMSE** und **Bias** und zusätzlich einen gepaarten MAE-Vergleich beider Modellversionen.
* Für die Prüfung der 80-%-Intervallabdeckung sind mindestens zehn offizielle Paare nötig.
* Ein eigener zeitlicher Holdout-Bericht erscheint erst ab **20 offiziell bestätigten Modellpaaren aus mindestens sechs verschiedenen Spieltagen**. Der Holdout enthält die jüngsten 30 % der Spieltage.
* Fehlt einem alten V1.7-Eintrag eine damals gespeicherte V1.8-Prognose, wird sie **nicht rückwirkend erfunden**. Ebenso fließen manuell eingetragene oder nicht eindeutig zuordenbare Resultate nicht in den offiziellen Modellvergleich ein.
* Ein „V1.8 vorne“ ist zunächst nur ein Hinweis auf beobachtete Fehler, **keine Garantie für zukünftige Prognosequalität**. Ein automatisches Training oder automatisches Umschalten der Modelle gibt es bewusst nicht.

## 4. Unverändert erhalten

* `lib/sorare.ts` **bytegenau unverändert gegenüber V1.7.2** (SHA-256: `32d3189f8de56bd2d358e179803ed297589244d0d4132b4349b7a0575d3fa8db`).
* NBA-16-Sterne-Regel, Fußball TW/VER/MF/FWD/EX, manueller und automatischer Builder und bis zu fünf Vergleichslineups.
* Spielerbilder mit Fallback und anklickbare Profile.
* Fußball ausschließlich Bundesliga, LaLiga, Ligue 1 und Premier League.
* Vorhandenes Sorare-Result-Reconciliation-API-Endpunkt und die bestehenden Drittanbieter-Matchup-Anbindungen.

## 5. Technischer Teststand

* `npm run test:arcade` – alle bisherigen Tests plus V1.8-Regressionstests (robuste Prognose, Score-Wahrscheinlichkeiten, Vor-Spiel-Regeln, Datenmigration, zeitlicher Modellvergleich) bestanden.
* Isolierte TypeScript-/TSX-Typprüfung mit lokalen Test-Shims bestanden.
* **Kein vollständiger Next.js-Build oder Live-Datenabruf in dieser Umgebung möglich** (Next.js-Abhängigkeiten hier nicht installiert); deshalb zuerst Vercel-Preview testen.

## Hinweise für die Zukunft

Eine **echte serverseitige Cloud-Datenbank** mit synchronisierten Benutzerdaten und Hintergrund-Cron wäre ein separater späterer Schritt. Dafür braucht es Authentifizierung, sichere Datenbank-Zugangsdaten, Zugriffsschutz, Datenbankmigrationen und ggf. Vercel Cron. V1.8 führt dies bewusst nicht ohne deine Einrichtung/Einwilligung ein.
