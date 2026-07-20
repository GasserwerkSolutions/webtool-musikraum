from pathlib import Path


def replace_between(path: str, start_marker: str, end_marker: str, replacement: str) -> None:
    file = Path(path)
    source = file.read_text()
    start = source.index(start_marker)
    end = source.index(end_marker, start)
    file.write_text(source[:start] + replacement + source[end:])


export_method = '''  async prepare(): Promise<ExportPreparationState> {
    this.clearQuietTimer();
    this.abortActive();
    const generation = ++this.exportGeneration;
    const revision = this.options.readRevision();
    const controller = new AbortController();
    this.activeController = controller;
    this.setState({ status: "preparing", generation, revision });
    try {
      const draft = cloneDraft(this.options.readDraft());
      const readiness = evaluateReadiness(draft);
      if (!readiness.ready) {
        if (this.isCurrent(generation, revision, controller.signal)) this.setState({ status: "failed", generation, revision, message: `${readiness.errorCount} ${readiness.errorCount === 1 ? "Blocker verhindert" : "Blocker verhindern"} den Export.` });
        return this.stateValue;
      }

      let heroImageUrl = MUSICRAUM_HERO_URL;
      let imageEmbedded = true;
      try {
        heroImageUrl = await fetchPinnedHeroImage(this.fetchAsset, controller.signal, { timeoutMs: this.assetTimeoutMs });
      } catch (error) {
        if (isAbortError(error) || !this.isCurrent(generation, revision, controller.signal)) return this.stateValue;
        if (!(error instanceof ExportAssetError)) console.warn("Unexpected export asset failure.", error);
        imageEmbedded = false;
      }
      if (!this.isCurrent(generation, revision, controller.signal)) return this.stateValue;

      try {
        const html = this.buildHtml(draft, { heroImageUrl });
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const result: PreparedExport = {
          filename: `${slugify(draft.site.name || "musikraum")}.html`,
          blob,
          byteSize: blob.size,
          imageEmbedded,
          readiness,
          visibleSectionCount: draft.layout.order.filter((section) => draft.layout.visibility[section]).length,
          validOfferCount: draft.offers.filter((offer) => offer.title.trim()).length,
          contactMethodCount: Number(Boolean(normalizeEmail(draft.site.email))) + Number(Boolean(normalizePhone(draft.site.phone))),
        };
        if (this.isCurrent(generation, revision, controller.signal)) this.setState({ status: "ready", generation, revision, result });
      } catch (error) {
        if (this.isCurrent(generation, revision, controller.signal)) this.setState({ status: "failed", generation, revision, message: error instanceof Error ? error.message : "Die Exportdatei konnte nicht erzeugt werden." });
      }
      return this.stateValue;
    } finally {
      if (this.activeController === controller) this.activeController = null;
    }
  }
'''
replace_between(
    "src/export-preflight.ts",
    "  async prepare(): Promise<ExportPreparationState> {",
    "\n\n  download(): PreparedExport | null {",
    export_method,
)

