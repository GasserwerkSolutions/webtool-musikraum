import type { DraftRepository } from "./persistence.js";
import type { PreviewRuntime } from "./preview-runtime.js";
import type { BuilderStore } from "./store.js";
import type { PreviewScrollState } from "./preview-contract.js";
import type { ExportPreflightController, ExportPreparationState } from "./export-preflight.js";
import type { MobileMode } from "./mobile-modes.js";

export type UiContext = {
  store: BuilderStore;
  repository: DraftRepository;
  surfaceCard: HTMLElement;
  workspace: HTMLElement;
  controlSurface: HTMLElement;
  surfaceStage: HTMLElement;
  sidebarToggle: HTMLButtonElement;
  sidebarResizer: HTMLElement;
  previewFrame: HTMLIFrameElement;
  previewHint: HTMLElement;
  saveStatus: HTMLElement;
  panelStatus: HTMLElement;
  undoButton: HTMLButtonElement;
  redoButton: HTMLButtonElement;
  backupInput: HTMLInputElement;
  announcer: HTMLElement;
  heroPointList: HTMLElement;
  introPointList: HTMLElement;
  offerList: HTMLElement;
  structureList: HTMLElement;
  contentOverviewList: HTMLElement;
  readinessSummary: HTMLElement;
  readinessList: HTMLElement;
  exportStatus: HTMLElement;
  textItemTemplate: HTMLTemplateElement;
  offerTemplate: HTMLTemplateElement;
  previewTimer: ReturnType<typeof setTimeout> | null;
  previewRuntime: PreviewRuntime | null;
  exportController: ExportPreflightController | null;
  exportState: ExportPreparationState;
  suppressPreview: boolean;
  previewInstanceId: string;
  previewScroll: PreviewScrollState | null;
  volatileStorage: boolean;
  mobileMode?: MobileMode;
  mobileEditorScroll?: number;
};

function requiredElement<T extends Element>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`MISSING_ELEMENT:${id}`);
  return element as unknown as T;
}

export function createUiContext(store: BuilderStore, repository: DraftRepository): UiContext {
  return {
    store,
    repository,
    surfaceCard: requiredElement("surfaceCard"),
    workspace: document.querySelector(".workspace") as HTMLElement,
    controlSurface: document.querySelector(".control-surface") as HTMLElement,
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
    mobileMode: "edit",
    mobileEditorScroll: 0,
  };
}

export function getAtPath(object: unknown, path: string): unknown { return path.split(".").reduce<unknown>((value, key) => value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined, object); }
export function setAtPath(object: object, path: string, value: unknown): void {
  const keys = path.split("."); const last = keys.pop(); if (!last) return; let target = object as Record<string, unknown>;
  for (const key of keys) { const next = target[key]; if (!next || typeof next !== "object" || Array.isArray(next)) throw new Error(`INVALID_BIND_PATH:${path}`); target = next as Record<string, unknown>; }
  if (!(last in target)) throw new Error(`UNKNOWN_BIND_PATH:${path}`); target[last] = value;
}
export function inputValue(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string | boolean { return input instanceof HTMLInputElement && input.type === "checkbox" ? input.checked : input.value; }
