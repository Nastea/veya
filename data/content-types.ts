export type ContentAsset = {
  id: string;
  type: "image" | "video";
  label: string;
  color: string;
};

export type ContentTask = {
  id: string;
  label: string;
  completed: boolean;
};

/** Planning / details format — drives media UI on the content page. */
export type ContentFormat = "Post" | "Reel" | "Carousel";
export type ContentStatus = "Idea" | "Planned" | "Filmed" | "Done";

export type InstagramProfile = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  active: boolean;
};

/** Editable fields for a content item (mock / future API shape). */
export type ContentItemFields = {
  externalId: string;
  importSource: string;
  title: string;
  autosaveText: string;
  assignee: string;
  status: ContentStatus;
  contentType: ContentFormat;
  instagramProfileId: string;
  /** @deprecated legacy alias, normalized to instagramProfileId */
  profileId?: string;
  project: string;
  platform: readonly string[];
  script: string;
  description: string;
  notes: string;
  assetSource: string;
  driveLink: string;
  assetFolderUrl: string;
  coverImageUrl: string;
  /** Link to source files in Drive (mock URL). */
  googleDriveUrl: string;
  /**
   * Post: hero asset id (defaults to first asset).
   * Carousel: ignored for ordering — use `carouselAssetOrder`.
   */
  primaryAssetId?: string;
  /** Reel: main video asset id (defaults to first video in `assets`). */
  primaryVideoAssetId?: string;
  /** Reel: optional cover still id. */
  coverAssetId?: string;
  /** Carousel: slide order by asset id (defaults to `assets` order). */
  carouselAssetOrder?: readonly string[];
  /** ISO 8601 date-time for planning views (optional for unscheduled ideas). */
  scheduledAt?: string;
  /** Human-readable schedule for the details panel. */
  scheduledDate?: string;
  filmingDate?: string;
  caption: string;
  hashtags: string;
  filesSummary: string;
  ready: boolean;
  includeInPreview: boolean;
};

export type ContentItemBundle = {
  id: string;
  item: ContentItemFields;
  assets: ContentAsset[];
  tasks: ContentTask[];
};
