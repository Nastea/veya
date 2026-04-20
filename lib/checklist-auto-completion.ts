import type { ContentAsset, ContentItemFields, ContentTask } from "@/data/content-types";

type ChecklistConditionState = {
  caption: boolean;
  video: boolean;
  cover: boolean;
  carouselSlides: boolean;
  photo: boolean;
};

function computeConditionState(item: ContentItemFields, assets: ContentAsset[]): ChecklistConditionState {
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  const primary = item.primaryAssetId ? byId.get(item.primaryAssetId) : undefined;
  const primaryVideo = item.primaryVideoAssetId ? byId.get(item.primaryVideoAssetId) : undefined;
  const cover = item.coverAssetId ? byId.get(item.coverAssetId) : undefined;

  return {
    caption: item.caption.trim().length > 0,
    video: item.contentType === "Reel" && primaryVideo?.type === "video",
    cover: item.contentType === "Reel" && !!cover,
    carouselSlides: item.contentType === "Carousel" && (item.carouselAssetOrder?.length ?? 0) > 0,
    photo: item.contentType === "Post" && primary?.type === "image"
  };
}

function shouldAutoComplete(label: string, prev: ChecklistConditionState, next: ChecklistConditionState): boolean {
  const normalized = label.trim().toLowerCase();
  if (normalized === "caption") return !prev.caption && next.caption;
  if (normalized === "video") return !prev.video && next.video;
  if (normalized === "cover") return !prev.cover && next.cover;
  if (normalized === "carousel slides") return !prev.carouselSlides && next.carouselSlides;
  if (normalized === "photo") return !prev.photo && next.photo;
  return false;
}

/**
 * Auto-complete production checklist items when underlying requirements become true.
 * Transition-based behavior keeps manual unchecking possible while conditions stay true.
 */
export function applyChecklistAutoCompletion(
  tasks: ContentTask[],
  nextItem: ContentItemFields,
  assets: ContentAsset[],
  prevItem?: ContentItemFields
): ContentTask[] {
  const prevState = prevItem
    ? computeConditionState(prevItem, assets)
    : { caption: false, video: false, cover: false, carouselSlides: false, photo: false };
  const nextState = computeConditionState(nextItem, assets);

  return tasks.map((task) => {
    if (task.completed) return task;
    if (!shouldAutoComplete(task.label, prevState, nextState)) return task;
    return { ...task, completed: true };
  });
}
