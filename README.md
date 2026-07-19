# Musikraum Website-Werkzeug

Ein bewusst einfaches, persönliches Website-Werkzeug für Franz Gasser. Datenmodell, Bedienung und Export sind ausschliesslich auf den Musikraum zugeschnitten.

## Was Franz bearbeiten kann

- Name und Leitsatz der Website
- Einstieg auf dem grossen Titelbild
- persönliche Texte über Franz, seine Haltung und seine Geschichte
- Klangmomente für die Klangabende
- Reihenfolge und Sichtbarkeit der Inhaltsbereiche
- Kontaktangaben und Abschluss
- vier kuratierte Farbwelten
- responsive Live-Vorschau für Desktop, Tablet und Mobiltelefon
- Rückgängig/Wiederholen per Knopf oder Tastatur
- herunterladbare und wieder einlesbare Entwurfssicherung
- Export als einzelne HTML-Datei

Der Entwurf besteht nur aus Website-Angaben, Texten, Klangmomenten, Bereichsaufbau und Farbwelt. Er wird lokal in IndexedDB gespeichert. Es gibt keine Anmeldung und keine automatische Veröffentlichung.

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

Nach dem Zusammenführen kann das Werkzeug direkt über GitHub Pages ausgeliefert werden.
