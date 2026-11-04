# Markerras Sorare Helper V2.8 – My Sorare Collection

## Was ist neu?

Offizieller OAuth-Login über Sorare. Der Helper fragt **niemals** dein Sorare-Passwort ab.
Deine NBA- und Fußballkarten werden mit Original-Spieler-Slug, Seltenheit, Saison und Seriennummer synchronisiert.
Die Ansicht „Nur meine Karten“ und die Optimierung im Builder nutzen nach **vollständigem** Abgleich den synchronisierten Besitz statt manueller Markierungen. Dein bestehender lokaler Bestand bleibt als Backup gespeichert.

## 1. Sorare-App erstellen

1. Gehe zu https://sorare.com/settings/developer und melde dich in deinem Sorare-Konto an.
2. Erstelle dort eine OAuth-Anwendung namens **Markerras Sorare Helper**. Die aktuell offizielle Dokumentation ist https://github.com/sorare/api (Abschnitt „OAuth Authentication / Login with Sorare“).
3. Gib als Callback/Redirect-URI **exakt** diese Adresse an:

   `https://markerrasorarev1.vercel.app/api/auth/sorare/callback`

4. Notiere die **Client-ID** und das **Client-Secret** für dich. **Keine Geheimnisse im Chat teilen oder in GitHub hochladen!**

## 2. Vercel-Umgebungsvariablen

1. Öffne https://vercel.com, wähle dein Markerras-Projekt.
2. **Settings → Environment Variables → Add New**.
3. Hinterlege vier Werte (für Production und bei Bedarf Preview):

| Name | Wert |
|---|---|
| `SORARE_SITE_URL` | `https://markerrasorarev1.vercel.app` |
| `SORARE_OAUTH_CLIENT_ID` | Die ID aus Sorare-Entwicklereinstellungen |
| `SORARE_OAUTH_CLIENT_SECRET` | Das Secret aus Sorare-Entwicklereinstellungen |
| `SORARE_SESSION_SECRET` | Ein zufällig erzeugter Hex-Wert mit mindestens 32 Zeichen |

Einen starken Sitzungsschlüssel kannst du **lokal** im Windows-Terminal mit installiertem Node.js erzeugen:

`node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`

Keine Schlüsselwerte in Screenshots oder öffentlichen Issues zeigen. Der Sitzungsschlüssel verschlüsselt das HTTP-only-Sitzungscookie; beim Wechsel des Schlüssels werden alte Verbindungen ungültig.

`SORARE_API_KEY` ist optional und nur für erhöhte GraphQL-Grenzen nötig.

**Wichtig:** Die registrierte Callback-URL muss exakt zur unter `SORARE_SITE_URL` hinterlegten Adresse passen. Bei einem Test auf einer anderen Vercel-Preview-Domain kannst du nicht dieselbe Callback-Adresse verwenden, außer Sorare erlaubt diese zusätzliche URL und du konfigurierst dafür die passende Domain. Daher besser OAuth erst nach dem Deployment auf der Hauptdomain testen.

## 3. ZIP in GitHub Desktop einspielen

1. Aktualisiere zunächst dein Repository auf die funktionierende V2.7.
2. Erstelle den neuen Branch `my-sorare-collection-v2-8`.
3. Öffne **Repository → Show in Explorer**.
4. Kopiere den Inhalt des `markerrasorare-main`-Ordners aus `markerras-v2.8-nur-update.zip` ins bestehende Projekt. Gleichnamige Dateien ersetzen; `.git` nicht löschen.
5. Commit `Add My Sorare Collection OAuth V2.8`, Branch veröffentlichen, im Vercel-Projekt deployen.
6. Setze die Umgebungsvariablen und löse anschließend ein **Redeploy** aus, damit die Änderungen aktiv werden.
7. Öffne `https://markerrasorarev1.vercel.app/#meine-karten` und drücke **Mit Sorare verbinden**.
8. Melde dich direkt bei Sorare an, autorisiere die Anwendung und prüfe, ob du danach deine Karten siehst.
9. Teste sowohl NBA als auch Fußball und den Spielerpool **Meine Karten**. Wenn die Sammlung unvollständig ist, bleibt der manuelle Bestand wirksam.

## Sicherheit und technische Grenzen

- Die Access- und Refresh-Tokens werden nur serverseitig in einem AES-256-GCM-verschlüsselten Cookie (HTTP-only, SameSite=Lax, HTTPS) verwaltet. Das Client-Secret bleibt ausschließlich in den Vercel-Umgebungsvariablen.
- OAuth verwendet eine zeitlich begrenzte `state`-Prüfung gegen Login-CSRF. OAuth-Tokens werden bei Ablauf serverseitig erneuert.
- **Sorare trennen** widerruft bestmöglich das Token und entfernt das lokale Sitzungscookie sowie den Browser-Sammlungsindex.
- Kartenlisten sind auf deinen Browser begrenzt; bei Browserwechsel musst du erneut synchronisieren. Ein Kartenindex wird lokal gespeichert, damit die Ansicht auch nach einem Reload erhalten bleibt. Er enthält **keine Tokens**.
- Der Helper erstellt keine echten Sorare-Lineups und führt keine Käufe/Verkäufe aus. Hier wird nur **lesender Zugriff** auf die Sammlung verwendet.
- Der bestehende Builder bleibt spielerbasiert. Doppelte Karten werden im Bestand gezählt, aber nicht als doppelte Spieler desselben Lineups aufgestellt. Die Seltenheit der Karten wird angezeigt; kartenspezifische Wettbewerbszulassungen können zusätzliche Regeln haben und werden hier **noch nicht** automatisch geprüft.
- Der Connector konnte **ohne echte OAuth-Credentials** nicht live eingeloggt und gegen das persönliche Konto getestet werden. Die verwendeten GraphQL-Felder wurden in der offiziellen Sorare-Schema-Dokumentation geprüft. Vor breiter Nutzung bitte die echte Synchronisierung kontrollieren.

## Unverändert

`lib/sorare.ts`, Sorare-Scores, NBA-Sterne-Sync, Forecast Lab, Spielplan und Injury Feed werden nicht überschrieben.
