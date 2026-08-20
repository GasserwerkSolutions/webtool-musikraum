import { compileSiteBundle, } from "../vendor/build-edit-core.mjs";
import { adaptMusicraumDraft } from "./build-edit-adapter.js";
import { renderMusicraumWebsiteHtml } from "./website-main.js";
import { mediaFromResolved, websiteModelFromResolved } from "./website-model.js";
export function compileMusicraumSite(draft, options = {}) {
    const adapted = adaptMusicraumDraft(draft);
    const { sourceRevision, ...renderOptions } = options;
    const bundle = compileSiteBundle(adapted.input, {
        buildTime: draft.updatedAt,
        sourceRevision: sourceRevision ?? draft.updatedAt,
        diagnostics: adapted.diagnostics.map((entry) => ({ ...entry, path: [...entry.path] })),
        adapter: {
            id: adapted.provenance.adapterId,
            version: adapted.provenance.adapterVersion,
            sourceSchemaVersion: adapted.provenance.sourceSchemaVersion,
        },
        renderPage(page, resolved) {
            return renderResolvedMusicraumPage(page, resolved, renderOptions);
        },
    });
    const document = bundle.documents.find((entry) => entry.route === "/") ?? bundle.documents[0];
    const file = document ? bundle.files.find((entry) => entry.path === document.path) : undefined;
    if (!file || file.mediaType !== "text/html" || !file.content)
        throw new Error("MUSICRAUM_BUNDLE: no renderable HTML document");
    return { bundle, html: file.content };
}
export function compileMusicraumWebsiteHtml(draft, options = {}) {
    return compileMusicraumSite(draft, options).html;
}
function renderResolvedMusicraumPage(page, resolved, options) {
    const media = mediaFromResolved(resolved);
    const merged = { ...options };
    const hero = options.heroImageUrl ?? media.hero;
    const portrait = options.portraitImageUrl ?? media.portrait;
    const detail = options.detailImageUrl ?? media.detail;
    if (hero)
        merged.heroImageUrl = hero;
    if (portrait)
        merged.portraitImageUrl = portrait;
    if (detail)
        merged.detailImageUrl = detail;
    return renderMusicraumWebsiteHtml(websiteModelFromResolved(page, resolved), merged);
}
