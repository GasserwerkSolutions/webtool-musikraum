# Branch-Konsolidierung vom 20. August 2026

## Ergebnis

`main` ist der kanonische und funktional vollständigste Integrationszweig des Projekts. Alle 16 Nebenbranches wurden gegen `main`, ihre Commit-Historie und die zugehörigen Pull Requests geprüft.

Kein alter Branch wird nochmals vollständig gemergt. Ein solcher Merge würde wegen der früheren Squash- und Merge-Strategien bereits integrierte Arbeit erneut einspielen und in mehreren Kernmodulen neuere Implementierungen zurückdrehen.

Die Auswertung ergibt:

- sechs Nebenbranches liegen vollständig hinter `main` und enthalten keinen eigenen Commit mehr, der nicht bereits erreichbar ist;
- neun Branches erscheinen im Git-Vergleich als divergiert, weil ihre mehrteilige Entwicklung über einen Squash- oder Merge-Commit in `main` übernommen wurde;
- `feature/mobile-editor-modes` wurde nicht direkt gemergt, seine Funktion wurde jedoch in den Pull Requests #20 bis #22 weiterentwickelt und vollständig in `main` übernommen;
- der eigenständige Mehrseiten-Prototyp `design-v1/` bleibt als gestalterische Referenz erhalten, ersetzt aber nicht den gemeinsamen Editor-, Vorschau- und Export-Renderer.

## Entscheidung je Branch

| Branch | Einordnung | Entscheidung |
| --- | --- | --- |
| `agent/editable-hero-notes` | Pull Request #11; vollständig hinter `main` | Keine Übernahme. Die editierbaren Texte und Listen sind bereits in weiterentwickelter Form enthalten. |
| `agent/harden-draft-integrity` | Pull Request #8; durch Squash-Historie divergiert | Keine erneute Übernahme. Identitätsreparatur, Import- und Persistenzhärtung sind in `main`. |
| `agent/harden-export-and-inputs` | Pull Request #9; durch Squash-Historie divergiert | Keine erneute Übernahme. Export-, Eingabe- und Layout-Härtungen sind in `main`. |
| `agent/musikraum-website-werkzeug` | Pull Requests #1 bis #7; vollständig hinter `main` | Historische Aufbauphase. Keine Übernahme. |
| `agent/refine-preview-spacing` | Pull Request #10; vollständig hinter `main` | Keine Übernahme. Abstände, Radien und Headerreihenfolge sind integriert. |
| `architecture/editor-runtime-contracts` | Pull Request #12; durch Squash-Historie divergiert | Keine erneute Übernahme. ADRs, Roadmap und Testverträge liegen bereits unter `docs/architecture/`. |
| `claude/fonts-and-sizes-7etr5t` | Pull Requests #19 bis #22; vollständig hinter `main` | Keine Übernahme. Schriftwahl, mobile Modi und die späteren Mobilkorrekturen sind integriert. |
| `feature/content-overview-direct-editing` | Pull Request #16; durch Squash-Historie divergiert | Keine erneute Übernahme. Inhaltsübersicht und direkte Zielnavigation sind in `main`. |
| `feature/editor-registry-history-policies` | Pull Request #13; durch Squash-Historie divergiert | Keine erneute Übernahme. Registry, Policies und History-Verträge sind in `main`. |
| `feature/mobile-editor-modes` | Frühe Mobil-Linie ohne eigenen finalen Merge | Nicht mergen. Die Funktion wurde in #20 bis #22 erweitert, korrigiert und in `main` übernommen. |
| `feature/raum-fuer-klang-blue-v1` | Pull Request #24; vollständig hinter `main` | Der statische Mehrseiten-Prototyp bleibt unter `design-v1/` als Referenz erhalten. |
| `feature/raum-fuer-klang-svg-platzhalter` | Pull Request #23; vollständig hinter `main` | Keine Übernahme. Raum-für-Klang-Renderer und Medienplätze sind bereits integriert. |
| `feature/readiness-export-preflight` | Pull Request #18; durch Squash-Historie divergiert | Keine erneute Übernahme. Readiness und revisionssicherer Export-Preflight sind in `main`. |
| `feature/revision-safe-incremental-preview` | Pull Request #15; durch Squash-Historie divergiert | Keine erneute Übernahme. Das inkrementelle Preview-Protokoll ist in `main`. |
| `feature/unified-content-reordering` | Pull Request #14; durch Squash-Historie divergiert | Keine erneute Übernahme. Die gemeinsame Sortierlogik ist in `main`. |
| `fix/preview-input-stability` | Pull Request #17; durch Squash-Historie divergiert | Keine erneute Übernahme. No-op-, Revisions- und Scrollstabilität sind in `main`. |

## Produkt- und Designgrenze

Der produktive Einstieg bleibt `index.html` mit dem gemeinsamen Renderer unter `src/website-*.ts` und den kompilierten Modulen unter `assets/`. Dieser Pfad trägt die vollständigen Verträge für Datenmodell, Undo/Redo, direkte Vorschau-Navigation, inkrementelle Aktualisierung, Readiness, Export und mobile Bedienung.

`design-v1/` ist der jüngste eigenständige Mehrseiten-Entwurf. Er bleibt bewusst getrennt, weil er weder das bestehende Entwurfsmodell noch die Editor-Zielregistry, den Preview-Kanal oder den Einzeldatei-Export implementiert. Eine direkte Ersetzung des produktiven Renderers wäre daher optisch neuer, technisch aber ein Rückschritt.

Eine spätere Integration des Mehrseitenaufbaus muss als eigenes Produktinkrement erfolgen: mit einem kanonischen Seitenmodell, seitenbezogener Zielnavigation, Preview-Protokoll, Readiness-Regeln und einem definierten Mehrdatei- oder Paketexport. Sie darf nicht durch das Kopieren eines statischen Prototyps in den Laufzeitpfad erfolgen.

## Bereinigung auf `main`

Im Zuge der Konsolidierung werden nur Änderungen übernommen, die den aktuellen Stand eindeutiger und betriebssicherer machen:

1. Der temporäre, ausschließlich an einen alten Feature-Branch gebundene Source-Snapshot-Workflow wird entfernt.
2. Builder CI lädt nicht mehr bei jedem Lauf den gesamten Quellbaum mitsamt installierten Abhängigkeiten als Debug-Artefakt hoch.
3. GitHub Pages wird nur nach erfolgreicher Builder-CI für den exakten geprüften `main`-Commit ausgeliefert.
4. Das Pages-Artefakt enthält ausschließlich die produktiven Root-Dateien, `assets/` und den separat erreichbaren `design-v1/`-Prototyp; Quellen, Tests, Paketdaten und Repository-Metadaten werden nicht mehr veröffentlicht.
5. Eine manuell gestartete Pages-Auslieferung prüft `main` vor dem Deployment vollständig.

Die historischen Branches werden durch diese Konsolidierung nicht gelöscht. Ihre Entfernung ist eine separate Repository-Hygiene-Maßnahme und für einen sauberen, fortgeschrittenen `main`-Stand nicht erforderlich.
