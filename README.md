# Musikraum Website-Werkzeug

Ein bewusst einfaches, persönliches Website-Werkzeug für Franz Gasser. Datenmodell, Bedienung und Export sind ausschliesslich auf den Musikraum zugeschnitten.

## Kanonischer Projektstand

`main` ist der einzige produktive Integrationszweig. Die früheren Agent-, Feature-, Fix-, Architecture- und Claude-Zweige wurden vollständig oder in weiterentwickelter Form über die Pull Requests #1 bis #24 übernommen. Abweichende Ahead-/Behind-Werte einzelner Branches entstehen durch Squash- und Merge-Historien und bedeuten nicht, dass dort ein neuerer Produktstand liegt.

Der vollständige Abgleich und die Entscheidung zu jedem einzelnen Branch sind unter [`docs/maintenance/branch-consolidation-2026-08-20.md`](docs/maintenance/branch-consolidation-2026-08-20.md) dokumentiert.

Der produktive Editor läuft aus dem Repository-Stamm. Der Ordner [`design-v1/`](design-v1/) enthält zusätzlich den jüngsten eigenständigen Mehrseiten-Prototyp für die gestalterische Referenz. Er bleibt bewusst getrennt, bis Mehrseitigkeit als gemeinsames Daten-, Vorschau- und Exportmodell implementiert ist; der statische Prototyp ersetzt den technisch weiterentwickelten Editor-Renderer nicht.

## Was Franz bearbeiten kann

- Name und Leitsatz der Website
- sämtliche sichtbaren Website-Inhalte: Einstieg, Eyebrows, Überschriften, Fliesstexte, Navigation und Knopftexte
- die kurzen Punkte im Titelbild als Liste mit 0 bis 6 Einträgen
- die kurzen Punkte unter „Über Franz“ als Liste mit 0 bis 6 Einträgen
- persönliche Texte über Franz, seine Haltung und seine Geschichte
- Klangmomente für die Klangabende, jeweils mit Titel und Beschreibung
- Reihenfolge und Sichtbarkeit der Inhaltsbereiche
- Kontaktangaben, Abschluss-Texte und Kontakt-CTA-Beschriftungen
- vier kuratierte Farbwelten
- vier Schriftarten zur Auswahl (Klassisch, Klar/Arial, Elegant/Georgia, Modern) und vier Schriftgrössen (Kompakt bis Sehr gross)
- responsive Live-Vorschau für Desktop, Tablet und Mobiltelefon
- auf schmalen Bildschirmen (bis 700 px) getrennte Bearbeiten- und Vorschau-Modi mit eigener Scrollposition und Touch-Zielen von mindestens 44 × 44 px
- direkte Bearbeitung: Ein Klick auf sichtbaren Inhalt öffnet das zugehörige Feld
- falt- und per Maus, Touch oder Tastatur grössenveränderbare Bearbeitungsfläche
- Rückgängig/Wiederholen per Knopf oder Tastatur
- herunterladbare und wieder einlesbare Entwurfssicherung
- Export als einzelne HTML-Datei

Die exportierte Website enthält klassische CSS-Fallbacks (Farben, Schriftgrössen, Hero-Hintergrund), damit sie auch auf sehr alten Browsern ohne `var()`, `clamp()`, `color-mix()` oder `svh` lesbar bleibt; der Hero behält dort immer einen dunklen Hintergrund hinter dem weissen Text.

Änderungen werden während der Eingabe unmittelbar in der Vorschau gerendert. Die Geräteauswahl sitzt im Header; die Vorschau bleibt innerhalb der verfügbaren Breite und verwendet 12-Pixel-Ecken. Der Button „Klangmoment hinzufügen“ bleibt auch bei minimaler Sidebar-Breite sichtbar.

Der Entwurf besteht nur aus Website-Angaben, Texten, Listen, Klangmomenten, Bereichsaufbau und Farbwelt. Er wird lokal in IndexedDB gespeichert. Es gibt keine Anmeldung und keine automatische Veröffentlichung.

