# ADR 005: Vollständigkeit und Readiness

Status: Angenommen für die Editor-Roadmap

## Kontext

Die Inhaltsübersicht benötigt einfache Zustände, bevor die spätere qualitative Readiness-Regelmaschine existiert. Gleichzeitig müssen einzelne Readiness-Regeln mehrere unabhängige Probleme liefern können. Beide Konzepte werden deshalb getrennt.

## Content Completeness

Die Übersicht verwendet ausschließlich:

```ts
export type ContentCompleteness =
  | "complete"
  | "optional-empty"
  | "incomplete"
  | "hidden";
```

```ts
evaluateContentCompleteness(
  target: ContentPolicyTarget,
  draft: Readonly<MusicraumDraft>
): ContentCompleteness;
```

Bedeutung:

- `complete`: Policy-Anforderungen des Ziels sind erfüllt
- `optional-empty`: fachlich optional und leer
- `incomplete`: required oder recommended, aber nicht ausreichend vorhanden
- `hidden`: zugehöriger Bereich ist ausgeblendet

PR 4 verwendet keine Readiness-Schweregrade `warning` oder `error`.

## Readiness-Ergebnisse

```ts
export type ReadinessSeverity = "info" | "warning" | "error";

export type ReadinessResult = {
  id: string;
  ruleId: string;
  severity: ReadinessSeverity;
  title: string;
  detail: string;
  target?: PreviewTarget;
  section?: SectionKey;
  order: number;
};
```

Erfolgreiche Regeln liefern kein `success`-Ergebnis. Erfolg wird aus dem Fehlen problematischer Ergebnisse abgeleitet.

## Regelschnittstelle

```ts
export type ReadinessRule = {
  id: string;
  order: number;
  evaluate(
    draft: Readonly<MusicraumDraft>
  ): readonly ReadinessResult[];
};
```

Eine Regel darf null, ein oder mehrere Ergebnisse erzeugen. Beispiele:

- mehrere ungültige Klangmomente
- mehrere lange Navigationstexte
- mehrere doppelte Listenpunkte

## Stabile IDs

Statische IDs:

```text
identity:site-name:missing
contact:methods:missing
hero:title:too-long
```

Dynamische IDs verwenden stabile fachliche IDs statt Array-Indizes:

```text
offers:{offerId}:missing-title
offers:{offerId}:duplicate-title
heroPoints:{itemId}:duplicate
navigation:{sectionKey}:too-long
```

## Deterministische Sortierung

Ergebnisse werden sortiert nach:

1. Schweregrad: error, warning, info
2. aktueller Website-Bereichsreihenfolge
3. `rule.order`
4. stabiler Ergebnis-ID

Die Ausgabe darf nicht von Objekt-, Map- oder Set-Iterationsreihenfolge abhängen.

## Summary-Semantik

```ts
export type ReadinessSummary = {
  results: readonly ReadinessResult[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  ready: boolean;
  clean: boolean;
};
```

Definition:

```ts
ready = errorCount === 0;
clean = errorCount === 0 && warningCount === 0;
```

Eine Website kann damit exportierbar bereit sein und dennoch Warnungen besitzen.

## Zielnavigation

Lösbare Ergebnisse verwenden ein existierendes `PreviewTarget`. Readiness führt keine eigene Navigationssprache ein. Ungültige oder inzwischen gelöschte dynamische Ziele fallen kontrolliert auf das zugehörige Panel zurück.

## Konsequenzen

- PR 4 kann eine korrekte Übersicht ohne vorgezogene Validierungslogik liefern.
- PR 5 kann mehrere Probleme pro Regel darstellen.
- Ergebnisreihenfolge und IDs bleiben über Renderings hinweg stabil.
- `ready` und `clean` sind eindeutig und testbar.