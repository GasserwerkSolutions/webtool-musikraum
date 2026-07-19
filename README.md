# Musikraum Website-Werkzeug

Ein bewusst einfaches, persönliches Website-Werkzeug für Franz Gasser. Es basiert technisch auf dem Gasserwerk `free-builder`, ist in Inhalt, Bedienung und Export jedoch vollständig auf den Musikraum zugeschnitten.

## Was Franz bearbeiten kann

- Name und Leitsatz der Website
- Einstieg auf dem grossen Titelbild
- persönliche Texte über Franz, seine Haltung und seine Geschichte
- Angebotskarten für die Klangabende
- Reihenfolge und Sichtbarkeit der Inhaltsbereiche
- Kontaktangaben und Abschluss
- vier kuratierte Farbwelten
- responsive Live-Vorschau für Desktop, Tablet und Mobiltelefon
- Export als einzelne HTML-Datei

Der Entwurf wird lokal in IndexedDB gespeichert. Es gibt keine Anmeldung und keine automatische Veröffentlichung.

## Bewusste Grenze der ersten Version

Die allgemeine Bildverwaltung des Ausgangs-Builders ist noch nicht fertig. Deshalb verwendet dieses Werkzeug vorerst das kuratierte Musikraum-Titelbild aus `GasserwerkSolutions/musikraum`. Beim Export versucht der Browser, das Bild direkt als Data-URL in die HTML-Datei einzubetten. Falls das Laden blockiert ist, bleibt die feste Online-Quelle als Rückfall erhalten.

## Entwicklung

Voraussetzung: Node.js 20 oder neuer.

```bash
npm ci
npm run check
python3 -m http.server 8080
```

Danach `http://localhost:8080` öffnen.

Die TypeScript-Quellen liegen unter `src/`; die kompilierten, statisch auslieferbaren Browsermodule unter `assets/` werden bewusst mitcommittet.
