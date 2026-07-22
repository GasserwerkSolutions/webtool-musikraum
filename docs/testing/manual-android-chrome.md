# Manuelle Abnahme: Android Chrome

Franz bedient das Werkzeug auf einem Android-Telefon. Diese Checkliste ist
deshalb die massgebliche Praxisabnahme für den Editor; die iOS-Checkliste
(`manual-ios-safari.md`) bleibt für die Besucherinnen und Besucher der
exportierten Website relevant. Ergebnis wird im Pull Request mit Gerät,
Android-Version, Chrome-Version und Befund dokumentiert.

## Testumgebungen

Mindestens prüfen:

- Franz' eigenes Gerät mit seiner installierten Chrome-Version
- Hochformat, schmale Breite (um 360 bis 412 px)
- Bildschirmtastatur geöffnet
- Gestennavigation und Drei-Tasten-Navigation, sofern verfügbar
- wenn möglich eine ältere Chrome-Version oder ein WebView (Tastatur
  verkleinert dort den Layout-Viewport statt nur den visuellen Viewport)

## Moduswechsel

- [ ] Bearbeiten und Vorschau sind mit jeweils einer Aktion erreichbar.
- [ ] Nur der aktive Modus ist per Tastatur beziehungsweise TalkBack erreichbar.
- [ ] Der aktive Modus ist nicht nur farblich gekennzeichnet.
- [ ] Wechsel verändert weder URL noch Browser-History.
- [ ] Die System-Zurück-Taste verlässt das Werkzeug (dokumentiertes
      Verhalten); der Entwurf ist danach beim erneuten Öffnen unverändert da.
- [ ] Editor- und Vorschau-Scrollposition bleiben getrennt erhalten.

## Bildschirmtastatur und Fokus

- [ ] Die Modusleiste verschwindet, solange die Tastatur offen ist, und
      kehrt nach dem Schliessen zurück — auch im Layout-Resize-Modus
      älterer Chrome-Versionen.
- [ ] Einzeiliges Feld und Textarea bleiben nach Tastaturöffnung sichtbar.
- [ ] Kein automatischer Zoom beim Fokussieren von Feldern.
- [ ] Kein wiederholtes Scrollspringen während fortlaufender Eingabe.
- [ ] Schliessen der Tastatur hinterlässt keinen falschen dauerhaften Abstand.

## Chrome-Besonderheiten

- [ ] Einfahren der Adressleiste beim Scrollen verdeckt keine Bedienelemente
      und erzeugt keine Lücke unter der Modusleiste.
- [ ] Die Modusleiste kollidiert nicht mit der Gestennavigations-Zone am
      unteren Rand.
- [ ] Pull-to-Refresh löst nicht versehentlich aus, wenn im Editor nach
      oben gescrollt wird.

## Direkte Preview-Navigation

- [ ] Hero-Titel öffnet das exakte Feld im Bearbeitungsmodus.
- [ ] Klangmoment-Titel und Beschreibung führen zu den richtigen Feldern.
- [ ] Zurück zur Vorschau stellt die vorherige Position wieder her.

## Verlauf, Sortierung, Export

- [ ] Undo und Redo funktionieren in beiden Modi, Beschriftung nennt die Aktion.
- [ ] Reorder-Pfeile sind mit dem Daumen sicher treffbar.
- [ ] Export, Sicherung herunterladen und wiederherstellen funktionieren;
      der Download landet im Android-Download-Ordner.

## TalkBack-Stichprobe

- [ ] Modusknöpfe haben verständliche Namen und Zustände.
- [ ] Preview-Ziele werden als Bearbeitungsaktionen angekündigt.
- [ ] Der inaktive Modus ist nicht erreichbar.

## Dokumentation im PR

```text
Gerät:
Android-Version:
Chrome-Version:
Getestete Breiten:
Ergebnis:
Abweichungen oder bekannte Grenzen:
```

Blockierende Fehler sind verdeckte Eingabefelder, eine dauerhaft sichtbare
Modusleiste über der Tastatur, horizontaler Seitenüberlauf, nicht erreichbare
Exportaktionen oder eine Preview-Navigation zum falschen Feld.
