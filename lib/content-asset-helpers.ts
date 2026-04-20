import type { ContentAsset, ContentItemFields } from "@/data/content-types";

export function getAssetMap(assets: ContentAsset[]): Map<string, ContentAsset> {
  return new Map(assets.map((a) => [a.id, a]));
}

export function orderedCarouselAssets(
  assets: ContentAsset[],
  order: readonly string[] | undefined
): ContentAsset[] {
  if (!order?.length) return [...assets];
  const map = getAssetMap(assets);
  const ordered = order.map((id) => map.get(id)).filter(Boolean) as ContentAsset[];
  const rest = assets.filter((a) => !order.includes(a.id));
  return [...ordered, ...rest];
}

export function resolvePostPrimary(item: ContentItemFields, assets: ContentAsset[]): ContentAsset | undefined {
  if (item.primaryAssetId) {
    const found = assets.find((a) => a.id === item.primaryAssetId);
    if (found) return found;
  }
  return assets[0];
}

export function resolveReelVideo(item: ContentItemFields, assets: ContentAsset[]): ContentAsset | undefined {
  if (item.primaryVideoAssetId) {
    const found = assets.find((a) => a.id === item.primaryVideoAssetId);
    if (found) return found;
  }
  const firstVideo = assets.find((a) => a.type === "video");
  return firstVideo ?? assets[0];
}

export function resolveReelCover(item: ContentItemFields, assets: ContentAsset[]): ContentAsset | undefined {
  if (!item.coverAssetId) return undefined;
  return assets.find((a) => a.id === item.coverAssetId);
}

/**
 * Shared preview resolver for list/grid surfaces.
 * - Post: primary asset (or first).
 * - Reel: cover first; fallback to primary video.
 * - Carousel: first asset from carousel order.
 */
export function resolvePreviewAsset(item: ContentItemFields, assets: ContentAsset[]): ContentAsset | undefined {
  if (assets.length === 0) return undefined;

  if (item.contentType === "Post") {
    return resolvePostPrimary(item, assets);
  }

  if (item.contentType === "Reel") {
    return resolveReelCover(item, assets) ?? resolveReelVideo(item, assets);
  }

  const ordered = orderedCarouselAssets(assets, item.carouselAssetOrder);
  return ordered[0] ?? assets[0];
}

export function hasScheduledDate(item: ContentItemFields): item is ContentItemFields & { scheduledAt: string } {
  return typeof item.scheduledAt === "string" && item.scheduledAt.length > 0;
}