export_asset = '''export async function fetchPinnedHeroImage(fetchAsset: typeof fetch, signal: AbortSignal, options: { timeoutMs?: number; maxBytes?: number } = {}): Promise<string> {
  const timeoutMs = options.timeoutMs ?? EXPORT_ASSET_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? EXPORT_ASSET_MAX_BYTES;
  if (signal.aborted) throw abortError();
  const controller = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let abortFromParent: (() => void) | null = null;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => { timedOut = true; controller.abort(); reject(new ExportAssetError("timeout", "Das Titelbild hat nicht innerhalb von 8 Sekunden geantwortet.")); }, timeoutMs);
  });
  const parentAbort = new Promise<never>((_resolve, reject) => {
    abortFromParent = () => { controller.abort(); reject(abortError()); };
    signal.addEventListener("abort", abortFromParent, { once: true });
  });
  try {
    const request = Promise.resolve().then(() => {
      if (signal.aborted) throw abortError();
      return fetchAsset(MUSICRAUM_HERO_URL, { signal: controller.signal });
    });
    let response: Response;
    try { response = await Promise.race([request, timeout, parentAbort]); }
    catch (error) {
      if (error instanceof ExportAssetError) throw error;
      if (signal.aborted) throw abortError();
      if (timedOut) throw new ExportAssetError("timeout", "Das Titelbild hat nicht innerhalb von 8 Sekunden geantwortet.");
      throw new ExportAssetError("network", error instanceof Error ? error.message : "Das Titelbild konnte nicht geladen werden.");
    }
    if (!response.ok) throw new ExportAssetError("http", `Das Titelbild antwortete mit HTTP ${response.status}.`);
    const mime = (response.headers.get("content-type") ?? "").split(";", 1)[0]?.trim().toLowerCase() ?? "";
    if (!EXPORT_IMAGE_MIME_TYPES.has(mime)) throw new ExportAssetError("mime", `Der Bildtyp ${mime || "unbekannt"} darf nicht eingebettet werden.`);
    const declaredSize = Number(response.headers.get("content-length") ?? "0");
    if (Number.isFinite(declaredSize) && declaredSize > maxBytes) throw new ExportAssetError("size", "Das Titelbild überschreitet die Grenze von 5 MiB.");
    let blob: Blob;
    try { blob = await response.blob(); }
    catch (error) {
      if (signal.aborted) throw abortError();
      if (timedOut) throw new ExportAssetError("timeout", "Das Titelbild hat nicht innerhalb von 8 Sekunden geantwortet.");
      throw new ExportAssetError("read", error instanceof Error ? error.message : "Das Titelbild konnte nicht gelesen werden.");
    }
    if (blob.size > maxBytes) throw new ExportAssetError("size", "Das Titelbild überschreitet die Grenze von 5 MiB.");
    const dataUrl = await blobToDataUrl(blob, mime);
    if (signal.aborted) throw abortError();
    if (timedOut) throw new ExportAssetError("timeout", "Das Titelbild hat nicht innerhalb von 8 Sekunden geantwortet.");
    return dataUrl;
  } finally {
    if (timer) clearTimeout(timer);
    if (abortFromParent) signal.removeEventListener("abort", abortFromParent);
  }
}
'''
replace_between(
    "src/export-preflight.ts",
    "export async function fetchPinnedHeroImage",
    "\n\nasync function blobToDataUrl",
    export_asset,
)

export_path = Path("src/export-preflight.ts")
export_source = export_path.read_text()
export_source = export_source.replace(
    '    if (this.stateValue.status === "ready" && this.stateValue.revision === this.options.readRevision()) return;',
    '    if ((this.stateValue.status === "ready" || this.stateValue.status === "preparing") && this.stateValue.revision === this.options.readRevision()) return;',
)
export_path.write_text(export_source)

readiness_path = Path("src/readiness.ts")
readiness = readiness_path.read_text()
readiness = readiness.replace(
    '    evaluate(draft) {\n      return draft.layout.order.some((section) => draft.layout.visibility[section]) ? [] : [result("layout:visible-section:missing", "layout", "error", "Alle Inhaltsbereiche sind ausgeblendet", "Blende mindestens einen Bereich ein, damit die Website nach dem Einstieg weiterführt.", { kind: "panel", panel: "structure" }, undefined, 30)];\n    },',
    '    evaluate(draft) {\n      if (draft.layout.order.some((section) => draft.layout.visibility[section])) return [];\n      const section = draft.layout.order[0] ?? "intro";\n      return [result("layout:visible-section:missing", "layout", "error", "Alle Inhaltsbereiche sind ausgeblendet", "Blende mindestens einen Bereich ein, damit die Website nach dem Einstieg weiterführt.", { kind: "section", section }, section, 30)];\n    },',
)
readiness = readiness.replace(
    '      if (!email && !phone) results.push(result("contact:methods:missing", "contact", "error", "Keine gültige Kontaktmöglichkeit", "Hinterlege eine gültige E-Mail-Adresse oder Telefonnummer.", { kind: "panel", panel: "contact" }, "contact", 40));',
    '      const contactTarget: PreviewTarget = rawEmail ? { kind: "field", field: "site.email" } : rawPhone ? { kind: "field", field: "site.phone" } : { kind: "field", field: "site.email" };\n      if (!email && !phone) results.push(result("contact:methods:missing", "contact", "error", "Keine gültige Kontaktmöglichkeit", "Hinterlege eine gültige E-Mail-Adresse oder Telefonnummer.", contactTarget, "contact", 40));',
)
readiness = readiness.replace(
    '      for (const list of ["heroPoints", "introPoints"] as const) {\n        const groups = duplicateGroups',
    '      for (const list of ["heroPoints", "introPoints"] as const) {\n        if (list === "introPoints" && !draft.layout.visibility.intro) continue;\n        const groups = duplicateGroups',
)
readiness_path.write_text(readiness)