## Datenmodell und Kompatibilität

Bestehende Entwürfe und Sicherungen der ersten Schema-Version bleiben kompatibel. Fehlen die neueren Listen oder Textfelder, ergänzt die Normalisierung die bisherigen Musikraum-Standardwerte. Ältere Entwürfe ohne Schrift-Angaben erhalten die Standardschrift „Klassisch“ in der Grösse „Normal“; die Schriftarten verwenden ausschliesslich systemeigene Schriften, damit der Export ohne Internetverbindung funktioniert. Eine ausdrücklich leere Liste bleibt dagegen leer. Hero- und Intro-Punktlisten werden auf höchstens sechs Einträge begrenzt; Klangmomente auf höchstens zwölf.

## Bewusste Grenze

Die allgemeine Bildverwaltung des Ausgangs-Builders ist noch nicht fertig. Bis dahin verwendet der gemeinsame Renderer drei kuratierte, direkt eingebettete SVG-Fotoplatzhalter für Sandpendel, Franz und Instrumentendetail. Sie funktionieren in Vorschau und Einzeldatei-Export offline. Spätere Fotografien können über die drei Medienplätze eingesetzt werden; externe Bildquellen werden beim Export auf Typ, Grösse und Ladezeit geprüft und nach Möglichkeit in die HTML-Datei eingebettet.

## Entwicklung

Voraussetzung: Node.js 20 oder neuer.

```bash
npm ci
npm run check
python3 -m http.server 8080
```

Danach `http://localhost:8080` öffnen.

Die TypeScript-Quellen liegen unter `src/`; die kompilierten, statisch auslieferbaren Browsermodule unter `assets/` werden bewusst mitcommittet. `npm run check` umfasst Typprüfung, Logik- und Sicherheitstests sowie eine echte Chromium-Abnahme für Live-Rendering, iframe-Navigation, Breakpoints, Scrollcontainer, Footer-Abstände und Sidebar-Bedienung.

Editorvorschau und HTML-Export entstehen aus demselben `build-edit`-Compiler,
demselben `ResolvedSite` und demselben vertikalen Renderer. Nur `preview: true`
ergänzt kurzlebige Zielkennungen, das versionierte Nachrichtenprotokoll und
Bedienhilfen. Der Export enthält diese Editorbestandteile nicht. Das lokale
`npm run check:vendor` verifiziert den vollständigen Core-Commit sowie die
SHA-256-Hashes der Runtime und ihrer TypeScript-Deklarationen. Die genaue
Entscheidung steht in [ADR-010](docs/architecture/adr-010-core-preview-export-pipeline.md).

### Editor-Architektur und Roadmap

Die verbindlichen Laufzeitverträge und die umgesetzte Ausbaufolge liegen unter [`docs/architecture/`](docs/architecture/). Der Einstieg ist die [Editor-Roadmap](docs/architecture/editor-roadmap.md). Sie beschreibt die Abfolge von Registry und Verlauf über das revisionssichere Preview-Protokoll bis zu Readiness, Export-Preflight und mobiler Bedienung.

Die Architecture Decision Records legen insbesondere fest:

- ein kanonisches, nach Normalisierung verifiziertes Mutations- und Revisionsmodell,
- inverse Effekte für Undo und Redo,
- ein atomares Single-Flight-Preview-Protokoll für das opaque-origin-iframe,
- gemeinsame Policies für statische und dynamische Inhalte,
- getrennte Vollständigkeits- und Readiness-Modelle,
- revisions- und generationssichere Exportvorbereitung,
- eindeutige Preview-Ziele ohne verschachtelte fokussierbare Elemente,
- Differential-, Sequenz-, Race- und manuelle iOS-Safari-Tests.

GitHub Pages veröffentlicht nach erfolgreicher Builder-CI ausschliesslich den geprüften Produktionssatz aus Root-Dateien, `assets/`, `vendor/` und `design-v1/`.
