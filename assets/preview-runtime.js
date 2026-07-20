import { PREVIEW_CHANNEL, PREVIEW_PROTOCOL_VERSION, isPreviewMessageEnvelope, parseReadyMessage, parseUpdateResult, } from "./preview-contract.js";
import { planPreviewUpdate } from "./preview-update-planner.js";
import { buildWebsiteHtml } from "./website.js";
const COALESCE_MS = 40;
const PATCH_TIMEOUT_MS = 350;
const READY_TIMEOUT_MS = 2_000;
export class PreviewRuntime {
    frame;
    readDraft;
    readRevision;
    readScroll;
    writeInstanceId;
    parentOrigin;
    createId;
    instanceIdValue = "";
    renderGenerationValue = 0;
    appliedRevisionValue = 0;
    desiredRevisionValue = 0;
    fullRenderRevision = 0;
    ready = false;
    pendingMutations = [];
    inFlight = null;
    coalesceTimer = null;
    readyTimer = null;
    destroyed = false;
    constructor(options) {
        this.frame = options.frame;
        this.readDraft = options.readDraft;
        this.readRevision = options.readRevision;
        this.readScroll = options.readScroll;
        this.writeInstanceId = options.writeInstanceId;
        this.parentOrigin = options.parentOrigin ?? (location.origin === "null" ? "*" : location.origin);
        this.createId = options.createId ?? defaultId;
        this.desiredRevisionValue = this.readRevision();
    }
    get instanceId() { return this.instanceIdValue; }
    get renderGeneration() { return this.renderGenerationValue; }
    get appliedRevision() { return this.appliedRevisionValue; }
    get desiredRevision() { return this.desiredRevisionValue; }
    get hasInFlightRequest() { return this.inFlight !== null; }
    start() { this.startFullRender(1); }
    renderFull() { this.startFullRender(1); }
    enqueue(event) {
        if (this.destroyed)
            return;
        this.desiredRevisionValue = Math.max(this.desiredRevisionValue, event.mutation.revision);
        this.pendingMutations.push(event.mutation);
        if (this.ready)
            this.scheduleFlush(COALESCE_MS);
    }
    handleMessage(event) {
        if (this.destroyed || event.source !== this.frame.contentWindow || event.origin !== "null")
            return false;
        if (!isPreviewMessageEnvelope(event.data, this.instanceIdValue, this.renderGenerationValue))
            return false;
        const ready = parseReadyMessage(event.data, this.instanceIdValue, this.renderGenerationValue);
        if (ready) {
            if (this.ready || ready.revision !== this.fullRenderRevision || ready.revision < this.appliedRevisionValue)
                return true;
            this.clearReadyTimer();
            this.ready = true;
            this.appliedRevisionValue = ready.revision;
            this.pendingMutations = this.pendingMutations.filter((mutation) => mutation.revision > ready.revision);
            if (this.desiredRevisionValue > this.appliedRevisionValue)
                this.scheduleFlush(0);
            return true;
        }
        const result = parseUpdateResult(event.data, this.instanceIdValue, this.renderGenerationValue);
        if (!result)
            return false;
        const active = this.inFlight;
        if (!active || result.requestId !== active.requestId)
            return true;
        clearTimeout(active.timeout);
        this.inFlight = null;
        if (!result.success || result.revision !== active.revision) {
            this.startFullRender(1);
            return true;
        }
        this.appliedRevisionValue = result.revision;
        if (this.desiredRevisionValue > this.appliedRevisionValue || this.pendingMutations.length)
            this.scheduleFlush(0);
        return true;
    }
    destroy() {
        this.destroyed = true;
        this.invalidateInFlight();
        this.clearReadyTimer();
        if (this.coalesceTimer)
            clearTimeout(this.coalesceTimer);
        this.coalesceTimer = null;
    }
    scheduleFlush(delay) {
        if (this.destroyed || !this.ready || this.inFlight || this.coalesceTimer)
            return;
        this.coalesceTimer = setTimeout(() => { this.coalesceTimer = null; this.flushPending(); }, delay);
    }
    flushPending() {
        if (this.destroyed || !this.ready || this.inFlight)
            return;
        const mutations = this.pendingMutations.filter((mutation) => mutation.revision > this.appliedRevisionValue);
        if (!mutations.length) {
            if (this.desiredRevisionValue > this.appliedRevisionValue)
                this.startFullRender(1);
            return;
        }
        const revision = Math.max(...mutations.map((mutation) => mutation.revision));
        let plan;
        try {
            plan = planPreviewUpdate(mutations, this.readDraft(), {
                previewInstanceId: this.instanceIdValue,
                parentOrigin: this.parentOrigin,
                previewScroll: this.readScroll(),
                revision,
                renderGeneration: this.renderGenerationValue,
            });
        }
        catch (error) {
            console.warn("Preview update planning failed; rebuilding the preview.", error);
            this.startFullRender(1);
            return;
        }
        if (plan.kind === "full") {
            this.startFullRender(1);
            return;
        }
        this.pendingMutations = this.pendingMutations.filter((mutation) => mutation.revision > plan.revision);
        const requestId = this.createId();
        const request = {
            channel: PREVIEW_CHANNEL,
            version: PREVIEW_PROTOCOL_VERSION,
            instanceId: this.instanceIdValue,
            renderGeneration: this.renderGenerationValue,
            requestId,
            baseRevision: this.appliedRevisionValue,
            revision: plan.revision,
            action: "apply-update",
            operations: plan.operations,
        };
        const target = this.frame.contentWindow;
        if (!target) {
            this.startFullRender(1);
            return;
        }
        const timeout = setTimeout(() => {
            if (this.inFlight?.requestId !== requestId)
                return;
            this.inFlight = null;
            this.startFullRender(1);
        }, PATCH_TIMEOUT_MS);
        this.inFlight = { requestId, revision: plan.revision, timeout };
        target.postMessage(request, "*");
    }
    startFullRender(readyRetries) {
        if (this.destroyed)
            return;
        this.invalidateInFlight();
        if (this.coalesceTimer)
            clearTimeout(this.coalesceTimer);
        this.coalesceTimer = null;
        this.clearReadyTimer();
        this.ready = false;
        this.renderGenerationValue += 1;
        this.instanceIdValue = this.createId();
        this.writeInstanceId(this.instanceIdValue);
        const revision = this.readRevision();
        this.fullRenderRevision = revision;
        this.desiredRevisionValue = Math.max(this.desiredRevisionValue, revision);
        this.pendingMutations = this.pendingMutations.filter((mutation) => mutation.revision > revision);
        this.frame.srcdoc = buildWebsiteHtml(structuredClone(this.readDraft()), {
            preview: true,
            previewInstanceId: this.instanceIdValue,
            parentOrigin: this.parentOrigin,
            previewScroll: this.readScroll(),
            previewRevision: revision,
            renderGeneration: this.renderGenerationValue,
        });
        const generation = this.renderGenerationValue;
        const instanceId = this.instanceIdValue;
        this.readyTimer = setTimeout(() => {
            if (this.destroyed || this.ready || generation !== this.renderGenerationValue || instanceId !== this.instanceIdValue)
                return;
            this.readyTimer = null;
            if (readyRetries > 0)
                this.startFullRender(readyRetries - 1);
        }, READY_TIMEOUT_MS);
    }
    invalidateInFlight() {
        if (this.inFlight)
            clearTimeout(this.inFlight.timeout);
        this.inFlight = null;
    }
    clearReadyTimer() { if (this.readyTimer)
        clearTimeout(this.readyTimer); this.readyTimer = null; }
}
function defaultId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
        return crypto.randomUUID();
    return `preview-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
