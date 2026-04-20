"use client";

import { CirclePlay, FileImage } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CarouselSortableStrip } from "@/components/veya/carousel-sortable-strip";
import { ContentDetailsMediaToolbar } from "@/components/veya/content-details-media-toolbar";
import type { ContentAsset, ContentItemFields } from "@/data/content-types";
import {
  orderedCarouselAssets,
  resolvePostPrimary,
  resolveReelCover,
  resolveReelVideo
} from "@/lib/content-asset-helpers";

type ContentMediaPreviewProps = {
  item: ContentItemFields;
  assets: ContentAsset[];
};

function HeroFrame({
  asset,
  badge
}: {
  asset: ContentAsset;
  badge: string;
}) {
  return (
    <div
      className={[
        "relative flex h-full min-h-[min(48vh,480px)] w-full items-center justify-center rounded-[10px] bg-gradient-to-br",
        asset.color
      ].join(" ")}
    >
      {asset.type === "video" ? (
        <CirclePlay className="h-14 w-14 text-zinc-500/50" strokeWidth={1.25} />
      ) : (
        <FileImage className="h-14 w-14 text-zinc-500/45" strokeWidth={1.25} />
      )}
      <span className="absolute bottom-3 left-3 rounded-md border border-white/40 bg-white/75 px-2 py-1 text-[11px] text-zinc-600 backdrop-blur-sm">
        {badge}
      </span>
    </div>
  );
}

export function ContentMediaPreview({ item, assets }: ContentMediaPreviewProps) {
  const caption = item.caption;
  const hashtags = item.hashtags;

  if (item.contentType === "Post") {
    const primary = resolvePostPrimary(item, assets);
    return (
      <section className="flex min-w-0 flex-col gap-4 lg:gap-6">
        <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white p-3 sm:p-4">
          <div className="flex min-h-[min(52vh,520px)] items-center justify-center rounded-xl border border-zinc-200/50 bg-zinc-50/50">
            {primary ? (
              <HeroFrame asset={primary} badge={primary.type === "video" ? "Video" : "Image"} />
            ) : (
              <PlaceholderFrame title={item.title} />
            )}
          </div>
        </div>
        <ContentDetailsMediaToolbar
          caption={caption}
          hashtags={hashtags}
          currentAsset={primary ?? null}
          allAssets={assets}
          assetSource={item.assetSource}
          assetFolderUrl={item.driveLink || item.assetFolderUrl || item.googleDriveUrl}
        />
      </section>
    );
  }

  if (item.contentType === "Reel") {
    const video = resolveReelVideo(item, assets);
    const cover = resolveReelCover(item, assets);

    return (
      <section className="flex min-w-0 flex-col gap-4 lg:gap-6">
        <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white p-3 sm:p-4">
          <div className="flex min-h-[min(52vh,520px)] flex-col gap-4 lg:flex-row lg:items-stretch">
            <div className="flex min-h-[min(44vh,440px)] min-w-0 flex-1 items-center justify-center rounded-xl border border-zinc-200/50 bg-zinc-50/50 lg:min-h-[min(48vh,480px)]">
              {video ? <HeroFrame asset={video} badge="Primary video" /> : <PlaceholderFrame title={item.title} />}
            </div>
            {cover ? (
              <div className="flex w-full shrink-0 flex-col gap-2 lg:w-[148px]">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-400">Cover</p>
                <div className="overflow-hidden rounded-xl border border-zinc-200/70 bg-zinc-50/50 p-2">
                  <div
                    className={[
                      "relative aspect-[4/5] w-full rounded-lg bg-gradient-to-br",
                      cover.color
                    ].join(" ")}
                  >
                    <FileImage className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-zinc-500/50" strokeWidth={1.25} />
                  </div>
                  <p className="mt-2 truncate text-center text-[11px] text-zinc-500">{cover.label}</p>
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-zinc-500 lg:w-[148px] lg:pt-8">No cover image — video only.</p>
            )}
          </div>
        </div>
        <ContentDetailsMediaToolbar
          caption={caption}
          hashtags={hashtags}
          currentAsset={video ?? null}
          allAssets={assets}
          assetSource={item.assetSource}
          assetFolderUrl={item.driveLink || item.assetFolderUrl || item.googleDriveUrl}
        />
      </section>
    );
  }

  return (
    <CarouselMediaSection item={item} assets={assets} caption={caption} hashtags={hashtags} />
  );
}

function CarouselMediaSection({
  item,
  assets,
  caption,
  hashtags
}: {
  item: ContentItemFields;
  assets: ContentAsset[];
  caption: string;
  hashtags: string;
}) {
  const initialOrder = useMemo(
    () => orderedCarouselAssets(assets, item.carouselAssetOrder),
    [assets, item.carouselAssetOrder]
  );

  const [slides, setSlides] = useState<ContentAsset[]>(initialOrder);
  const [selectedId, setSelectedId] = useState<string | null>(initialOrder[0]?.id ?? null);

  useEffect(() => {
    const next = orderedCarouselAssets(assets, item.carouselAssetOrder);
    setSlides(next);
    setSelectedId((id) => (id && next.some((a) => a.id === id) ? id : next[0]?.id ?? null));
  }, [assets, item.carouselAssetOrder]);

  const selected = slides.find((a) => a.id === selectedId) ?? slides[0];

  return (
    <section className="flex min-w-0 flex-col gap-4 lg:gap-6">
      <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white p-3 sm:p-4">
        <div className="flex min-h-[min(52vh,520px)] items-center justify-center rounded-xl border border-zinc-200/50 bg-zinc-50/50">
          {selected ? (
            <HeroFrame
              asset={selected}
              badge={selected.type === "video" ? `Slide · Video` : `Slide ${slides.indexOf(selected) + 1}`}
            />
          ) : (
            <p className="text-[13px] text-zinc-500">No slides</p>
          )}
        </div>
      </div>

      <CarouselSortableStrip
        items={slides}
        selectedId={selected?.id ?? null}
        onReorder={setSlides}
        onSelect={setSelectedId}
      />

      <ContentDetailsMediaToolbar
        caption={caption}
        hashtags={hashtags}
        currentAsset={selected ?? null}
        allAssets={slides}
        assetSource={item.assetSource}
        assetFolderUrl={item.driveLink || item.assetFolderUrl || item.googleDriveUrl}
      />
    </section>
  );
}

function PlaceholderFrame({ title }: { title: string }) {
  return (
    <div className="relative flex h-full min-h-[min(48vh,480px)] w-full items-center justify-center rounded-[10px] bg-[#f2f2f4] px-8 text-center">
      <p className="text-balance text-xl font-medium tracking-tight text-zinc-500">{title}</p>
    </div>
  );
}
