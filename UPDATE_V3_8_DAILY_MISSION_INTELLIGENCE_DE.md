# Neon Builder Pro V3.8 – Daily Mission Intelligence 2.0

## Neue Funktionen
- Fünfter Tab **Daily Missions** bleibt an derselben Position hinter **Sammlung**.
- **One-Click Mission Pick:** Der beste ausreichend sichere Kandidat aus der **verifiziert synchronisierten Sorare-Sammlung** wird in den manuellen Builder überführt. Ein höher gerankter fremder Spieler wird niemals automatisch gewählt. Der Builder prüft weiter Slot-, Karten- und Teamregeln; wenn kein Slot verfügbar ist, gibt der Builder eine Meldung aus. Es wird **keine Sorare-Mission eingereicht**.
- **Mission Safety:** Vorhandene Verletzungs-/Verfügbarkeitsdaten und ihre Aktualität, Einsatzmodell und Form-/Datenqualität werden angezeigt. OUT und Sorare-Verletzungsflags werden ausgeschlossen, Doubtful nicht automatisch gewählt, Questionable mit Warnung. Fehlt ein verlässlicher Status, heißt das **nicht** „spielbereit“; auch ein guter Safety-Index ist keine Garantie.
- **NBA:** L10 ist ausschließlich ein offizieller Wert der bestehenden Sorare-Spielerdaten, Ziel = `max(20, L10 + 7)` Sorare-Managerpunkte. Bis zu zehn tatsächlich vorhandene Scores dienen als zusätzliche Ranghilfe. Kein L10 → kein NBA-Pick.
- **Fußball:** Tore, Assists, Torlinienklärung, Elfmeter gehalten und Clean Sheet sind Missionsbedingungen, aber **keine getrennten Aktionsdaten in der vorhandenen kostenlosen Spielerabfrage**. Daher bleiben Fußball-Picks heuristische Empfehlungen, keine kalibrierten Wahrscheinlichkeiten. xG/xA nur verwenden, wenn tatsächlich verfügbar.
- **Zeitraum:** Berlin-Heute/Morgen, bei NBA zusätzlich nächste 24 Stunden. Nur bestätigte Ansetzungen, keine erfundenen Tipoff-Zeiten.
- Prüfbericht zeigt ausgeschlossene Kandidaten und Gründe.

## Einrichtung & Datenschutz
1. Neues Projekt nach GitHub hochladen und auf Vercel deployen.
2. Wie bisher bei Sorare anmelden und im Tab **Sammlung** synchronisieren; bei Fußball wird ausschließlich das von Sorare als aktuell gemeldete Set als gültiger Besitz akzeptiert.
3. Im Tab **Daily Missions** zwischen Fußball und NBA wechseln, Zeitraum wählen und auf **⚡ Besten eigenen Spieler übernehmen** klicken.
4. Ein Wechsel in den manuellen Builder erfolgt; dort wird der Spieler nur aufgenommen, wenn die geltenden Regeln und freie Positionen es zulassen.

**Keine zusätzlichen API-Abos, kein Upstash, keine Vercel-Cron-Jobs, keine manuellen Statistik-Eingaben.** Eine echte End-to-End-Build-/Live-Sorare-Prüfung ist nach dem Deployment erforderlich.
