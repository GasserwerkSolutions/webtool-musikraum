# Mobile-UX-Roadmap: Von „funktioniert" zu „komfortabel"

Stand: nach PR 6 (Mobile Bearbeiten/Vorschau-Modi). Die Modi, getrennten
Scrollzustände, die Zielnavigation aus der Vorschau und die 44-px-Touch-Ziele
sind umgesetzt. Dieses Dokument plant den Ausbau zur wirklich angenehmen
Bedienung mit einer Hand auf dem Telefon.

## Zielbild

Franz bearbeitet die Website unterwegs auf seinem Android-Telefon, ohne zu suchen, ohne
Präzisionsarbeit mit den Fingern und ohne den Überblick zu verlieren. Die
wichtigsten Aktionen liegen im Daumenbereich (unten), die Bildschirmtastatur
verdeckt nie das aktive Feld, und jeder Schritt sagt selbst, wie es weitergeht.

## Ist-Analyse: konkrete Schmerzpunkte

1. **Bereichs-Navigation**: 8 Schritte als horizontal scrollende Leiste unter
   der Topbar. Nicht alle Schritte sind gleichzeitig sichtbar, die Beschriftung
   ist klein, und die Leiste liegt oben — ausserhalb des Daumenbereichs.
2. **Topbar überladen**: Der Viewport-Umschalter (Desktop/Tablet/Mobile) ist
   auf dem Telefon wirkungslos, weil die Vorschau ohnehin die volle Breite
   nutzt. Er verdrängt Undo/Redo und Export in einen horizontalen Scrollbereich —
   unsichtbare Aktionen sind für Franz nicht vorhanden.
3. **Lange Formular-Panels**: „Inhalte" enthält drei volle Fieldsets
   untereinander; „Klangmomente" bis zu zwölf komplette Karten. Auf 390 px
   bedeutet das viel blindes Scrollen ohne Orientierung.
4. **Modusleiste vs. Bildschirmtastatur**: Bei geöffneter Tastatur kann die
   fixe untere Leiste auf iOS über dem Inhalt schweben oder wertvolle Höhe
   kosten, obwohl sie während des Tippens nie gebraucht wird.
5. **Kein geführter Fluss**: Am Ende eines Panels endet die Seite. Der nächste
   Schritt erfordert Hochscrollen und Treffen des kleinen Nav-Eintrags.
6. **Erstkontakt**: Nichts erklärt die neue Modusleiste. Wer das Werkzeug vom
   Desktop kennt, sucht die Vorschau zunächst vergeblich.

## Phase M1 — Sofortkomfort (kleine PRs, hoher Effekt)

- **M1.1 Viewport-Umschalter mobil ausblenden.** Unter 700 px verschwindet die
  Gerätewahl aus der Topbar; die Vorschau ist immer „Telefonbreite". Die frei
  werdende Fläche macht Undo/Redo und Export ohne Scrollen sichtbar.
- **M1.2 Modusleiste bei offener Tastatur ausblenden.** `focusin`/`focusout`
  auf Eingabefelder plus `visualViewport`-Höhenvergleich (mit RAF- und
  Timeout-Fallback, analog zur bestehenden Fokuskorrektur — nie nur
  `visualViewport.resize`). Zusätzlich eine Baseline über `window.innerHeight`,
  weil älteres Android Chrome (vor Version 108) bei offener Tastatur den
  Layout-Viewport statt nur den visuellen Viewport verkleinert. Die Leiste
  kehrt beim Schliessen der Tastatur zurück.
- **M1.3 Auto-Zoom absichern.** Eingaben erben heute 16 px über `font: inherit`;
  das wird explizit festgeschrieben (`font-size: 16px` für `input`, `textarea`,
  `select` unter 700 px), damit iOS Safari beim Fokussieren nie automatisch
  zoomt (auf Android wirkungslos, aber unschädlich).
- **M1.4 Einmaliger Hinweis beim ersten mobilen Start.** Ein Toast oder eine
  kleine Karte: „Unten wechselst du zwischen Bearbeiten und Vorschau." Gemerkt
  per localStorage-Flag, nie wieder gezeigt.

## Phase M2 — Navigation in den Daumenbereich

- **M2.1 Bereichs-Sheet statt Scroll-Leiste.** Die Modusleiste erhält einen
  dritten Knopf „Bereiche". Er öffnet ein Bottom-Sheet mit allen 8 Schritten in
  voller Breite, jeweils mit Status aus der bestehenden Vollständigkeits- bzw.
  Readiness-Logik (vollständig / optional leer / unvollständig / Blocker). Das
  Sheet nutzt die vorhandene Zielnavigation; die obere Leiste entfällt unter
  700 px. Fokusfalle und `inert` für den Hintergrund wie bei den Modi.
