# ADR 004: Inhalts- und Render-Policies

Status: Angenommen für die Editor-Roadmap

## Kontext

Inhaltsregeln gelten nicht nur für statische `site.*`- und `copy.*`-Felder, sondern auch für Listenpunkte, Klangmomente, Collections und ganze Bereiche. Zusätzlich sind fachliche Erforderlichkeit und sichtbares Verhalten bei Leere zwei getrennte Dimensionen.

## Allgemeiner Zieltyp

```ts
export type ContentPolicyTarget =
  | { kind: "field"; field: StaticEditableField }
  | { kind: "text-item"; list: TextListKey; itemId: string }
  | { kind: "offer"; offerId: string; field: "title" | "text" }
  | { kind: "collection"; collection: ContentCollection }
  | { kind: "section"; section: SectionKey };
```

Policy-Funktionen dürfen nicht auf statische Felder beschränkt sein.

## Orthogonale Policy-Dimensionen

```ts
export type ContentRequirement = "required" | "recommended" | "optional";

export type EmptyRenderBehavior =
  | "omit-node"
  | "omit-container"
  | "keep-structure"
  | "conditional";

export type ContentPolicy = {
  requirement: ContentRequirement;
  emptyBehavior: EmptyRenderBehavior;
  technicalFallback?: string;
  helpText?: string;
};
```

`required` bedeutet nicht, dass ein leeres sichtbares Element ausgegeben werden muss. Erforderlichkeit wird durch Vollständigkeit und Readiness bewertet; das Renderverhalten wird separat festgelegt.

## Öffentliche Funktionen

```ts
resolveContentPolicy(target, draft): ContentPolicy
contentPresence(target, draft): ContentPresence
shouldRenderContent(target, draft): boolean
contentHelpText(target, draft): string | null
```

Alle Funktionen sind rein und werden von Editor, Renderer, Übersicht, Readiness und Tests verwendet.

## Erforderliche, aber leere Inhalte

Beispiel Hero-Haupttitel:

```ts
{
  requirement: "required",
  emptyBehavior: "omit-node"
}
```

Bei leerem Titel gilt:

- kein leeres `<h1>` in der öffentlichen Website,
- kein künstlicher sichtbarer Platzhalter,
- der Hero-Bereich darf strukturell bestehen bleiben,
- Vollständigkeit ist `incomplete`,
- Readiness erzeugt später einen Fehler.

## Dynamische Inhalte

### Hero- und Intro-Punkte

- einzelner leerer Punkt: `omit-node`
- leere Collection: `omit-container`
- Collection fachlich optional
- IDs bleiben für Editor und History stabil, auch wenn ein leerer Eintrag öffentlich nicht gerendert wird

### Klangmomente

- leerer Titel: gesamte Karte `omit-container`
- leere Beschreibung bei vorhandenem Titel: nur Beschreibung `omit-node`
- leere Collection: Kartenraster `omit-container`
- kein öffentlicher Text wie „Weitere Angaben folgen“

### Bereiche

- ausgeblendet: gesamter Bereich entfällt
- sichtbar, aber fachlich leer: Einzelpolicies bestimmen das DOM; Vollständigkeit und Readiness melden den Zustand intern

## Zielabhängige Inhalte

CTA-Elemente verwenden `conditional`. Ein Knopf wird nur gerendert, wenn Beschriftung und gültiges Ziel gemeinsam vorhanden sind.

Beispiele:

- E-Mail-CTA: gültige normalisierte E-Mail plus Beschriftung
- Telefon-CTA: normalisierbare Telefonnummer plus sichtbare Beschriftung
- Instagram-CTA: gültiger Instagram-Link plus Beschriftung
- Hero-CTA: sichtbares gültiges Abschnittsziel plus Beschriftung

## Technische Fallbacks

`technicalFallback` darf nur für nicht sichtbare technische Zwecke verwendet werden, zum Beispiel:

- Dokumenttitel
- Exportdateiname
- Schema-Metadaten

Technische Fallbacks dürfen niemals als öffentlicher Website-Text erscheinen.

## Registry-Verantwortung

Die zentrale Editor-Registry verweist für statische Felder auf ihre Policy. Dynamische Policy-Auflösung erfolgt anhand von Zieltyp, Collection und Draft-Zustand. Der Renderer darf keine voneinander abweichenden Leerregeln direkt in einzelnen Branches erfinden.

## Konsequenzen

- Statische und dynamische Inhalte teilen dieselbe Policy-Sprache.
- Erforderlichkeit und Rendering bleiben widerspruchsfrei.
- Leere Inhalte erzeugen weder leere semantische Knoten noch öffentliche Systemtexte.
- PR 1 implementiert Registry, Policy-Auflösung und Vollständigkeitsbasis.