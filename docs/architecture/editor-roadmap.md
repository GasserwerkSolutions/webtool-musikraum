# Editor-Roadmap nach PR 0

## Zielbild

Der Musikraum-Editor wird als ein konsistentes System weiterentwickelt. Verlauf, Preview, Inhaltsübersicht, Readiness, Export und mobile Bedienung verwenden gemeinsame Verträge statt paralleler Taxonomien.

## Verbindliche Architektur

Alle Folge-PRs beziehen sich auf:

1. [ADR 001: Draft-Mutationen und Revisionen](./adr-001-draft-mutations-and-revisions.md)
2. [ADR 002: Verlauf und inverse Effekte](./adr-002-history-semantics.md)
3. [ADR 003: Preview-Protokoll, Queue und Race-Regeln](./adr-003-preview-protocol-and-queue.md)
4. [ADR 004: Inhalts- und Render-Policies](./adr-004-content-policies.md)
5. [ADR 005: Vollständigkeit und Readiness](./adr-005-completeness-and-readiness.md)
6. [ADR 006: Sichere Export-Generation](./adr-006-export-generation.md)
7. [ADR 007: Preview-Ziele und Interaktionspriorität](./adr-007-preview-interaction-targets.md)
8. [ADR 008: Verbindliche Teststrategie](./adr-008-test-strategy.md)

Kein Folge-PR darf ein zweites kanonisches Mutationsmodell, eine zeitstempelbasierte Laufzeitrevision oder eine unabhängige Zielnavigation einführen.

## Abhängigkeiten

```text
PR 0 – Architekturverträge
  │
  ▼
PR 1 – Registry, Policies, Revisionen und Verlauf
  │
  ▼
PR 2 – Einheitliche Sortierung
  │
  ▼
PR 3 – Revisionssicheres Preview-Protokoll
  │
  ▼
PR 4 – Inhaltsübersicht und direkte Bearbeitung
  │
  ▼
PR 5 – Readiness und Export-Preflight
  │
  ▼
PR 6 – Mobile Bearbeiten/Vorschau-Modi
```

PR 2 ist Integrationsvoraussetzung für PR 3, weil das Preview-Protokoll alle Reorder-Effekte von Beginn an unterstützen muss. PR 5 benötigt die generalisierte Zielnavigation aus PR 4. PR 6 integriert die endgültigen Readiness- und Exportoberflächen aus PR 5.

---

# PR 1: Registry, Policies, Revisionen und Verlauf

Branch: `feature/editor-registry-history-policies`

## Implementiert

- zentrale Editor-Registry
- allgemeine `ContentPolicyTarget`-Policies
- `ContentCompleteness`
- monotone Store-Revision
- Intent-basierte Store-Schnittstelle
- zentrale Effect-Factory nach Normalisierung
- No-op-Vergleich ohne `updatedAt`
- HistoryRecords mit eindeutiger Transition-Semantik
- `invertDraftEffect`
- `flushHistoryGroup()`
- beschreibende Undo-/Redo-Aktionen

## Muss nachweisen

- Aufrufer kann keinen falschen Effekt einschleusen.
- Undo emittiert inverse Collection-, Visibility-, Presence- und Move-Effekte.
- Redo emittiert verifizierte Vorwärtseffekte.
- dynamische und statische Inhalte besitzen Policies.
- leere öffentliche Inhalte erzeugen keine Systemplatzhalter.
- bestehende Draft-Sicherungen bleiben kompatibel.

---

# PR 2: Einheitliche Sortierung

Branch: `feature/unified-content-reordering`

## Implementiert

- gemeinsamer Reorder-Kern für Hero-Punkte, Intro-Punkte, Klangmomente und Bereiche
- Pfeilknöpfe als primäre barrierefreie Steuerung
- `Alt + Pfeil hoch/runter`
- optionale Pointer-Drag-Bedienung am Handle
- stabile Fokus- und Live-Region-Rückmeldung

## Effekte

- `collection-move`
- `section-move`

Drag erzeugt erst beim Abschluss eine Mutation. Abbruch erzeugt weder Revision noch History.

---

# PR 3: Revisionssicheres Preview-Protokoll

Branch: `feature/incremental-preview-protocol`

## Implementiert

