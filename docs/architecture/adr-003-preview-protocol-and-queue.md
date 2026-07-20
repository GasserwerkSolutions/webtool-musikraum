# ADR 003: Preview-Protokoll, Queue und Race-Regeln

Status: Angenommen für die Editor-Roadmap

## Kontext

Die aktuelle Vorschau wird vollständig über `iframe.srcdoc` ersetzt. Das künftige inkrementelle Protokoll muss schnelle Eingaben, verspätete Antworten, vollständige Fallback-Renderings und das bewusst sandboxed `srcdoc` ohne `allow-same-origin` korrekt behandeln.

## Sicherheitsgrenze des iframes

Das iframe bleibt:

```html
<iframe sandbox="allow-scripts">
```

Dadurch besitzt das `srcdoc` eine opaque Origin. Der Parent akzeptiert Nachrichten ausschließlich, wenn alle Bedingungen erfüllt sind:

```ts
event.source === previewFrame.contentWindow
event.origin === "null"
```

Zusätzlich werden geprüft:

- Channel
- Protokollversion
- Instanz-ID
- Request-ID, falls die Nachricht eine Anfrage beantwortet
- Revision
- Render-Generation
- Nachrichtentyp und Nutzlast

Die Origin wird nicht auf `*` oder `location.origin` gelockert, solange das iframe ohne `allow-same-origin` sandboxed bleibt.

## Protokollversion

```ts
export const PREVIEW_PROTOCOL_VERSION = 2;
```

Jede Anfrage enthält:

```ts
export type PreviewRequestEnvelope = {
  channel: "musikraum-preview";
  version: 2;
  instanceId: string;
  renderGeneration: number;
  requestId: string;
  baseRevision: number;
  revision: number;
};
```

Jede Antwort enthält dieselben Zuordnungsinformationen:

```ts
export type PreviewResponseEnvelope = {
  channel: "musikraum-preview";
  version: 2;
  instanceId: string;
  renderGeneration: number;
  requestId: string;
  revision: number;
};
```

## Update-Anfrage

```ts
export type PreviewUpdateRequest = PreviewRequestEnvelope & {
  action: "apply-update";
  operations: readonly PreviewOperation[];
};

export type PreviewOperation =
  | {
      type: "patch-text";
      target: PreviewTarget;
      occurrence?: string;
      value: string;
    }
  | {
      type: "replace-region";
      region: PreviewRegion;
      html: string;
    }
  | {
      type: "patch-theme";
      primary: string;
      accent: string;
    };
```

Vollständige Dokumentwechsel erfolgen über neues `srcdoc`, eine neue `instanceId` und eine neue `renderGeneration`, nicht als HTML-Dokument per `postMessage`.

## Atomare Anwendung mehrerer Operationen

Eine Anfrage ist atomar. Vor der ersten DOM-Mutation validiert die Preview-Bridge sämtliche Operationen:

- alle Textziele existieren eindeutig,
- alle Regionen existieren eindeutig,
- Occurrences sind eindeutig, falls angegeben,
- keine Region wird mehrfach widersprüchlich ersetzt,
- kein Text-Patch liegt innerhalb einer gleichzeitig ersetzten Region,
- Theme-Werte sind syntaktisch zulässig,
- HTML-Fragmente besitzen den erwarteten Root für ihre Region,
- `baseRevision` entspricht der aktuellen Preview-Revision,
- `revision` ist neuer als die aktuelle Preview-Revision.

Schlägt die Vorprüfung fehl, wird keine Operation ausgeführt. Die Bridge antwortet mit Fehler; der Parent startet einen vollständigen Fallback.

Die Anwendung erfolgt erst nach erfolgreicher Gesamtvalidierung. Unerwartete Fehler während der Commit-Phase führen ebenfalls zum vollständigen Fallback. Die Commit-Phase darf keine weitere fachliche Validierung enthalten, die bereits vorab hätte scheitern können.

## Revisionsregeln

Die Preview hält `currentRevision`.

Eine Anfrage ist anwendbar, wenn:

```ts
request.baseRevision === currentRevision
&& request.revision > currentRevision
```

Fehlergründe:

- `revision <= currentRevision` → `stale-revision`
- `baseRevision !== currentRevision` → `revision-gap`
- Ziel- oder Operationsfehler → spezifischer Validierungsfehler

Nach atomar erfolgreicher Anwendung wird `currentRevision = request.revision` gesetzt.

## Antwort

