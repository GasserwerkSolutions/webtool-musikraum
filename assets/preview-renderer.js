import { buildWebsiteHtml } from "./website.js";
export function renderPreviewRegions(regions, draft, options) {
    const parser = new DOMParser();
    const html = buildWebsiteHtml(structuredClone(draft), {
        preview: true,
        previewInstanceId: options.previewInstanceId,
        parentOrigin: options.parentOrigin,
        previewScroll: options.previewScroll,
        previewRevision: options.revision,
        renderGeneration: options.renderGeneration,
    });
    const document = parser.parseFromString(html, "text/html");
    const rendered = new Map();
    for (const region of new Set(regions)) {
        const matches = [...document.querySelectorAll("[data-preview-region]")].filter((element) => element.dataset.previewRegion === region);
        if (matches.length !== 1 || !matches[0])
            throw new Error(`PREVIEW_REGION_RENDER_FAILED:${region}`);
        rendered.set(region, matches[0].outerHTML);
    }
    return rendered;
}
