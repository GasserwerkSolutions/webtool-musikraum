import type { PreviewScrollState } from "./preview-contract.js";

export type BuildOptions = {
  preview?: boolean;
  heroImageUrl?: string;
  portraitImageUrl?: string;
  detailImageUrl?: string;
  previewInstanceId?: string;
  parentOrigin?: string;
  previewScroll?: PreviewScrollState | null;
  previewRevision?: number;
  renderGeneration?: number;
};
