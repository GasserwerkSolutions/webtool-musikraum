# ADR 001: Draft-Mutationen und Revisionen

Status: Angenommen für die Editor-Roadmap

## Kontext

Der aktuelle `BuilderStore` speichert Draft-Snapshots und einen optionalen History-Key. Für Verlauf, inkrementelle Vorschau, Readiness und Export wird ein gemeinsames, überprüfbares Änderungsmodell benötigt. Aufrufer dürfen den kanonischen Effekt nicht ungeprüft behaupten, weil Normalisierung, Validierung oder ein No-op zu einem anderen tatsächlichen Ergebnis führen können.

## Entscheidung

Es gibt genau ein kanonisches Mutationsereignis:

```ts
export type DraftMutation = {
  revision: number;
  source: DraftMutationSource;
  effect: DraftEffect;
  history: HistoryDescriptor;
  occurredAt: number;
};

export type DraftMutationSource =
  | "user"
  | "undo"
  | "redo"
  | "import"
  | "reset"
  | "recovery";
```

Store-Subscriber erhalten den aktuellen Draft und das Ereignis gemeinsam:

```ts
export type DraftMutationEvent = {
  draft: Readonly<MusicraumDraft>;
  mutation: DraftMutation;
};
```

Daneben gibt es kein zweites kanonisches `DraftChange`- oder Preview-Änderungsmodell. Preview, Readiness und Export leiten Ausführungspläne aus `DraftEffect` ab.

## Monotone Store-Revision

Der Store hält eine sitzungsbezogene Revision. Sie beginnt bei `0` und steigt bei jedem tatsächlich angenommenen Zustandswechsel genau um eins:

- Benutzereingabe
- Einfügen, Entfernen und Verschieben
- Bereichssichtbarkeit und Bereichsreihenfolge
- Theme-Änderung
- Undo und Redo
- Import, Reset und Recovery

Keine Revision entsteht bei Fokuswechseln, Panelwechseln, Preview-Scrollmeldungen, Exportvorbereitungen oder No-ops. Revisionen werden nicht im Draft und nicht in Sicherungen gespeichert.

## Intent statt ungeprüftem Effekt

Aufrufer übergeben eine fachliche Absicht:

```ts
export type DraftMutationDescriptor = {
  intent: DraftMutationIntent;
  history: HistoryDescriptor;
};
```

Beispiele für Intents:

```ts
export type DraftMutationIntent =
  | { type: "set-field"; field: StaticEditableField }
  | { type: "set-text-item"; list: TextListKey; itemId: string }
  | { type: "set-offer-field"; offerId: string; field: "title" | "text" }
  | { type: "insert-collection-item"; collection: ContentCollection; itemId: string }
  | { type: "remove-collection-item"; collection: ContentCollection; itemId: string }
  | { type: "move-collection-item"; collection: ContentCollection; itemId: string }
  | { type: "set-section-visibility"; section: SectionKey }
  | { type: "move-section"; section: SectionKey }
  | { type: "set-theme" }
  | { type: "replace-draft"; reason: "import" | "reset" | "recovery" };
```

Der Store-Ablauf ist verbindlich:

1. Before-Snapshot erstellen.
2. Mutator auf einen Arbeits-Draft anwenden.
3. Arbeits-Draft normalisieren.
4. Before und After ohne `updatedAt` vergleichen.
5. Bei No-op abbrechen: keine Revision, keine History, keine Speicherung.
6. Intent gegen Before und After validieren.
7. Über eine zentrale Effect-Factory den tatsächlichen Effekt erzeugen.
8. Erst danach `updatedAt`, Revision, History, Event und Persistierung schreiben.

`updatedAt` darf die No-op-Erkennung nicht beeinflussen.

## Kanonische Effekte

```ts
export type ContentCollection = "heroPoints" | "introPoints" | "offers";
export type ContentPresence = "empty" | "present" | "invalid";

export type DraftEffect =
  | {
      type: "field-set";
      field: StaticEditableField;
      previousPresence: ContentPresence;
      nextPresence: ContentPresence;
    }
  | {
      type: "text-item-set";
      list: TextListKey;
      itemId: string;
      previousPresence: ContentPresence;
      nextPresence: ContentPresence;
    }
  | {
      type: "offer-field-set";
      offerId: string;
      field: "title" | "text";
      previousPresence: ContentPresence;
      nextPresence: ContentPresence;
    }
  | {
      type: "collection-insert";
      collection: ContentCollection;
      itemId: string;
      index: number;
    }
  | {
      type: "collection-remove";
      collection: ContentCollection;
      itemId: string;
      previousIndex: number;
    }
  | {
      type: "collection-move";
      collection: ContentCollection;
      itemId: string;
      previousIndex: number;
      nextIndex: number;
    }
  | {
      type: "section-visibility";
      section: SectionKey;
      previousVisible: boolean;
      nextVisible: boolean;
    }
  | {
      type: "section-move";
      section: SectionKey;
      previousIndex: number;
      nextIndex: number;
    }
  | {
      type: "theme-set";
      changed: readonly ("preset" | "primary" | "accent")[];
    }
  | {
      type: "draft-replace";
      reason: "import" | "reset" | "recovery";
    };
```

Die Effect-Factory muss prüfen, dass IDs existieren, Indizes den tatsächlichen Before-/After-Zuständen entsprechen und die angegebene Intent-Kategorie zur Änderung passt. Bei einer nicht eindeutig beschreibbaren Änderung wird ein Entwicklungsfehler ausgelöst; es wird kein irreführendes Ereignis emittiert.

## Abgeleitete Pläne

Domänenspezifische Pläne sind erlaubt, aber nicht kanonisch:

```ts
derivePreviewImpact(effect, draft)
deriveReadinessImpact(effect)
deriveExportImpact(effect)
deriveHistoryGrouping(effect)
```

Sie dürfen keine zusätzliche Wahrheit über die Änderung erfinden.

## Konsequenzen

- Alle Laufzeitsysteme beziehen sich auf dieselbe Revision und denselben verifizierten Effekt.
- Normalisierung kann nicht durch falsche Aufrufermetadaten übergangen werden.
- No-ops erzeugen weder History noch Preview- oder Exportarbeit.
- PR 1 implementiert Store, Intent-Validierung und Effect-Factory.