ui_path = Path("src/ui-render.ts")
ui = ui_path.read_text()
old_ui = '''    return `<${tag} class="readiness-result is-${item.severity}"${type}${target} aria-label="${escapeAttr(`${SEVERITY_LABELS[item.severity]}: ${item.title}${item.target ? ", bearbeiten" : ""}`)}"><span class="readiness-result__severity">${escapeHtml(SEVERITY_LABELS[item.severity])}</span><span class="readiness-result__copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></span>${item.target ? '<span class="readiness-result__arrow" aria-hidden="true">→</span>' : ""}</${tag}>`;'''
new_ui = '''    const action = item.target ? '<span class="readiness-result__arrow" aria-hidden="true">→</span><span class="visually-hidden"> bearbeiten</span>' : "";
    return `<${tag} class="readiness-result is-${item.severity}"${type}${target}><span class="readiness-result__severity">${escapeHtml(SEVERITY_LABELS[item.severity])}</span><span class="readiness-result__copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></span>${action}</${tag}>`;'''
if old_ui not in ui:
    raise SystemExit("readiness UI render block not found")
ui_path.write_text(ui.replace(old_ui, new_ui))

readiness_tests = Path("tests/readiness.test.mjs")
text = readiness_tests.read_text()
marker = 'test("hidden intro duplicates and multi-field blockers use reachable canonical targets"'
if marker not in text:
    text += '''\n\ntest("hidden intro duplicates and multi-field blockers use reachable canonical targets", () => {
  const hidden = createDefaultDraft();
  hidden.layout.visibility.intro = false;
  hidden.introPoints = [
    { id: "hidden-intro-a", text: "Doppelt" },
    { id: "hidden-intro-b", text: " doppelt " },
  ];
  assert.equal(evaluateReadiness(hidden).results.some((item) => item.id.startsWith("introPoints:")), false);

  const layout = createDefaultDraft();
  for (const section of layout.layout.order) layout.layout.visibility[section] = false;
  const layoutResult = evaluateReadiness(layout).results.find((item) => item.id === "layout:visible-section:missing");
  assert.deepEqual(layoutResult?.target, { kind: "section", section: layout.layout.order[0] });

  const contact = createDefaultDraft();
  contact.site.email = "ungueltig";
  contact.site.phone = "";
  const contactResult = evaluateReadiness(contact).results.find((item) => item.id === "contact:methods:missing");
  assert.deepEqual(contactResult?.target, { kind: "field", field: "site.email" });
});\n'''
    readiness_tests.write_text(text)

export_tests = Path("tests/export-preflight.test.mjs")
text = export_tests.read_text()
marker = 'test("early exits release the active controller and repeated panel activation keeps one generation"'
if marker not in text:
    text += '''\n\ntest("early exits release the active controller and repeated panel activation keeps one generation", async () => {
  const blocked = controllerFixture();
  blocked.draft.site.name = "";
  await blocked.controller.prepare();
  assert.equal(blocked.controller.activeController, null);
  blocked.controller.destroy();

  let resolveFetch;
  const pending = controllerFixture({ fetchAsset: () => new Promise((resolve) => { resolveFetch = resolve; }) });
  pending.controller.setPanelVisible(true);
  await wait(10);
  assert.equal(pending.controller.generation, 1);
  pending.controller.setPanelVisible(true);
  await wait(10);
  assert.equal(pending.controller.generation, 1);
  resolveFetch(imageResponse());
  await wait(20);
  assert.equal(pending.controller.state.status, "ready");
  pending.controller.destroy();
});

test("synchronous asset loader failures remain current-generation asset errors", async () => {
  const fixture = controllerFixture({ fetchAsset: () => { throw new Error("synchronous fetch failure"); } });
  const state = await fixture.controller.prepare();
  assert.equal(state.status, "ready");
  assert.equal(state.result.imageEmbedded, false);
  assert.equal(fixture.controller.activeController, null);
  fixture.controller.destroy();
});\n'''
    export_tests.write_text(text)

browser_tests = Path("tests/export-preflight-e2e.test.mjs")
text = browser_tests.read_text()
old = '''    const blocker = await page.$('#readinessList [data-editor-target*="site.name"]');
    assert.ok(blocker);
    await blocker.click();'''
new = '''    const blocker = await page.$('#readinessList [data-editor-target*="site.name"]');
    assert.ok(blocker);
    const blockerSemantics = await blocker.evaluate((node) => ({
      ariaLabel: node.getAttribute("aria-label"),
      text: node.textContent.replace(/\\s+/g, " ").trim(),
      action: node.querySelector(".visually-hidden")?.textContent.trim(),
    }));
    assert.equal(blockerSemantics.ariaLabel, null);
    assert.match(blockerSemantics.text, /Trage einen Namen ein/);
    assert.equal(blockerSemantics.action, "bearbeiten");
    await blocker.click();'''
if old not in text:
    raise SystemExit("browser blocker block not found")
browser_tests.write_text(text.replace(old, new))
