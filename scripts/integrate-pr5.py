from pathlib import Path

index = Path("index.html")
source = index.read_text()
source = source.replace(
    '<button class="button button--primary" type="button" data-action="export">HTML exportieren</button>',
    '<button class="button button--primary" type="button" data-action="export"><span data-export-label>HTML exportieren</span></button>',
    1,
)
publish = '''        <section class="panel" data-panel="publish" aria-labelledby="panel-publish-title" hidden>
          <div class="panel__header"><p class="eyebrow">Prüfen und mitnehmen</p><h2 id="panel-publish-title">Website prüfen und exportieren</h2><p>Blocker müssen gelöst sein. Hinweise dürfen bewusst bestehen bleiben. Erst nach der sicheren Vorbereitung wird die HTML-Datei heruntergeladen.</p></div>
          <div id="readinessSummary" class="readiness-summary" role="status" aria-live="polite"></div>
          <div id="readinessList" class="readiness-list" aria-label="Readiness-Ergebnisse"></div>
          <div id="exportStatus" class="export-status" role="status" aria-live="polite">Der Export ist noch nicht vorbereitet.</div>
          <div class="publish-actions"><button class="button button--primary button--large" type="button" data-action="export"><span data-export-label>Export vorbereiten</span></button><button class="button button--quiet" type="button" data-action="download-backup">Sicherung herunterladen</button><button class="button button--quiet" type="button" data-action="restore-backup">Sicherung wiederherstellen</button><input id="backupInput" class="visually-hidden" type="file" accept="application/json,.json" aria-label="Musikraum-Sicherung auswählen"></div>
          <p class="privacy-note">Die Vorbereitung ist immer an die aktuelle Entwurfsrevision gebunden. Das Titelbild wird nur aus der fest hinterlegten Musikraum-Quelle geladen und nach Möglichkeit eingebettet.</p>
        </section>'''
start_marker = '        <section class="panel" data-panel="publish" aria-labelledby="panel-publish-title" hidden>'
start = source.index(start_marker)
end = source.index("        </section>", start) + len("        </section>")
source = source[:start] + publish + source[end:]
index.write_text(source)

styles = Path("styles.css")
css = styles.read_text()
marker = "/* PR5 readiness and export preflight */"
if marker not in css:
    css += r'''

/* PR5 readiness and export preflight */
.readiness-summary { display:grid; gap:8px; margin:18px 0 14px; padding:16px; border:1px solid var(--line); border-radius:15px; background:var(--paper); }
.readiness-summary>strong { font-family:Georgia,"Times New Roman",serif; font-size:20px; line-height:1.2; }
.readiness-summary>span { color:var(--muted); font-size:12px; line-height:1.5; }
.readiness-summary.is-ready { border-color:rgba(47,111,78,.28); background:rgba(248,255,251,.8); }
.readiness-summary.is-blocked { border-color:rgba(158,60,60,.28); background:rgba(255,248,248,.82); }
.readiness-counts { display:flex; flex-wrap:wrap; gap:8px; }
.readiness-counts span { padding:4px 8px; border-radius:999px; background:rgba(64,59,52,.07); color:var(--muted); font-size:11px; font-weight:800; }
.readiness-list { display:grid; gap:10px; margin:14px 0 18px; }
.readiness-result { width:100%; display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:11px; align-items:start; padding:13px 14px; border:1px solid var(--line); border-radius:13px; background:var(--paper); color:inherit; text-align:left; }
button.readiness-result { cursor:pointer; }
button.readiness-result:hover { border-color:var(--accent); box-shadow:0 7px 18px rgba(40,32,24,.07); }
button.readiness-result:focus-visible { outline:3px solid rgba(88,114,113,.25); outline-offset:2px; }
.readiness-result.is-error { border-color:rgba(158,60,60,.3); }
.readiness-result.is-warning { border-color:rgba(180,132,52,.32); }
.readiness-result.is-info { border-color:rgba(88,114,113,.28); }
.readiness-result__severity { min-width:58px; padding:4px 7px; border-radius:999px; background:rgba(64,59,52,.07); color:var(--muted); font-size:10px; font-weight:900; text-align:center; text-transform:uppercase; letter-spacing:.04em; }
.is-error .readiness-result__severity { background:rgba(158,60,60,.1); color:var(--danger); }
.is-warning .readiness-result__severity { background:rgba(180,132,52,.12); color:#785a21; }
.readiness-result__copy { display:grid; gap:4px; }
.readiness-result__copy strong { font-size:13px; line-height:1.35; }
.readiness-result__copy small { color:var(--muted); font-size:12px; line-height:1.48; }
.readiness-result__arrow { color:var(--accent); font-size:18px; font-weight:900; }
.readiness-empty { display:grid; gap:4px; padding:16px; border:1px solid rgba(47,111,78,.24); border-radius:13px; background:rgba(248,255,251,.8); }
.readiness-empty span { color:var(--muted); font-size:12px; }
.export-status { margin:0 0 14px; padding:12px 14px; border:1px solid var(--line); border-radius:12px; background:rgba(255,255,255,.56); color:var(--muted); font-size:12px; line-height:1.5; }
.export-status.is-preparing { border-color:rgba(88,114,113,.3); color:var(--accent-dark); }
.export-status.is-ready { border-color:rgba(47,111,78,.28); color:var(--success); background:rgba(248,255,251,.76); }
.export-status.is-blocked,.export-status.is-failed { border-color:rgba(158,60,60,.28); color:var(--danger); background:rgba(255,248,248,.76); }
.export-status.is-stale { border-color:rgba(180,132,52,.3); color:#785a21; background:rgba(255,251,241,.78); }
@media (max-width:560px) { .readiness-result { grid-template-columns:1fr auto; } .readiness-result__severity { grid-column:1/-1; width:max-content; } }
'''
    styles.write_text(css)
