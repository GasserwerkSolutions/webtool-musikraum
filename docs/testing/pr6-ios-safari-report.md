# PR 6: iOS-Safari-Abnahme

Status: **Manuelle Geräteabnahme vor dem Merge ausstehend**

Die automatisierten Tests decken die strukturellen Verträge bei 390 px und 320 px in Chromium ab: Modustrennung, `inert`/`aria-hidden`, getrennte Scrollzustände, direkte Zielnavigation, 350-ms-Fokusfallback, Safe-Area-CSS, horizontale Überläufe und Touch-Ziele. Sie ersetzen die verbindliche Safari-Geräteprüfung nicht.

## Testumgebung

```text
Gerät/Simulator: ausstehend
 iOS-Version: ausstehend
 Safari-Version: ausstehend
 Getestete Breiten: 390 px und 320/360 px erforderlich
 Ergebnis: ausstehend
 Abweichungen oder bekannte Grenzen: keine vor der manuellen Prüfung bestätigt
```

## Verbindliche Checkliste

Die vollständige Checkliste befindet sich in [`manual-ios-safari.md`](./manual-ios-safari.md). Vor dem Merge müssen dort insbesondere folgende blockierenden Punkte auf einem Gerät oder Simulator bestätigt werden:

- Bearbeiten/Vorschau mit jeweils einer Aktion erreichbar
- getrennte Editor- und Preview-Scrollpositionen
- exakte Rückkehr von Preview-Zielen zum Editorfeld und zurück zur Preview-Position
- sichtbares einzeiliges Feld und Textarea bei geöffneter Bildschirmtastatur
- Fokuskorrektur mit und ohne `visualViewport.resize`
- kein horizontaler Überlauf bei kleinster Testbreite
- Safe Areas oben und unten berücksichtigt
- alle Touch-Ziele mindestens 44 × 44 px
- Readiness- und Exportaktionen vollständig erreichbar
- VoiceOver-Stichprobe ohne doppelte oder verschachtelte Ziele

Der Pull Request bleibt bis zur dokumentierten manuellen Abnahme als Draft geöffnet.