- **M2.2 Geführter Fluss.** Am Ende jedes Panels stehen grosse Knöpfe
  „← Vorheriger Bereich" / „Nächster Bereich →" mit Namen des Ziels und der
  Schrittanzeige („Schritt 3 von 8"). Kein Suchen, kein Hochscrollen.

## Phase M3 — Formulare entzerren

- **M3.1 Einklappbare Gruppen im Panel „Inhalte".** Die drei Fieldsets
  (Über Franz / Frei spielen / Geschichte) werden unter 700 px zu
  Accordions (`<details>`-Semantik oder Button + `aria-expanded`); geöffnet
  wird genau die Gruppe, auf die eine Zielnavigation zeigt.
- **M3.2 Kompakte Klangmoment-Karten.** Zusammengeklappt: Nummer, Titel,
  Statuszeile; Bearbeiten klappt die Karte auf. Zielnavigation öffnet die
  richtige Karte automatisch. Reorder-Pfeile bleiben im zusammengeklappten
  Zustand bedienbar.
- **M3.3 „Hinzufügen" immer erreichbar.** Die Knöpfe „Punkt hinzufügen" und
  „Klangmoment hinzufügen" werden innerhalb ihres Panels sticky am unteren
  Rand (oberhalb der Modusleiste), statt nur am Listenkopf zu stehen.

## Phase M4 — Vorschau-Feinschliff

- **M4.1 Topbar-Auto-Hide im Vorschau-Modus.** Beim Scrollen in der Vorschau
  darf die Topbar einfahren (Querformat gewinnt spürbar Höhe); Antippen des
  oberen Rands oder Moduswechsel holt sie zurück. Reduzierte Bewegung wird
  respektiert.
- **M4.2 Vorschau-Hinweis für Direktbearbeitung.** Beim ersten Wechsel in die
  Vorschau eine dezente, einmalige Einblendung: „Tippe auf einen Text, um ihn
  zu bearbeiten."

## Bewusst nicht geplant

- Wischgesten für Undo/Redo oder Bereichswechsel (Konflikt mit Scrollen,
  schlecht entdeckbar, VoiceOver-feindlich).
- Eine eigene Mobile-Ansicht mit zweitem Markup (Architekturverbot: ein
  Werkzeug, ein DOM, gemeinsame Verträge).
- `contenteditable` in der Vorschau (bereits in ADR 007 ausgeschlossen).

## Reihenfolge und Abhängigkeiten

```text
M1.1–M1.4  unabhängig, sofort umsetzbar (ein Sammel-PR)
   │
   ▼
M2.1  Bereichs-Sheet  ──►  M2.2 geführter Fluss (teilt Schritt-Metadaten)
   │
   ▼
M3.1–M3.3  Formulare (nutzt Zielnavigation → offene Gruppe/Karte)
   │
   ▼
M4.1–M4.2  Feinschliff
```

## Definition of Done je Phase

Wie in der Editor-Roadmap: TypeScript unter `src/`, synchronisierte Module
unter `assets/`, Unit- plus Chromium-Tests (390 px Viewport), Tastatur- und
`inert`-Prüfung, `npm run check` grün, kein Diff unter `assets/` nach Build.
Zusätzlich pro Phase:

- M1: Chromium-Test „Tastatur offen → Modusleiste unsichtbar, Feld sichtbar".
- M2: Sheet-Fokusfalle, Escape schliesst, Status stimmt mit Readiness überein.
- M3: Zielnavigation öffnet die richtige Gruppe/Karte, Reorder bleibt bedienbar.
- M4: Auto-Hide deaktiviert sich bei `prefers-reduced-motion`.

## Wichtigste Abnahme

Das Werkzeug hat genau einen Nutzer, und Franz nutzt ein Android-Telefon mit
Chrome. Nach Phase M1 und M2 je ein kurzer Praxistest auf seinem Gerät
(15 Minuten, drei Aufgaben: Text ändern, Klangmoment umsortieren, Export
starten). Was ihn dort stolpern lässt, schlägt jede Heuristik in diesem
Dokument und wird vor der nächsten Phase behoben. Massgeblich ist die
Checkliste `../testing/manual-android-chrome.md`; die iOS-Checkliste
`../testing/manual-ios-safari.md` bleibt für die exportierte Website wichtig,
weil deren Besucherinnen und Besucher auch iPhones verwenden.
