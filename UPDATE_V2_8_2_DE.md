# Markerras Sorare Helper V2.8.2 – Sorare-Kartensynchronisierung repariert

## Welcher Fehler ist behoben?

Beim Klick auf **Jetzt synchronisieren** meldete Sorare:

`Field 'anyCards' doesn't exist on type 'CurrentUser'`

Der zuvor eingebaute Abruf hat das Feld `anyCards` fälschlich unter `currentUser` abgefragt. Im aktuellen offiziellen Sorare-GraphQL-Schema liegt die **paginierte** Sammlung unter der Root-Abfrage `cardsWhere(first: 50, after: $after, ownedByMe: true)`. `currentUser { slug }` dient nur noch dazu, die angemeldete Person abzugleichen.

Die neue Abfrage lädt alle Seiten über den bestehenden Cursor-Mechanismus. Bei einem Abbruch bleiben bereits gespeicherte Karten und manuelle Besitzmarkierungen erhalten; die Sammlung wird nur nach einem vollständigen Durchlauf ersetzt.

## Installation (auf die funktionierende V2.8.1 aufsetzen)

1. Lade **`markerras-v2.8.2-sorare-sync-hotfix-nur-update.zip`** herunter und entpacke sie.
2. Öffne GitHub Desktop und wähle das Repository `xboobax/markerrasorare`, **Branch `main`** (oder einen eigenen Test-Branch auf Basis deiner laufenden V2.8.1).
3. Wähle **Repository → Show in Explorer**.
4. Kopiere die **Inhalte** des entpackten Ordners `markerrasorare-main` in dein vorhandenes Projektverzeichnis und ersetze gleichnamige Dateien; `.git` nicht löschen.
5. Erstelle den Commit **`Fix Sorare collection sync V2.8.2`** und klicke auf **Push origin**.
6. Prüfe auf Vercel, dass ein **neuer Commit** gebaut wird. Einen alten fehlerhaften Commit erneut zu deployen hilft nicht.
7. Öffne https://markerrasorarev1.vercel.app/#meine-karten und klicke auf **Jetzt synchronisieren**.
8. Kontrolliere die Kartenanzahl zunächst für NBA und dann für Fußball. Der Filter **„Nur meine Karten“** wird erst nach dem vollständigen Sync aktiv.

## Muss ich Secrets ändern oder Sorare neu verbinden?

**Nein.** Die vier bestehenden Vercel-Variablen und deine aktuell funktionierende OAuth-Sitzung bleiben unverändert. Gib niemals `SORARE_OAUTH_CLIENT_SECRET`, `SORARE_SESSION_SECRET` oder Access-/Refresh-Tokens in Chats, Screenshots oder GitHub ein.

## Was bleibt unverändert?

- `lib/sorare.ts` und die Sorare-Score-Abfragen
- `lib/nba-stars-feed.ts` und der offizielle NBA-Sterneabruf
- OAuth-Start, Callback, Refresh und Logout
- NBA-/Fußball-Builder, Prognosen, Injury Center und deine lokal gespeicherten Teams

## Technische Prüfung

- Sorare-Schema verifiziert: https://api.sorare.com/graphql/schema (`Query.cardsWhere`, `CurrentUser.slug`, `AnyCardInterface` und `PageInfo`).
- Alle bestehenden Regressionstests plus neuer V2.8.2-Regressionstest erfolgreich.
- Eine **Live-Kartensynchronisierung** mit deinem OAuth-Konto und ein vollständiger Next.js-Build konnten hier nicht ausgeführt werden. Der abschließende Test erfolgt im Vercel-Deployment.

Wenn beim Synchronisieren noch eine neue Sorare-Fehlermeldung auftaucht, sende bitte nur den Fehlertest ohne Tokens/Secrets. Dann können wir den konkreten API-Fall korrigieren.
