# Manuelle Abnahme: iOS Safari

Diese Checkliste ist für PR 6 verbindlich. Sie ergänzt die automatisierten Chromium-Tests und wird im Pull Request mit Gerät beziehungsweise Simulator, iOS-Version, Safari-Version und Ergebnis dokumentiert.

## Testumgebungen

Mindestens prüfen:

- aktuelle iPhone-Breite um 390 px
- kleine Breite um 320 oder 360 px
- Hochformat
- Bildschirmtastatur geöffnet
- normale und reduzierte Bewegung, sofern auf dem Testgerät einstellbar

## Vorbereitung

- frischen Standard-Draft öffnen
- vorhandenen Draft mit längeren Texten öffnen
- mindestens einen ausgeblendeten Bereich vorbereiten
- mindestens einen Readiness-Hinweis vorbereiten
- Exportpanel einmal erfolgreich und einmal mit simuliertem Bildfehler prüfen

## Moduswechsel

- [ ] Bearbeiten und Vorschau sind mit jeweils einer Aktion erreichbar.
- [ ] Nur der aktive Modus ist per Tastatur beziehungsweise VoiceOver erreichbar.
- [ ] Der aktive Modus ist nicht nur farblich gekennzeichnet.
- [ ] Wechsel verändert weder URL noch Browser-History.
- [ ] Editor- und Preview-Scrollposition bleiben getrennt erhalten.

## Direkte Preview-Navigation

- [ ] Hero-Titel öffnet das exakte Feld.
- [ ] Navigationstext öffnet seine Beschriftung und führt keinen Website-Sprung aus.
- [ ] Klangmoment-Titel und Beschreibung führen zu den richtigen Feldern.
- [ ] Mehrfach dargestellte Inhalte wie Name oder Adresse führen zum gleichen Editorfeld.
- [ ] Zurück zur Vorschau stellt die vorherige Position wieder her.
- [ ] Ein inzwischen gelöschtes dynamisches Ziel fällt kontrolliert auf das passende Panel zurück.

## Bildschirmtastatur und Fokus

- [ ] Einzeiliges Feld bleibt nach Tastaturöffnung sichtbar.
- [ ] Textarea bleibt nach Tastaturöffnung sichtbar.
- [ ] Kein wiederholtes Scrollspringen während fortlaufender Eingabe.
- [ ] Fokus bleibt bei Preview-Patches erhalten, solange die Region nicht ersetzt wird.
- [ ] Bei ersetzter Region wird Fokus nach den Fallback-Regeln wiederhergestellt.
- [ ] Funktioniert auch, wenn kein `visualViewport.resize` eintrifft.
- [ ] RAF- beziehungsweise 350-ms-Fallback korrigiert die Position.
- [ ] Schließen der Tastatur hinterlässt keinen falschen dauerhaften Abstand.

## Layout und Safe Areas

- [ ] Keine horizontale Seitenverschiebung bei kleinster Testbreite.
- [ ] Header und Modussteuerung berücksichtigen obere Safe Area.
- [ ] untere Aktionen sind nicht durch Home Indicator oder Browser-Chrome verdeckt.
- [ ] Touch-Ziele sind mindestens 44 × 44 px.
- [ ] lange Feldbeschriftungen und Readiness-Texte bleiben lesbar.
- [ ] Exportübersicht bleibt vollständig scrollbar und bedienbar.

## Verlauf und Sortierung

- [ ] Undo und Redo funktionieren in beiden Modi.
- [ ] Beschriftung nennt die konkrete Aktion.
- [ ] Reorder-Pfeile sind mit Touch erreichbar.
- [ ] Drag startet nur am Handle und blockiert normales Scrollen nicht.
- [ ] Escape beziehungsweise Abbruch hinterlässt keine Mutation, soweit mit externer Tastatur testbar.

## Readiness und Export

- [ ] Readiness-Aktion öffnet das richtige Feld.
- [ ] Status wird nicht ausschließlich farblich vermittelt.
- [ ] erster Exportklick startet keinen direkten Download.
- [ ] Assetfehler zeigt Online-Fallback für die aktuelle Generation.
- [ ] Draft-Änderung während Vorbereitung erzeugt keinen veralteten Ready-Zustand.
- [ ] Downloadhinweis erklärt, dass keine automatische Veröffentlichung stattgefunden hat.

## VoiceOver-Stichprobe

- [ ] Modusbuttons haben verständliche Namen und Zustände.
- [ ] Preview-Ziele werden als Bearbeitungsaktionen angekündigt.
- [ ] Keine verschachtelten oder doppelt angekündigten interaktiven Ziele.
- [ ] Live-Region-Meldungen für Reorder und Navigation sind verständlich.
- [ ] Fokusreihenfolge bleibt nachvollziehbar.

## Dokumentation im PR

Im PR festhalten:

```text
Gerät/Simulator:
iOS-Version:
Safari-Version:
Getestete Breiten:
Ergebnis:
Abweichungen oder bekannte Grenzen:
```

Blockierende Fehler sind Fokusverlust ohne Fallback, verdeckte Eingabefelder, horizontaler Seitenüberlauf, nicht erreichbare Exportaktionen oder eine Preview-Navigation zum falschen Feld.