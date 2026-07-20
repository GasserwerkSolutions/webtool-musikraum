# ADR 007: Preview-Ziele und Interaktionspriorität

Status: Angenommen für die Editor-Roadmap

## Kontext

Direkte Bearbeitung darf keine verschachtelten fokussierbaren Ziele, unnötig lange Tab-Reihenfolgen oder doppelte Aktivierung von Kind- und Elternzielen erzeugen. Mehrfachdarstellungen desselben Feldes müssen dennoch eindeutig wiedererkennbar bleiben.

## Ein Ziel pro semantischem DOM-Knoten

Ein DOM-Knoten trägt höchstens ein fachliches Editorziel:

```html
<span data-preview-target="..." data-preview-occurrence="header-brand-name">
```

`data-preview-occurrence` unterscheidet mehrere Darstellungen desselben Feldes, beispielsweise:

- `header-brand-name`
- `footer-brand-name`
- `contact-address`
- `footer-address`

Occurrence ist für Fokuswiederherstellung, Tests und Diagnose bestimmt. Beide Darstellungen führen zum gleichen Editorfeld.

## Nicht interaktive Knoten

Ein nicht interaktiver bearbeitbarer Knoten erhält im Preview-Modus:

```html
tabindex="0" role="button"
```

und einen zugänglichen Namen wie `Haupttitel bearbeiten`.

## Bereits interaktive Knoten

Bei Links oder Buttons liegt das Preview-Ziel auf dem bereits interaktiven Element. Es wird kein zusätzlich fokussierbares Kindelement angelegt.

Nicht zulässig:

```html
<a data-preview-target="...">
  <span tabindex="0" data-preview-target="...">...</span>
</a>
```

## Zusammengesetzte Inhalte

Enthält eine visuell gemeinsame Aktion mehrere separat bearbeitbare Texte, darf der Container nicht selbst interaktiv sein. Die bearbeitbaren Teile sind Geschwister. Es entstehen keine verschachtelten Links oder Buttons.

## Ereignispriorität

Die Preview-Bridge ermittelt ausschließlich das nächstgelegene Ziel:

```ts
const target = event.target.closest("[data-preview-target]");
```

Bei gültigem Ziel:

```ts
event.preventDefault();
event.stopPropagation();
```

Elternziele werden nicht zusätzlich ausgelöst. Kindelementziele haben dadurch definierte Priorität.

## Tastatur

- Enter aktiviert jedes Preview-Ziel.
- Leertaste aktiviert nicht-interaktive Zielknoten und verhindert Seitenscrollen.
- Native Links und Buttons verwenden im Preview-Modus den Editor-Navigationspfad statt ihrer öffentlichen Aktion.
- Escape löst keine Editoraktion aus.

## Export

Im Export entfallen:

- Preview-Zielattribute
- Occurrence-Attribute
- zusätzliche `tabindex`-Werte
- Editor-Rollen und Editor-ARIA-Beschriftungen
- Preview-Ereignislogik

Öffentliche Links und Buttons verhalten sich normal.

## Fokuswiederherstellung

Bei regionalem Replacement wird Fokus über fachliches Ziel plus Occurrence wiederhergestellt. Ist die konkrete Occurrence verschwunden, wird zunächst eine andere Darstellung desselben Ziels gesucht; danach greift der definierte Regionsfallback aus ADR 003.

## Konsequenzen

- Tab-Reihenfolge bleibt begrenzt und semantisch gültig.
- Kind- und Elternziele feuern nicht gemeinsam.
- Mehrfachdarstellungen sind eindeutig, ohne mehrere Editorfelder zu erfinden.
- PR 4 implementiert vollständige Zielabdeckung nach diesen Regeln.