- Protokollversion 2
- opaque-origin- und Source-Prüfung
- Request-ID, Revision und Render-Generation
- Single-Flight-Queue
- 40-ms-Coalescing
- atomare Vorprüfung aller Multi-Operation-Updates
- 350-ms-Patch-Timeout
- 2-s-Ready-Timeout
- vollständiger Fallback für jüngsten Draft
- Fokuswiederherstellung in ersetzten Regionen
- regionaler Renderer und Theme-Patches

## Muss nachweisen

- keine partielle DOM-Aktualisierung bei Validierungsfehlern
- verspätete Antworten können keinen neueren Stand überschreiben
- gepatchte Preview entspricht vollständigem Neuaufbau
- Reorder-Effekte aus PR 2 sind vollständig unterstützt
- Export bleibt frei von Preview-Protokollbestandteilen

---

# PR 4: Inhaltsübersicht und direkte Bearbeitung

Branch: `feature/content-overview-direct-editing`

## Implementiert

- Übersicht mit `complete`, `optional-empty`, `incomplete`, `hidden`
- genau eine Zielnavigation für Preview, Übersicht, später Readiness und History
- vollständige Preview-Zielabdeckung
- Occurrence-Kennungen für Mehrfachdarstellungen
- keine verschachtelten fokussierbaren Ziele
- definierte Ereignispriorität

## Nicht enthalten

- keine Readiness-Schweregrade
- kein `contenteditable`
- keine künstlichen Platzhalter für leere Inhalte

---

# PR 5: Readiness und Export-Preflight

Branch: `feature/readiness-export-preflight`

## Implementiert

- Regeln mit `readonly ReadinessResult[]`
- stabile dynamische Ergebnis-IDs
- deterministische Sortierung
- getrennte Zustände `ready` und `clean`
- anklickbare Ergebnisse über bestehende Zielnavigation
- Export-Generation und Store-Revision
- AbortController, Ruhefenster und veraltete Ergebnisunterdrückung
- 8-s-Timeout, 5-MiB-Grenze und MIME-Allowlist
- klare Trennung Assetfehler versus Generationsabbruch
- bewusster Download erst nach Preflight

## Muss nachweisen

- ältere Generation kann keine neuere überschreiben
- Generationsabbruch erzeugt keinen Fallback-Export
- Assetfehler darf aktuelle Generation mit Online-Bildquelle abschließen
- vorbereitete Daten werden bei Mutation ungültig

---

# PR 6: Mobile Bearbeiten/Vorschau-Modi

Branch: `feature/mobile-editor-modes`

## Implementiert

- getrennte Modi Bearbeiten und Vorschau bis 700 px
- getrennte Scrollzustände
- Wechsel von Preview-Ziel zu exaktem Feld
- Rückkehr zur vorherigen Preview-Position
- Fokuskorrektur mit `visualViewport`, RAF und 350-ms-Fallback
- Integration von Übersicht, Readiness und Export
- Touch-Ziele von mindestens 44 × 44 px

## Abnahme

Zusätzlich zur CI ist die Checkliste unter `../testing/manual-ios-safari.md` auszufüllen und im PR zu dokumentieren.

---

# Gemeinsame Definition of Done

Jeder PR:

- beginnt auf einem neuen Branch vom aktuellen `main`,
- verändert primär TypeScript unter `src/`,
- committet synchronisierte Browsermodule unter `assets/`,
- erhält bestehende Sicherungen, sofern keine ausdrücklich dokumentierte Migration nötig ist,
- ergänzt Unit-, Browser- und Chromium-Tests,
- prüft Tastatur, Fokus, reduzierte Bewegung und zugängliche Namen,
- führt `npm run check` erfolgreich aus,
- hinterlässt nach dem Build keinen Diff unter `assets/`,
- wird erst bei vollständig grüner Builder-CI gemergt.

# Architekturverbote

Nach PR 0 gelten verbindlich:

- kein zweites Mutationsmodell
- keine Laufzeitrevision über `updatedAt`
- kein ungeprüfter kanonischer Effekt vom UI-Aufrufer
- kein Undo mit unverändertem Vorwärtseffekt
- keine parallelen Preview-Patch-Anfragen
- keine nicht atomaren Multi-Operation-Updates
- keine Lockerung der opaque-origin-Prüfung
- keine Policy ausschließlich im Renderer
- keine Readiness-Regel mit nur einem möglichen Ergebnis
- kein Export-Ready nach Generationsabbruch
- keine verschachtelten fokussierbaren Preview-Ziele
- keine mobile Fokuslogik ausschließlich über `visualViewport.resize`