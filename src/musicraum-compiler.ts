import {
  compileSiteBundle,
  type ResolvedPage,
  type ResolvedSite,
  type SiteBundle,
} from "../vendor/build-edit-core.mjs";
import { adaptMusicraumDraft } from "./build-edit-adapter.js";
import type { MusicraumDraft } from "./domain.js";
import type { BuildOptions } from "./website-contract.js";
import { renderMusicraumWebsiteHtml } from "./website-main.js";
import { mediaFromResolved, websiteModelFromResolved } from "./website-model.js";

export type MusicraumCompileOptions = BuildOptions & { sourceRevision?: string | number };
export type MusicraumCompilation = { bundle: SiteBundle; html: string };

export function compileMusicraumSite(draft: Readonly<MusicraumDraft>, options: MusicraumCompileOptions = {}): MusicraumCompilation {
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
  if (!file || file.mediaType !== "text/html" || !file.content) throw new Error("MUSICRAUM_BUNDLE: no renderable HTML document");
  return { bundle, html: file.content };
}

export function compileMusicraumWebsiteHtml(draft: Readonly<MusicraumDraft>, options: MusicraumCompileOptions = {}): string {
  return compileMusicraumSite(draft, options).html;
}

function renderResolvedMusicraumPage(page: ResolvedPage, resolved: ResolvedSite, options: BuildOptions): string {
  const media = mediaFromResolved(resolved);
  const merged: BuildOptions = { ...options };
  const hero = options.heroImageUrl ?? media.hero;
  const portrait = options.portraitImageUrl ?? media.portrait;
  const detail = options.detailImageUrl ?? media.detail;
  if (hero) merged.heroImageUrl = hero;
  if (portrait) merged.portraitImageUrl = portrait;
  if (detail) merged.detailImageUrl = detail;
  return renderMusicraumWebsiteHtml(websiteModelFromResolved(page, resolved), merged);
}
