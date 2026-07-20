import { cloneDraft, normalizeEmail, normalizePhone, slugify } from "./domain.js";
import { evaluateReadiness } from "./readiness.js";
import { buildWebsiteHtml, MUSICRAUM_HERO_URL } from "./website.js";
export const EXPORT_ASSET_TIMEOUT_MS = 8_000;
export const EXPORT_ASSET_MAX_BYTES = 5 * 1024 * 1024;
export const EXPORT_QUIET_WINDOW_MS = 500;
export const EXPORT_IMAGE_MIME_TYPES = new Set(["image/webp", "image/jpeg", "image/png", "image/avif"]);
export class ExportAssetError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = "ExportAssetError";
    }
}
export class ExportPreflightController {
    options;
    stateValue = { status: "idle" };
    exportGeneration = 0;
    activeController = null;
    quietTimer = null;
    panelVisible = false;
    fetchAsset;
    buildHtml;
    createObjectUrl;
    revokeObjectUrl;
    clickDownload;
    assetTimeoutMs;
    quietWindowMs;
    liveObjectUrl = null;
    revokeTimer = null;
    constructor(options) {
        this.options = options;
        this.fetchAsset = options.fetchAsset ?? fetch.bind(globalThis);
        this.buildHtml = options.buildHtml ?? buildWebsiteHtml;
        this.createObjectUrl = options.createObjectUrl ?? ((blob) => URL.createObjectURL(blob));
        this.revokeObjectUrl = options.revokeObjectUrl ?? ((url) => URL.revokeObjectURL(url));
        this.clickDownload = options.clickDownload ?? defaultClickDownload;
        this.assetTimeoutMs = options.assetTimeoutMs ?? EXPORT_ASSET_TIMEOUT_MS;
        this.quietWindowMs = options.quietWindowMs ?? EXPORT_QUIET_WINDOW_MS;
    }
    get state() { return this.stateValue; }
    get generation() { return this.exportGeneration; }
    setPanelVisible(visible) {
        this.panelVisible = visible;
        this.clearQuietTimer();
        if (!visible) {
            if (this.stateValue.status === "preparing") {
                this.abortActive();
                this.setState({ status: "idle" });
            }
            return;
        }
        if (this.stateValue.status === "ready" && this.stateValue.revision === this.options.readRevision())
            return;
        this.schedulePreparation(0);
    }
    notifyMutation(revision) {
        this.clearQuietTimer();
        this.abortActive();
        this.setState({ status: "stale", generation: this.exportGeneration, revision });
        if (this.panelVisible)
            this.schedulePreparation(this.quietWindowMs);
    }
    async prepare() {
        this.clearQuietTimer();
        this.abortActive();
        const generation = ++this.exportGeneration;
        const revision = this.options.readRevision();
        const controller = new AbortController();
        this.activeController = controller;
        this.setState({ status: "preparing", generation, revision });
        const draft = cloneDraft(this.options.readDraft());
        const readiness = evaluateReadiness(draft);
        if (!readiness.ready) {
            if (this.isCurrent(generation, revision, controller.signal))
                this.setState({ status: "failed", generation, revision, message: `${readiness.errorCount} ${readiness.errorCount === 1 ? "Blocker verhindert" : "Blocker verhindern"} den Export.` });
            return this.stateValue;
        }
        let heroImageUrl = MUSICRAUM_HERO_URL;
        let imageEmbedded = true;
        try {
            heroImageUrl = await fetchPinnedHeroImage(this.fetchAsset, controller.signal, { timeoutMs: this.assetTimeoutMs });
        }
        catch (error) {
            if (isAbortError(error) || !this.isCurrent(generation, revision, controller.signal))
                return this.stateValue;
            if (!(error instanceof ExportAssetError))
                console.warn("Unexpected export asset failure.", error);
            imageEmbedded = false;
        }
        if (!this.isCurrent(generation, revision, controller.signal))
            return this.stateValue;
        try {
            const html = this.buildHtml(draft, { heroImageUrl });
            const blob = new Blob([html], { type: "text/html;charset=utf-8" });
            const result = {
                filename: `${slugify(draft.site.name || "musikraum")}.html`,
                blob,
                byteSize: blob.size,
                imageEmbedded,
                readiness,
                visibleSectionCount: draft.layout.order.filter((section) => draft.layout.visibility[section]).length,
                validOfferCount: draft.offers.filter((offer) => offer.title.trim()).length,
                contactMethodCount: Number(Boolean(normalizeEmail(draft.site.email))) + Number(Boolean(normalizePhone(draft.site.phone))),
            };
            if (this.isCurrent(generation, revision, controller.signal))
                this.setState({ status: "ready", generation, revision, result });
        }
        catch (error) {
            if (this.isCurrent(generation, revision, controller.signal))
                this.setState({ status: "failed", generation, revision, message: error instanceof Error ? error.message : "Die Exportdatei konnte nicht erzeugt werden." });
        }
        finally {
            if (this.activeController === controller)
                this.activeController = null;
        }
        return this.stateValue;
    }
    download() {
        const state = this.stateValue;
        if (state.status !== "ready" || state.revision !== this.options.readRevision())
            return null;
        this.revokeDownloadUrl();
        const url = this.createObjectUrl(state.result.blob);
        this.liveObjectUrl = url;
        this.clickDownload(url, state.result.filename);
        this.revokeTimer = setTimeout(() => this.revokeDownloadUrl(), 1_000);
        return state.result;
    }
    destroy() {
        this.clearQuietTimer();
        this.abortActive();
        this.revokeDownloadUrl();
    }
    schedulePreparation(delay) {
        this.clearQuietTimer();
        this.quietTimer = setTimeout(() => { this.quietTimer = null; if (this.panelVisible)
            void this.prepare(); }, delay);
    }
    clearQuietTimer() { if (this.quietTimer)
        clearTimeout(this.quietTimer); this.quietTimer = null; }
    abortActive() { this.activeController?.abort(); this.activeController = null; }
    isCurrent(generation, revision, signal) { return generation === this.exportGeneration && revision === this.options.readRevision() && !signal.aborted; }
    setState(state) { this.stateValue = state; this.options.onState(state); }
    revokeDownloadUrl() {
        if (this.revokeTimer)
            clearTimeout(this.revokeTimer);
        this.revokeTimer = null;
        if (this.liveObjectUrl)
            this.revokeObjectUrl(this.liveObjectUrl);
        this.liveObjectUrl = null;
    }
}
export async function fetchPinnedHeroImage(fetchAsset, signal, options = {}) {
    const timeoutMs = options.timeoutMs ?? EXPORT_ASSET_TIMEOUT_MS;
    const maxBytes = options.maxBytes ?? EXPORT_ASSET_MAX_BYTES;
    if (signal.aborted)
        throw abortError();
    const controller = new AbortController();
    let timedOut = false;
    let timer = null;
    let abortFromParent = null;
    const timeout = new Promise((_resolve, reject) => {
        timer = setTimeout(() => { timedOut = true; controller.abort(); reject(new ExportAssetError("timeout", "Das Titelbild hat nicht innerhalb von 8 Sekunden geantwortet.")); }, timeoutMs);
    });
    const parentAbort = new Promise((_resolve, reject) => {
        abortFromParent = () => { controller.abort(); reject(abortError()); };
        signal.addEventListener("abort", abortFromParent, { once: true });
    });
    const request = fetchAsset(MUSICRAUM_HERO_URL, { signal: controller.signal });
    try {
        let response;
        try {
            response = await Promise.race([request, timeout, parentAbort]);
        }
        catch (error) {
            if (error instanceof ExportAssetError)
                throw error;
            if (signal.aborted)
                throw abortError();
            if (timedOut)
                throw new ExportAssetError("timeout", "Das Titelbild hat nicht innerhalb von 8 Sekunden geantwortet.");
            throw new ExportAssetError("network", error instanceof Error ? error.message : "Das Titelbild konnte nicht geladen werden.");
        }
        if (!response.ok)
            throw new ExportAssetError("http", `Das Titelbild antwortete mit HTTP ${response.status}.`);
        const mime = (response.headers.get("content-type") ?? "").split(";", 1)[0]?.trim().toLowerCase() ?? "";
        if (!EXPORT_IMAGE_MIME_TYPES.has(mime))
            throw new ExportAssetError("mime", `Der Bildtyp ${mime || "unbekannt"} darf nicht eingebettet werden.`);
        const declaredSize = Number(response.headers.get("content-length") ?? "0");
        if (Number.isFinite(declaredSize) && declaredSize > maxBytes)
            throw new ExportAssetError("size", "Das Titelbild überschreitet die Grenze von 5 MiB.");
        let blob;
        try {
            blob = await response.blob();
        }
        catch (error) {
            throw new ExportAssetError("read", error instanceof Error ? error.message : "Das Titelbild konnte nicht gelesen werden.");
        }
        if (blob.size > maxBytes)
            throw new ExportAssetError("size", "Das Titelbild überschreitet die Grenze von 5 MiB.");
        return await blobToDataUrl(blob, mime);
    }
    finally {
        if (timer)
            clearTimeout(timer);
        if (abortFromParent)
            signal.removeEventListener("abort", abortFromParent);
    }
}
async function blobToDataUrl(blob, mime) {
    if (typeof FileReader !== "undefined")
        return await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new ExportAssetError("read", "Das Titelbild konnte nicht in die Exportdatei geschrieben werden.")); reader.readAsDataURL(blob); });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000)
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    return `data:${mime};base64,${btoa(binary)}`;
}
function isAbortError(error) { return error instanceof DOMException ? error.name === "AbortError" : error instanceof Error && error.name === "AbortError"; }
function abortError() { return new DOMException("Export preparation aborted", "AbortError"); }
function defaultClickDownload(url, filename) { const link = document.createElement("a"); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); }
