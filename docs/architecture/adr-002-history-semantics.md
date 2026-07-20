# ADR 002: Verlauf und inverse Effekte

Status: Angenommen für die Editor-Roadmap

## Kontext

Undo- und Redo-Beschriftungen müssen eindeutig erklären, welche fachliche Aktion zurückgenommen oder wiederhergestellt wird. Gleichzeitig muss jedes emittierte `DraftMutation`-Ereignis die tatsächlich stattfindende Änderung beschreiben. Der ursprüngliche Effekt kann deshalb beim Undo nicht unverändert wiederverwendet werden.

## History-Semantik

Ein Eintrag beschreibt immer die Transition vom gespeicherten `before`-Snapshot zum daraus entstandenen Zustand:

```ts
export type HistoryRecord = {
  before: MusicraumDraft;
  effect: DraftEffect;
  history: HistoryDescriptor;
  createdAt: number;
};

export type HistoryDescriptor = {
  key?: string;
  label: string;
  target?: PreviewTarget;
};
```

`history.label` benennt die fachliche Vorwärtsaktion, beispielsweise `Haupttitel geändert` oder `Klangmoment verschoben`. Die UI formuliert die Richtung:

- `Rückgängig: Haupttitel geändert`
- `Wiederholen: Haupttitel geändert`

## Undo

Beim Undo:

1. aktuellem Zustand und HistoryRecord einen Redo-Eintrag zuordnen,
2. `before` als neuen Draft aktivieren,
3. neue Store-Revision erzeugen,
4. `invertDraftEffect(record.effect)` als tatsächlichen Effekt emittieren,
5. Quelle `undo` verwenden,
6. fachliche History-Beschreibung unverändert erhalten.

```ts
export function invertDraftEffect(effect: DraftEffect): DraftEffect;
```

Verbindliche Invertierungen:

- `collection-insert` → `collection-remove`
- `collection-remove` → `collection-insert`
- `collection-move(a → b)` → `collection-move(b → a)`
- `section-move(a → b)` → `section-move(b → a)`
- `section-visibility(previous, next)` → `section-visibility(next, previous)`
- `field-set(previousPresence, nextPresence)` → vertauschte Presence-Werte
- `text-item-set` und `offer-field-set` analog
- `theme-set` wird über Before-/After-Snapshots zu einem verifizierten inversen Theme-Effekt aufgebaut
- `draft-replace` wird nicht über eine pauschale Invertierung beschrieben; Import, Reset und Recovery löschen weiterhin die bestehende History

## Redo

Beim Redo wird der ursprüngliche Vorwärtseffekt erneut aus dem gespeicherten Before-/After-Paar verifiziert und mit Quelle `redo` emittiert. Der Store verwendet nicht blind ein veraltetes Effektobjekt.

## Gruppierung

Texteingaben werden nur gruppiert, wenn:

- `history.key` identisch ist,
- beide Intents denselben Inhalt betreffen,
- weniger als 900 ms vergangen sind,
- die Gruppe nicht explizit beendet wurde.

Der Store stellt bereit:

```ts
flushHistoryGroup(): void;
```

Die UI ruft diese Methode auf:

- bei Fokuswechsel zu einem anderen gebundenen Feld,
- vor Add, Remove oder Reorder,
- vor Sichtbarkeits- oder Theme-Änderungen,
- vor Undo und Redo,
- vor Import und Reset,
- bei Abschluss einer Eingabegruppe.

Der Store versucht nicht, DOM-Fokus selbst zu beobachten.

## Öffentliche History-Schnittstelle

```ts
get nextUndoAction(): HistoryDescriptor | null;
get nextRedoAction(): HistoryDescriptor | null;
undo(): DraftMutation | null;
redo(): DraftMutation | null;
```

History-Listener erhalten Verfügbarkeit, nächste Aktionen und höchstens fünf informative letzte Aktionen. Ein beliebiger Sprung in ältere Zustände ist nicht Teil der Roadmap.

## Konsequenzen

- Undo-/Redo-Texte bleiben semantisch korrekt.
- Preview und Readiness sehen beim Undo die tatsächliche inverse Änderung.
- Fokuswechsel beendet Gruppen ausdrücklich und reproduzierbar.
- Import, Reset und Recovery erzeugen keine irreführende rückführbare History.