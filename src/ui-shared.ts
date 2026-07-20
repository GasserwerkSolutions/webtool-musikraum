import type { DraftRepository } from "./persistence.js";
import type { PreviewRuntime } from "./preview-runtime.js";
import type { BuilderStore } from "./store.js";
import type { PreviewScrollState } from "./preview-contract.js";
import type { ExportPreflightController, ExportPreparationState } from "./export-preflight.js";

export type UiContext = {
  store: BuilderStore;
  repository: DraftRepository;
  surfaceCard: HTMLElement;
  workspace: HTMLElement;
  controlSurface: HTMLElement;
  previewArea: HTMLElement;
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
  mobileModeSwitch: HTMLElement;
  mobileModeButtons: readonly HTMLButtonElement[];
  mobileMode: "edit" | "preview";
  mobileModesActive: boolean;
  mobileEditorScroll: number;
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
};

function requiredElement<T extends Element>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`MISSING_ELEMENT:${id}`);
  return element as unknown as T;
}

export function createUiContext(store: BuilderStore, repository: DraftRepository): UiContext {
  const controlSurface = document.querySelector<HTMLElement>(".control-surface");
  const previewArea = document.querySelector<HTMLElement>(".preview-area");
  if (!controlSurface || !previewArea) throw new Error("MISSING_EDITOR_SURFACES");
  controlSurface.id ||= "editorSurface";
  previewArea.id ||= "previewSurface";
  const mobileModeSwitch = ensureMobileModeSwitch(controlSurface.id, previewArea.id);
  const mobileModeButtons = [...mobileModeSwitch.querySelectorAll<HTMLButtonElement>("[data-mobile-mode]")];
  if (mobileModeButtons.length !== 2) throw new Error("MISSING_MOBILE_MODE_BUTTONS");
  return {
    store,
    repository,
    surfaceCard: requiredElement("surfaceCard"),
    workspace: document.querySelector(".workspace") as HTMLElement,
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

function ensureMobileModeSwitch(editorId: string, previewId: string): HTMLElement {
  const existing = document.getElementById("mobileModeSwitch");
  if (existing) return existing;
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

export function getAtPath(object: unknown, path: string): unknown { return path.split(".").reduce<unknown>((value, key) => value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined, object); }
export function setAtPath(object: object, path: string, value: unknown): void {
  const keys = path.split("."); const last = keys.pop(); if (!last) return; let target = object as Record<string, unknown>;
  for (const key of keys) { const next = target[key]; if (!next || typeof next !== "object" || Array.isArray(next)) throw new Error(`INVALID_BIND_PATH:${path}`); target = next as Record<string, unknown>; }
  if (!(last in target)) throw new Error(`UNKNOWN_BIND_PATH:${path}`); target[last] = value;
}
export function inputValue(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string | boolean { return input instanceof HTMLInputElement && input.type === "checkbox" ? input.checked : input.value; }
