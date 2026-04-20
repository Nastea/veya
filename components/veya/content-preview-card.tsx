"use client";

import { CirclePlay } from "lucide-react";

import type { ContentAsset, ContentItemFields } from "@/data/content-types";
import { resolvePreviewAsset } from "@/lib/content-asset-helpers";

type ContentPreviewCardProps = {
  title: string;
  item: ContentItemFields;
  assets: ContentAsset[];
  aspectClassName?: string;
  variant?: "calendar" | "feed" | "ideas";
};

export function ContentPreviewCard({
  title,
  item,
  assets,
  aspectClassName = "aspect-[4/5]",
  variant = "ideas"
}: ContentPreviewCardProps) {
  const preview = resolvePreviewAsset(item, assets);
  const hasCoverImage = Boolean(item.coverImageUrl);
  const isFeed = variant === "feed";
  const feedShowsPlaceholder = isFeed && !hasCoverImage;
  const effectivePreview = isFeed ? undefined : preview;
  const isVideo = preview?.type === "video";
  const reelVideoFallback = item.contentType === "Reel" && isVideo && !item.coverAssetId && !hasCoverImage;

  return (
    <div
      className={[
        "relative overflow-hidden bg-gradient-to-br ring-1 ring-inset ring-zinc-900/[0.04]",
        aspectClassName,
        effectivePreview?.color ?? "from-zinc-100 to-zinc-50"
      ].join(" ")}
    >
      {hasCoverImage ? (
        <img src={item.coverImageUrl} alt={title} className="absolute inset-0 h-full w-full object-cover" />
      ) : feedShowsPlaceholder || !effectivePreview ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#f1f1f3] px-7 text-center">
          <p className="text-balance text-lg font-medium leading-snug tracking-tight text-zinc-500 sm:text-xl">{title}</p>
        </div>
      ) : null}

      {variant === "feed" && isVideo && !hasCoverImage && !feedShowsPlaceholder ? (
        <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-sm">
          <CirclePlay className="h-4 w-4" strokeWidth={1.5} />
        </div>
      ) : null}

      {reelVideoFallback && !feedShowsPlaceholder ? (
        <span
          className={[
            "absolute left-3 rounded-md border px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm",
            variant === "feed"
              ? "top-3 border-white/25 bg-white/70 text-zinc-700"
              : "bottom-3 border-white/30 bg-white/80 text-zinc-700"
          ].join(" ")}
        >
          Video preview
        </span>
      ) : null}
    </div>
  );
}
