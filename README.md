# Musikraum Website-Werkzeug

Ein bewusst einfaches, persönliches Website-Werkzeug für Franz Gasser. Datenmodell, Bedienung und Export sind ausschliesslich auf den Musikraum zugeschnitten.

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
- direkte Bearbeitung: Ein Klick auf sichtbaren Inhalt öffnet das zugehörige Feld
- falt- und per Maus, Touch oder Tastatur grössenveränderbare Bearbeitungsfläche
- Rückgängig/Wiederholen per Knopf oder Tastatur
- herunterladbare und wieder einlesbare Entwurfssicherung
- Export als einzelne HTML-Datei

Änderungen werden während der Eingabe unmittelbar in der Vorschau gerendert. Die Geräteauswahl sitzt im Header; die Vorschau bleibt innerhalb der verfügbaren Breite und verwendet 12-Pixel-Ecken. Der Button „Klangmoment hinzufügen“ bleibt auch bei minimaler Sidebar-Breite sichtbar.

Der Entwurf besteht nur aus Website-Angaben, Texten, Listen, Klangmomenten, Bereichsaufbau und Farbwelt. Er wird lokal in IndexedDB gespeichert. Es gibt keine Anmeldung und keine automatische Veröffentlichung.

## Datenmodell und Kompatibilität

Bestehende Entwürfe und Sicherungen der ersten Schema-Version bleiben kompatibel. Fehlen die neueren Listen oder Textfelder, ergänzt die Normalisierung die bisherigen Musikraum-Standardwerte. Ältere Entwürfe ohne Schrift-Angaben erhalten die Standardschrift „Klassisch“ in der Grösse „Normal“; die Schriftarten verwenden ausschliesslich systemeigene Schriften, damit der Export ohne Internetverbindung funktioniert. Eine ausdrücklich leere Liste bleibt dagegen leer. Hero- und Intro-Punktlisten werden auf höchstens sechs Einträge begrenzt; Klangmomente auf höchstens zwölf.

## Bewusste Grenze

Die allgemeine Bildverwaltung des Ausgangs-Builders ist noch nicht fertig. Deshalb verwendet dieses Werkzeug vorerst das kuratierte Musikraum-Titelbild aus `GasserwerkSolutions/musikraum`. Die Quelle ist auf einen konkreten Commit festgelegt. Beim Export versucht der Browser, das Bild direkt als Data-URL in die HTML-Datei einzubetten. Falls das Laden blockiert ist, bleibt die feste Online-Quelle als Rückfall erhalten.

## Entwicklung

Voraussetzung: Node.js 20 oder neuer.

```bash
npm ci
npm run check
python3 -m http.server 8080
```

Danach `http://localhost:8080` öffnen.

Die TypeScript-Quellen liegen unter `src/`; die kompilierten, statisch auslieferbaren Browsermodule unter `assets/` werden bewusst mitcommittet. `npm run check` umfasst Typprüfung, Logik- und Sicherheitstests sowie eine echte Chromium-Abnahme für Live-Rendering, iframe-Navigation, Breakpoints, Scrollcontainer, Footer-Abstände und Sidebar-Bedienung.

Editorvorschau und HTML-Export entstehen aus demselben Renderer. Nur `preview: true` ergänzt kurzlebige Zielkennungen, das versionierte Nachrichtenprotokoll und Bedienhilfen. Der Export enthält diese Editorbestandteile nicht.

### Editor-Architektur und Roadmap

Die verbindlichen Laufzeitverträge für die nächste Ausbauphase liegen unter [`docs/architecture/`](docs/architecture/). Der Einstieg ist die [Editor-Roadmap](docs/architecture/editor-roadmap.md). Sie definiert die Abfolge von Registry und Verlauf über das revisionssichere Preview-Protokoll bis zu Readiness, Export-Preflight und mobiler Bedienung.

Die Architecture Decision Records legen insbesondere fest:

- ein kanonisches, nach Normalisierung verifiziertes Mutations- und Revisionsmodell,
- inverse Effekte für Undo und Redo,
- ein atomares Single-Flight-Preview-Protokoll für das opaque-origin-iframe,
- gemeinsame Policies für statische und dynamische Inhalte,
- getrennte Vollständigkeits- und Readiness-Modelle,
- revisions- und generationssichere Exportvorbereitung,
- eindeutige Preview-Ziele ohne verschachtelte fokussierbare Elemente,
- Differential-, Sequenz-, Race- und manuelle iOS-Safari-Tests.

Nach dem Zusammenführen kann das Werkzeug direkt über GitHub Pages ausgeliefert werden.
