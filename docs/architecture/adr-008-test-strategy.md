# ADR 008: Verbindliche Teststrategie

Status: Angenommen für die Editor-Roadmap

## Ziel

Die bestehenden Unit-, Browser- und Chromium-Tests werden um drei Testklassen ergänzt, die Zustands- und Nebenläufigkeitsfehler gezielt erkennen: Differentialtests, Sequenztests und Race-Tests.

## Differentialtests

Eine inkrementell aktualisierte Preview muss semantisch demselben DOM entsprechen wie ein vollständiger Neuaufbau desselben aktuellen Drafts.

Ablauf:

1. Default-Draft vollständig rendern.
2. Mutation ausführen.
3. bestehendes DOM über den abgeleiteten Preview-Plan aktualisieren.
4. neuen Draft vollständig frisch rendern.
5. beide DOMs normalisieren.
6. semantisch vergleichen.

Normalisiert werden nur kurzlebige technische Werte:

- Preview-Instanz-ID
- Request-ID
- Revision und Render-Generation
- temporäre Fokus- und Highlight-Klassen
- zeitabhängige Jahreszahl, sofern die Uhr nicht injiziert wird

Nicht entfernt werden:

- Texte
- Reihenfolge
- Links und Linkziele
- ARIA-Attribute
- sichtbarkeits- und layoutrelevante Klassen
- Preview-Zielstruktur

Verbindliche Fälle:

- statisches Feld `present → present`
- `empty → present`
- `present → empty`
- Listenpunkt ändern, einfügen, entfernen und verschieben
- Klangmoment ändern, einfügen, entfernen und verschieben
- Kontaktziel wird gültig oder ungültig
- Theme-Wechsel
- Bereichssichtbarkeit und Bereichsreihenfolge
- Undo und Redo

## Sequenztests

Deterministische, zufallsbasierte Tests erzeugen Folgen aus:

- Feldänderungen
- Add und Remove
- Reorder
- Sichtbarkeit
- Theme
- Undo und Redo

Für jede Folge werden verglichen:

- Store-Endzustand
- Referenzmodell-Endzustand
- Undo-/Redo-Verfügbarkeit
- stabile IDs
- normalisierter Draft
- aktuelle Store- und Preview-Revision

Mindestumfang:

```text
20 feste Seeds × 100 Operationen
```

Fehler müssen über den Seed reproduzierbar sein.

## Race-Tests

Ein Fake-Preview-Transport kann Antworten verzögern, vertauschen, duplizieren, verwerfen oder mit falschen Zuordnungsdaten liefern.

Verbindliche Fälle:

1. Anfrage A läuft in Timeout, während B wartet.
2. A bestätigt verspätet nach einem vollständigen Fallback.
3. eine alte Preview sendet nach Instanzwechsel.
4. Request-ID stimmt, Revision ist jedoch alt.
5. vollständiger Render lädt, während neue Mutationen entstehen.
6. regionale Änderungen werden zusammengeführt.
7. Theme- und Textänderung werden korrekt gebündelt.
8. Strukturänderung verdrängt wartende Text-Patches.
9. Multi-Operation-Vorprüfung scheitert und verändert kein DOM.
10. ältere Exportgeneration beendet nach neuerer Generation.
11. abgebrochener Bildabruf liefert verspätet Fehler oder Daten.

Endbedingung:

> Sichtbare Preview und akzeptierter Export entsprechen immer der jüngsten Store-Revision.

## Policy-Coverage

Jeder statische Feldtyp und jeder dynamische Policy-Zieltyp benötigt:

- Requirement
- Empty-Behavior
- Presence-Auswertung
- Hilfetext oder explizit `null`
- Vollständigkeitsauswertung

Keine Policy darf nur implizit im Renderer existieren.

## Accessibility-Regression

Jeder Interaktions-PR prüft mindestens:

- vollständige Tastaturbedienung
- sichtbaren Fokus
- Fokuswiederherstellung
- Live-Region-Texte
- keine rein farbliche Statuskommunikation
- reduzierte Bewegung
- Touch-Ziele von mindestens 44 × 44 Pixeln, wo Touch primär ist
- keine verschachtelten fokussierbaren Preview-Ziele

## Mobile manuelle Abnahme

PR 6 benötigt zusätzlich zur Chromium-CI eine dokumentierte manuelle Abnahme auf iOS Safari oder einem repräsentativen Simulator. Die Checkliste liegt unter `docs/testing/manual-ios-safari.md`.

Mobile Fokuskorrektur darf nicht ausschließlich auf `visualViewport.resize` warten:

1. Resize-Listener abonnieren.
2. Parallel zwei `requestAnimationFrame`-Zyklen planen.
3. Timeout von 350 ms setzen.
4. erste stabile Messung verwenden.
5. übrige Listener und Timer entfernen.

## CI

Die bestehende Pipeline bleibt maßgeblich:

```text
npm ci
npm run check
git diff --exit-code -- assets
```

PR 0 verändert keine Laufzeitquellen; ab PR 1 werden neue Tests schrittweise in `npm run check` aufgenommen.