```ts
export type PreviewUpdateResult = PreviewResponseEnvelope & {
  action: "update-result";
  success: boolean;
  reason?:
    | "stale-revision"
    | "revision-gap"
    | "unknown-target"
    | "ambiguous-target"
    | "invalid-region"
    | "conflicting-operations"
    | "invalid-operation"
    | "internal-error";
};
```

## Single-Flight-Queue

Der Parent verwendet genau eine aktive Patch-Anfrage:

```ts
export type PreviewQueueState = {
  appliedRevision: number;
  desiredRevision: number;
  inFlight: PreviewInFlightRequest | null;
  pendingMutations: DraftMutation[];
  renderGeneration: number;
};
```

Ablauf:

1. Mutation an `pendingMutations` anhängen.
2. Höchstens 40 ms sammeln.
3. Aus allen wartenden Effekten und dem jüngsten Draft einen Plan ableiten.
4. Nur senden, wenn keine Anfrage aktiv ist.
5. `baseRevision = appliedRevision` und `revision = jüngste gebündelte Revision` setzen.
6. Während der Anfrage neue Mutationen nur sammeln.
7. Nach Erfolg nächste gebündelte Anfrage planen.
8. Bei Fehler oder Timeout vollständigen Fallback für den jüngsten Draft starten.

## Coalescing

Priorität:

1. Draft-Replacement → vollständiges Dokument
2. Bereichsreihenfolge oder -sichtbarkeit → vollständiges Dokument
3. Regionen → eindeutige Vereinigung betroffener Regionen
4. Theme → jüngster Theme-Zustand
5. Text → jüngster Wert je Ziel und Occurrence

Wird eine Region ersetzt, entfallen Text-Patches innerhalb dieser Region.

## Timeout

- Patch-Bestätigung: 350 ms
- `ready` nach vollständigem Render: 2 s

Nach einem `ready`-Timeout wird höchstens ein weiterer vollständiger Render versucht. Es gibt keine Endlosschleife.

## Vollständiger Render

Beim Fallback:

1. aktive Patch-Anfrage ungültig machen,
2. `renderGeneration` erhöhen,
3. neue Instanz-ID erzeugen,
4. jüngsten Draft und jüngste Revision lesen,
5. neues `srcdoc` setzen,
6. auf `ready` warten.

Die Preview meldet:

```ts
export type PreviewReadyMessage = {
  channel: "musikraum-preview";
  version: 2;
  action: "ready";
  instanceId: string;
  renderGeneration: number;
  revision: number;
};
```

Während des Ladens werden neue Mutationen gesammelt. Nach `ready` wird sofort nachgepatcht, falls `desiredRevision > ready.revision`.

## Veraltete Antworten

Eine Nachricht wird ignoriert, wenn:

- Instanz-ID nicht aktiv ist,
- Render-Generation nicht aktiv ist,
- Request-ID nicht zur aktiven Anfrage gehört,
- Anfrage bereits abgelaufen oder ersetzt wurde,
- Revision älter als erwartet ist,
- `event.source` oder opaque Origin nicht stimmen.

Ein älterer Patch oder Fallback kann dadurch niemals einen neueren Draft überschreiben.

## Fokus und UI-Zustand

### Nicht betroffene Region

Fokus bleibt natürlich bestehen; es wird kein Fokusaufruf ausgeführt.

### Betroffene Region

Vor Austausch werden Ziel, Occurrence und soweit relevant Auswahlzustand erfasst. Danach:

1. gleiches Ziel und gleiche Occurrence suchen,
2. Fokus und Auswahl wiederherstellen,
3. falls Ziel fehlt, Region mit temporärem `tabindex=-1` fokussieren,
4. falls Region fehlt, definierten Main- oder Header-Fallback fokussieren.

Hover wird nicht künstlich konserviert. Die aktuelle Pointerposition bestimmt ihn neu.

### Mobile Navigation

Wird der Header nicht ersetzt, bleibt sein Zustand bestehen. Bei Header-Ersatz wird der Öffnungszustand nur wiederhergestellt, wenn Menüknopf, Navigationseinträge und mobiler Breakpoint weiter bestehen. Sonst wird geschlossen; fehlt der frühere Fokuspunkt, erhält der Menüknopf Fokus.

## Konsequenzen

- Keine parallelen Patch-Races.
- Keine partiell akzeptierten Multi-Operation-Updates.
- Opaque-Origin-Sandbox bleibt Sicherheitsgrenze.
- Request, Revision und Render-Generation machen Antworten eindeutig.
- PR 3 implementiert Queue, Bridge, atomare Vorprüfung und Fallback.