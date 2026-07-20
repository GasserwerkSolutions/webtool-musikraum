function requiredElement(id) {
    const element = document.getElementById(id);
    if (!element)
        throw new Error(`MISSING_ELEMENT:${id}`);
    return element;
}
export function createUiContext(store, repository) {
    const controlSurface = document.querySelector(".control-surface");
    const previewArea = document.querySelector(".preview-area");
    if (!controlSurface || !previewArea)
        throw new Error("MISSING_EDITOR_SURFACES");
    controlSurface.id ||= "editorSurface";
    previewArea.id ||= "previewSurface";
    const mobileModeSwitch = ensureMobileModeSwitch(controlSurface.id, previewArea.id);
    const mobileModeButtons = [...mobileModeSwitch.querySelectorAll("[data-mobile-mode]")];
    if (mobileModeButtons.length !== 2)
        throw new Error("MISSING_MOBILE_MODE_BUTTONS");
    return {
        store,
        repository,
        surfaceCard: requiredElement("surfaceCard"),
        workspace: document.querySelector(".workspace"),
        controlSurface,
        previewArea,
        surfaceStage: requiredElement("surfaceStage"),
        sidebarToggle: requiredElement("sidebarToggle"),
        sidebarResizer: requiredElement("sidebarResizer"),
        previewFrame: requiredElement("previewFrame"),
        previewHint: requiredElement("previewHint"),
        saveStatus: requiredElement("saveStatus"),
        panelStatus: requiredElement("panelStatus"),
        undoButton: requiredElement("undoButton"),
        redoButton: requiredElement("redoButton"),
        backupInput: requiredElement("backupInput"),
        announcer: requiredElement("editorAnnouncer"),
        mobileModeSwitch,
        mobileModeButtons,
        mobileMode: "edit",
        mobileModesActive: false,
        mobileEditorScroll: 0,
        heroPointList: requiredElement("heroPointList"),
        introPointList: requiredElement("introPointList"),
        offerList: requiredElement("offerList"),
        structureList: requiredElement("structureList"),
        contentOverviewList: requiredElement("contentOverviewList"),
        readinessSummary: requiredElement("readinessSummary"),
        readinessList: requiredElement("readinessList"),
        exportStatus: requiredElement("exportStatus"),
        textItemTemplate: requiredElement("textItemTemplate"),
        offerTemplate: requiredElement("offerTemplate"),
        previewTimer: null,
        previewRuntime: null,
        exportController: null,
        exportState: { status: "idle" },
        suppressPreview: false,
        previewInstanceId: "",
        previewScroll: null,
        volatileStorage: false,
    };
}
function ensureMobileModeSwitch(editorId, previewId) {
    const existing = document.getElementById("mobileModeSwitch");
    if (existing)
        return existing;
    const switcher = document.createElement("div");
    switcher.id = "mobileModeSwitch";
    switcher.className = "mobile-mode-switch";
    switcher.hidden = true;
    switcher.setAttribute("role", "group");
    switcher.setAttribute("aria-label", "Mobile Ansicht wechseln");
    switcher.innerHTML = `<button class="mobile-mode-switch__button is-active" type="button" data-mobile-mode="edit" aria-controls="${editorId}" aria-pressed="true"><span aria-hidden="true">✎</span><strong>Bearbeiten</strong></button><button class="mobile-mode-switch__button" type="button" data-mobile-mode="preview" aria-controls="${previewId}" aria-pressed="false"><span aria-hidden="true">◇</span><strong>Vorschau</strong></button>`;
    document.querySelector(".topbar")?.insertAdjacentElement("afterend", switcher);
    return switcher;
}
export function getAtPath(object, path) { return path.split(".").reduce((value, key) => value && typeof value === "object" ? value[key] : undefined, object); }
export function setAtPath(object, path, value) {
    const keys = path.split(".");
    const last = keys.pop();
    if (!last)
        return;
    let target = object;
    for (const key of keys) {
        const next = target[key];
        if (!next || typeof next !== "object" || Array.isArray(next))
            throw new Error(`INVALID_BIND_PATH:${path}`);
        target = next;
    }
    if (!(last in target))
        throw new Error(`UNKNOWN_BIND_PATH:${path}`);
    target[last] = value;
}
export function inputValue(input) { return input instanceof HTMLInputElement && input.type === "checkbox" ? input.checked : input.value; }
