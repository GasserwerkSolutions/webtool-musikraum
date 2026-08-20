# ADR 009: Build/Edit reference consumer

**Status:** accepted
**Date:** 2026-08-20

## Decision

`MusicraumDraft` remains the sole authoring model. The pure, versioned `adaptMusicraumDraft` function derives a Build/Edit `RawSiteInput` without DOM, storage, network or mutation. Core drafts and bundles remain derived values and are never edited alongside `MusicraumDraft`.

The adapter maps vertical sections, navigation, theme choices and media slots into domain-neutral Core structures. Vertical readiness results become structured diagnostics with stable editor target IDs. Adapter, source-schema and target Core-schema versions are recorded in every result.

`build-edit` has no dependency on this repository. This repository will consume the Core compiler after its contract is merged and distributable. Preview is migrated before export; both must eventually select their HTML from the same `SiteBundle`.

## Consequences

- The specialized editor and its current history, registry and preview protocol remain intact.
- No reverse conversion from `SiteDraft` to `MusicraumDraft` is introduced.
- The adapter can be contract-tested independently before changing visible rendering.
- The existing renderer remains temporary compatibility behavior, not a second permanent compiler.
