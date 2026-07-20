# ADR 006: Sichere Export-Generation

Status: Angenommen für die Editor-Roadmap

## Kontext

Der aktuelle Export lädt das Titelbild ohne Timeout oder Abbruch und erzeugt anschließend unmittelbar eine Datei. Die künftige Vorbereitung muss ältere Ergebnisse verwerfen, parallele Abrufe verhindern und Assetfehler klar von einem Generationsabbruch unterscheiden.

## Revisions- und Generationsmodell

Exportgültigkeit basiert auf Store-Revision und Export-Generation, nicht auf `updatedAt`.

```ts
export type ExportPreparationState =
  | { status: "idle" }
  | { status: "preparing"; generation: number; revision: number }
  | { status: "stale"; generation: number; revision: number }
  | {
      status: "ready";
      generation: number;
      revision: number;
      result: PreparedExport;
    }
  | {
      status: "failed";
      generation: number;
      revision: number;
      message: string;
    };
```

Der Controller hält:

```ts
private exportGeneration = 0;
private activeController: AbortController | null = null;
```

Bei neuer Vorbereitung:

1. laufenden Controller abbrechen,
2. Generation erhöhen,
3. aktuelle Store-Revision erfassen,
4. neuen Controller erzeugen,
5. Vorbereitung starten.

Ein Ergebnis wird nur akzeptiert, wenn:

```ts
generation === currentExportGeneration
&& revision === store.revision
&& !signal.aborted
```

## Mutation während Vorbereitung

Bei neuer Draft-Mutation:

1. aktiven Abruf abbrechen,
2. vorbereitete Daten verwerfen,
3. Status `stale` setzen.

Ist das Exportpanel sichtbar, beginnt eine neue Vorbereitung erst nach 500 ms ohne weitere Mutation. Ist es nicht sichtbar, erfolgt kein automatischer Neustart.

## Assetfehler

Assetfehler sind:

- CORS-Fehler
- Netzwerk-Timeout
- HTTP-Fehler
- ungültiger MIME-Typ
- Überschreitung des Größenlimits
- sonstiger Lesefehler des aktuellen Asset-Abrufs

Nur bei Assetfehlern darf dieselbe aktuelle Exportgeneration mit der gepinnten Online-Bildquelle fortfahren. Das Ergebnis ist `ready`, aber `imageEmbedded` ist `false`.

## Generationsabbruch

Generationsabbrüche sind:

- neue Draft-Revision
- neuere Exportgeneration
- Panel geschlossen und Vorbereitung ausdrücklich beendet
- expliziter Nutzerabbruch

Bei einem Generationsabbruch gilt:

- kein Online-Fallback-Export,
- kein `ready`,
- kein Download,
- Status `stale` oder `idle`,
- gegebenenfalls Neustart nach dem Ruhefenster.

Ein Generationsabbruch darf nicht als Assetfehler behandelt werden.

## Titelbildregeln

Zulässig ist nur die fest konfigurierte, auf einen Commit gepinnte Musikraum-Quelle über HTTPS. Es gibt keinen freien Benutzer-URL-Input.

Verbindliche Grenzen:

- Netzwerk-Timeout: 8 Sekunden
- maximale Bildgröße: 5 MiB
- MIME-Allowlist:
  - `image/webp`
  - `image/jpeg`
  - `image/png`
  - `image/avif`

SVG, HTML, XML und unbekannte Binärtypen werden nicht eingebettet.

Größe wird zuerst über `Content-Length`, sofern vorhanden, und anschließend zwingend über `blob.size` geprüft.

## Speicherverhalten

Kurzzeitig können Bild-Blob, Data-URL, HTML-String und Export-Blob gleichzeitig existieren. Nach Erstellung des Export-Blobs werden Referenzen auf Bild-Blob, Data-URL und HTML-String freigegeben.

`PreparedExport` hält nicht dauerhaft den vollständigen HTML-String:

```ts
export type PreparedExport = {
  filename: string;
  blob: Blob;
  byteSize: number;
  imageEmbedded: boolean;
  readiness: ReadinessSummary;
  visibleSectionCount: number;
  validOfferCount: number;
  contactMethodCount: number;
};
```

## Object-URLs

Eine Object-URL wird erst beim tatsächlichen Download erstellt. Sie wird nach 1 Sekunde und spätestens bei `pagehide` widerrufen. Ein vorbereitetes Ergebnis hält keine dauerhaft aktive Object-URL.

## Nebenläufigkeit

Verspätete Ergebnisse werden ignoriert, wenn Generation, Revision oder Abort-Signal nicht mehr aktuell sind. Eine ältere Vorbereitung kann niemals eine neuere als `ready` überschreiben.

## Konsequenzen

- Assetprobleme verhindern den Export nicht unnötig.
- Draft-Änderungen erzeugen keinen Export eines veralteten Zustands.
- Fortlaufendes Tippen startet keine parallelen Bildabrufe.
- PR 5 implementiert Controller, Grenzen, Status und Tests.