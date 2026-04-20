import type { ContentItemBundle } from "./content-types";

/** Starts empty; user-created items are persisted in sessionStorage. */
export const contentItemBundles: ContentItemBundle[] = [];

export function getContentById(id: string): ContentItemBundle | undefined {
  return contentItemBundles.find((b) => b.id === id);
}

export function listContentItems(): ContentItemBundle[] {
  return [...contentItemBundles];
}

export function getDefaultContentId(): string | null {
  return contentItemBundles[0]?.id ?? null;
}

export function getFeedPreviewItems(): ContentItemBundle[] {
  return contentItemBundles.filter((b) => b.item.includeInPreview);
}
