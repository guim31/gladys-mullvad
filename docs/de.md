# Mullvad VPN

Prüft, ob die Internetverbindung deines Zuhauses wirklich über das [Mullvad-VPN](https://mullvad.net/) rausgeht, wie
der Verbindungstest auf der Website von Mullvad, und warnt deine Szenen, wenn das nicht mehr so ist. Entwickelt ohne
Mullvad-Tunnel auf Seiten des Entwicklers: Rückmeldungen sind willkommen.

## Was du bekommst

Ein Gerät **Mullvad VPN** mit drei schreibgeschützten Funktionen:

- **Über Mullvad**: 1, wenn der Verkehr von Gladys über einen Mullvad-Server ins Internet geht, sonst 0.
- **IP auf Sperrliste**: 1, wenn die Ausgangs-IP auf einer Mullvad bekannten Sperrliste steht (Spam-Listen…).
- **Ausgangsland**: das Land, aus dem das Internet deinen Verkehr kommen sieht.

Die öffentliche IP und der Mullvad-Server sind absichtlich **keine** Funktionen, damit sie nie im Verlauf landen. Beide
erscheinen im Widget (die IP nur auf Wunsch) und in der Meldung der Schaltfläche **Verbindung jetzt prüfen**.

## Funktionsweise

Alle paar Minuten fragt die Integration `https://am.i.mullvad.net/json` ab, den öffentlichen Verbindungstest von
Mullvad (ohne Konto und Schlüssel). Geprüft wird nur **der Verkehr von Gladys**: Er zeigt, ob das Zuhause über Mullvad
rausgeht, wenn das VPN auf dem Router oder dem Rechner von Gladys läuft, nicht, ob ein anderer Computer es nutzt.

## Installation

Geh in Gladys auf **Integrationen → Von GitHub installieren** und gib `https://github.com/guim31/gladys-mullvad` ein.
Öffne dann den Tab **Entdecken** der Integration und füge das Gerät **Mullvad VPN** hinzu.

## Konfiguration

- **Prüfintervall**: 1 bis 60 Minuten, standardmäßig 5. Jedes Mal eine kleine Anfrage.
- **Sprache der Funktionsnamen**: die Sprache der Funktionsnamen (beim Hinzufügen des Geräts festgelegt) und der
  Meldungen. Standardmäßig Französisch.

## Dashboard-Widget

Das Widget **Mullvad VPN** zeigt auf einen Blick: ein grünes „Ja“ oder ein rotes „Nein“, den Ausgangsort, den genutzten
Mullvad-Server (oder deinen Anbieter ohne Mullvad), die Sperrlisten und die Zeit der letzten Prüfung. Seine
Einstellungen:

- **Server oder Anbieter anzeigen** (standardmäßig an);
- **Öffentliche IP anzeigen** (standardmäßig aus: Jeder, der das Dashboard sieht, würde sie sehen);
- **Schaltfläche „Jetzt prüfen“ anzeigen** (standardmäßig an).

## Szenen

Auslöser:

- **Verbindung läuft nicht mehr über Mullvad**: Eine Prüfung sieht den Verkehr außerhalb von Mullvad, nachdem er
  darüber lief. Variable: Ausgangsland.
- **Verbindung läuft wieder über Mullvad**: Variablen: Ausgangsland, Mullvad-Server.
- **Mullvad-Prüfung nicht erreichbar**: Zwei Prüfungen hintereinander sind gescheitert. Oft ein Internetausfall oder
  ein Kill Switch, der den Verkehr blockiert, während der Tunnel weg ist. Variable: Fehler. Einmal pro Ausfall.

Aktion: **Mullvad-Verbindung prüfen** prüft sofort und gibt `success`, `through_mullvad`, `country`, `server` und
`blacklisted` an die nächsten Aktionen weiter. Wenn die Prüfung nicht möglich ist, ist `success` falsch: Prüf das
zuerst.

Die erste Prüfung nach einem Start löst nie etwas aus (es gibt nichts zu vergleichen).

## Verbindung jetzt prüfen

Im Konfigurationsbildschirm der Integration prüft die Schaltfläche **Verbindung jetzt prüfen** sofort und zeigt das
Ergebnis: über Mullvad oder nicht, Server, Ausgangsort, Anbieter, öffentliche IP und Sperrlisten. Die Meldung wird rot, wenn
am.i.mullvad.net nicht erreichbar ist.

## Grenzen und Datenschutz

- Geprüft wird nur der Verkehr des Containers der Gladys-Integration (siehe „Funktionsweise“).
- Solange die Prüfung scheitert, behalten die Funktionen ihren letzten bekannten Wert: Ein Fehlschlag sagt nichts über
  den Tunnel.
- am.i.mullvad.net ist ein kostenloser öffentlicher Dienst von Mullvad ohne veröffentlichtes Kontingent: Halte ein
  vernünftiges Intervall (standardmäßig eine Anfrage alle 5 Minuten). Mullvad sieht die Anfrage, wie bei jedem Besuch
  seiner Website.
- Nichts wird auf die Festplatte geschrieben, und die öffentliche IP landet nie in den Logs.

## Fehlerbehebung

- „am.i.mullvad.net ist nicht erreichbar“: Prüf die Internetverbindung von Gladys oder deinen Kill Switch.
- Funktionsnamen in der falschen Sprache: Ändere die Sprache, lösche das Gerät und füge es erneut hinzu (die Namen
  werden beim Anlegen festgelegt).
- Mehr Details mit `LOG_LEVEL=debug`. Melde Probleme auf [GitHub](https://github.com/guim31/gladys-mullvad/issues).

Diese Integration ist nicht mit Mullvad VPN AB verbunden.
