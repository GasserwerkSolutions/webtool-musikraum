export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type ResolvedPage = {
  id: string;
  title: string;
  description: string;
  slug: string;
  sections: Array<{ id: string; type: string; enabled: boolean; data: Record<string, JsonValue>; items: Array<Record<string, JsonValue>>; extensions: Record<string, JsonValue>; [key: string]: unknown }>;
  [key: string]: unknown;
};
export type ResolvedSite = {
  documentType: "resolved-site";
  site: Record<string, unknown>;
  theme: Record<string, unknown>;
  shared: Record<string, unknown>;
  pages: ResolvedPage[];
  assets: Record<string, JsonValue>;
  build: { timestamp: string };
  [key: string]: unknown;
};
export type BundleDiagnostic = { code: string; severity: "error" | "warning" | "info"; path: Array<string | number>; message: string; targetId?: string; hint?: string; details?: JsonValue };
export type SiteBundle = {
  schemaVersion: 1;
  documentType: "site-bundle";
  manifest: { compilerVersion: string; source: { revision: string | number }; readiness: { status: "ready" | "blocked"; errors: number; warnings: number; infos: number }; [key: string]: unknown };
  documents: Array<{ pageId: string; route: string; path: string; mediaType: "text/html"; sha256: string }>;
  assets: Array<{ id: string; path: string; mediaType: string; sha256: string }>;
  files: Array<{ path: string; mediaType: string; content: string; sha256: string }>;
  diagnostics: BundleDiagnostic[];
  integrity: { algorithm: "sha256"; digest: string };
};
export type CompileSiteBundleOptions = {
  strict?: boolean;
  buildTime?: string;
  sourceRevision?: string | number;
  diagnostics?: readonly BundleDiagnostic[];
  adapter?: { id: string; version: string; sourceSchemaVersion: string | number };
  renderPage?: (page: ResolvedPage, site: ResolvedSite) => string;
};
export declare const COMPILER_VERSION: "0.3.0";
export declare const CURRENT_BUNDLE_VERSION: 1;
export declare const CURRENT_SCHEMA_VERSION: 2;
export declare class SiteBundleError extends Error { diagnostics: BundleDiagnostic[]; }
export declare function compileSiteBundle(input: unknown, options?: CompileSiteBundleOptions): SiteBundle;
export declare function routeToFilePath(route: unknown): string;
