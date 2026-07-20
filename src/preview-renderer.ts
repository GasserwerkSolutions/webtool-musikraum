import type { MusicraumDraft } from "./domain.js";
import type { PreviewRegion, PreviewScrollState } from "./preview-contract.js";
import { buildWebsiteHtml } from "./website.js";

export type PreviewRenderOptions = {
  previewInstanceId: string;
  parentOrigin: string;
  previewScroll: PreviewScrollState | null;
  revision: number;
  renderGeneration: number;
};

export function renderPreviewRegions(regions: readonly PreviewRegion[], draft: Readonly<MusicraumDraft>, options: PreviewRenderOptions): ReadonlyMap<PreviewRegion, string> {
  const parser = new DOMParser();
  const html = buildWebsiteHtml(structuredClone(draft) as MusicraumDraft, {
    preview: true,
    previewInstanceId: options.previewInstanceId,
    parentOrigin: options.parentOrigin,
    previewScroll: options.previewScroll,
    previewRevision: options.revision,
    renderGeneration: options.renderGeneration,
  });
  const document = parser.parseFromString(html, "text/html");
  const rendered = new Map<PreviewRegion, string>();
  for (const region of new Set(regions)) {
    const matches = [...document.querySelectorAll<HTMLElement>("[data-preview-region]")].filter((element) => element.dataset.previewRegion === region);
    if (matches.length !== 1 || !matches[0]) throw new Error(`PREVIEW_REGION_RENDER_FAILED:${region}`);
    rendered.set(region, matches[0].outerHTML);
  }
  return rendered;
}
