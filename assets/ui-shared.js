function requiredElement(id) {
    const element = document.getElementById(id);
    if (!element)
        throw new Error(`MISSING_ELEMENT:${id}`);
    return element;
}
export function createUiContext(store, repository) {
    return {
        store,
        repository,
        surfaceCard: requiredElement("surfaceCard"),
        workspace: document.querySelector(".workspace"),
        controlSurface: document.querySelector(".control-surface"),
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
