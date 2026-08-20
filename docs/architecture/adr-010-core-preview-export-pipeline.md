# ADR-010: Preview und Export aus dem Build/Edit-SiteBundle

Status: angenommen für die gestapelte Integration
Datum: 2026-08-20

## Kontext

Der Musikraum-Editor besitzt einen ausgereiften vertikalen Renderer, stabile
Preview-Targets und einen revisionssicheren Export-Preflight. Der allgemeine
`build-edit`-Kern besitzt dagegen die kanonische Pipeline
`RawSiteInput -> SiteDraft -> ResolvedSite -> SiteBundle`. Ein Austausch des
Musikraum-Renderers würde die Produkterfahrung verschlechtern; ein direkter
HTML-Aufruf am Core vorbei würde Preview-/Export-Drift erhalten.

## Entscheidung

Der versionierte Musikraum-Adapter bleibt die einzige Übersetzung vom
`MusicraumDraft` in den Core. `compileMusicraumSite` ruft anschließend
`compileSiteBundle` auf. Der Musikraum-Renderer wird als vertikaler
`renderPage(page, resolvedSite)`-Callback an der finalen, aufgelösten
Core-Grenze registriert.

```text
MusicraumDraft (Authoring-SSOT)
  -> Musicraum-Adapter
  -> build-edit Normalize/Validate/Resolve
  -> vertikaler Renderer über ResolvedSite
  -> SiteBundle
  -> Preview-HTML oder Single-File-Export
```

Preview und Export verwenden damit denselben Compiler, dasselbe aufgelöste
Render-Modell und denselben Dokument-Renderer. `preview: true` ergänzt nur die
kontrollierte Editor-Instrumentierung, den Bridge-Handshake sowie
Revision/Generation. Der Export bleibt davon frei.

Die ursprünglichen Musikraum-Item-IDs werden als `sourceId` durch den
Core-Vertrag geführt. So bleiben Target-Registry, Selection und direkte
Editor-Preview-Navigation stabil, auch wenn der Core seine eigenen UUIDs
normalisiert.

## Browser-Distribution

Der statische Consumer verwendet das von `build-edit` generierte ESM-Artefakt
`build-edit-core.mjs`. Eine Provenienzdatei pinnt vollständigen Core-Commit,
Paket-/Compiler-Version und SHA-256 von Runtime und Deklarationen. Das lokale
und CI-Gate lehnt abweichende Artefakte ab.

Das Artefakt stammt aus dem privaten Core-Repository, während Musikraum und
seine Pages-Auslieferung öffentlich sind. Seine Aufnahme in einen öffentlichen
Commit oder Deployment-Payload benötigt deshalb eine ausdrückliche
Veröffentlichungsfreigabe des Owners.

## Export-Medien

Der bestehende Preflight bleibt vor dem Bundle-Build erhalten und erzwingt:

- Abbruch und Timeout;
- MIME-Allowlist;
- 5 MiB pro Bild;
- 12 MiB Gesamtgröße aller eingebetteten Bilder;
- abgewiesene Redirects;
- klassifizierte Fehler und revisionsgebundene Ergebnisse.

## Folgen

- Der Core importiert keine Musikraum-Typen oder -Renderer.
- `MusicraumDraft` bleibt das einzige editierbare Modell.
- Preview und Export erzeugen ein versioniertes, integritätsgesichertes
  `SiteBundle` mit Adapter-, Compiler- und Quellrevision.
- Der bisherige Renderer bleibt als Differentialreferenz verfügbar; das
  kanonische Fixture muss byte-identisches Export-HTML ergeben.
- Gasserwerk kann später dasselbe Bundle konsumieren, ohne Musikraum-Compilerlogik
  zu duplizieren.
