"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useInstagramProfile } from "@/components/veya/instagram-profile-context";
import { ContentPreviewCard } from "@/components/veya/content-preview-card";
import { SectionCard } from "@/components/veya/section-card";
import type { ContentItemBundle } from "@/data/content-types";
import { resolveInstagramProfileId } from "@/data/instagram-profiles";
import { listSupabaseContentItems } from "@/lib/supabase-content-items";

const PLATFORM_FILTERS = ["All", "Instagram", "Pinterest"] as const;

const SORT_OPTIONS = [
  { value: "scheduled-asc", label: "Soonest first" },
  { value: "scheduled-desc", label: "Latest first" },
  { value: "title-asc", label: "Title A–Z" }
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

type FeedPreviewGridProps = {
  items?: ContentItemBundle[];
};

function matchesPlatform(bundle: ContentItemBundle, filter: (typeof PLATFORM_FILTERS)[number]): boolean {
  if (filter === "All") return true;
  return bundle.item.platform.includes(filter);
}

function sortItems(items: ContentItemBundle[], sort: SortValue): ContentItemBundle[] {
  const copy = [...items];
  if (sort === "scheduled-asc") {
    copy.sort((a, b) => toTime(a.item.scheduledAt) - toTime(b.item.scheduledAt));
  } else if (sort === "scheduled-desc") {
    copy.sort((a, b) => toTime(b.item.scheduledAt) - toTime(a.item.scheduledAt));
  } else {
    copy.sort((a, b) => a.item.title.localeCompare(b.item.title, "en"));
  }
  return copy;
}

export function FeedPreviewGrid({ items = [] }: FeedPreviewGridProps) {
  const [allItems, setAllItems] = useState<ContentItemBundle[]>(items);
  const { selectedProfileId } = useInstagramProfile();
  const [platformFilter, setPlatformFilter] = useState<(typeof PLATFORM_FILTERS)[number]>("All");
  const [sort, setSort] = useState<SortValue>("scheduled-asc");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const remoteItems = (await listSupabaseContentItems()).filter((item) => item.item.includeInPreview);
        if (cancelled) return;
        setAllItems(remoteItems);
      } catch {
        if (cancelled) return;
        setAllItems([]);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () =>
      allItems.filter(
        (b) =>
          matchesPlatform(b, platformFilter) &&
          resolveInstagramProfileId(b.item.instagramProfileId ?? b.item.profileId) ===
            resolveInstagramProfileId(selectedProfileId)
      ),
    [allItems, platformFilter, selectedProfileId]
  );

  const sorted = useMemo(() => sortItems(filtered, sort), [filtered, sort]);

  return (
    <div className="space-y-8 px-5 py-8 sm:px-7 sm:py-10 lg:px-9 lg:py-12">
      <header className="max-w-2xl space-y-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-400">Preview</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">Feed</h1>
        </div>
        <p className="text-[13px] leading-relaxed text-zinc-500">
          A clean profile-style grid of planned content. Cover images drive previews; placeholders stay centered and intentional.
        </p>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <label className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">
            <span className="sr-only sm:not-sr-only">Platform</span>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as (typeof PLATFORM_FILTERS)[number])}
              className="h-9 min-w-[9rem] rounded-lg border border-zinc-200/80 bg-white px-2.5 text-[12px] text-zinc-800 outline-none ring-zinc-300/50 focus:ring-2"
            >
              {PLATFORM_FILTERS.map((p) => (
                <option key={p} value={p}>
                  {p === "All" ? "All platforms" : p}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">
            <span className="sr-only sm:not-sr-only">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortValue)}
              className="h-9 min-w-[10rem] rounded-lg border border-zinc-200/80 bg-white px-2.5 text-[12px] text-zinc-800 outline-none ring-zinc-300/50 focus:ring-2"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {sorted.length === 0 ? (
        <SectionCard className="max-w-2xl px-6 py-8">
          <p className="text-[13px] text-zinc-600">
            Feed preview is empty. Add content in Calendar or Idea Bank, then include items in preview.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/calendar"
              className="h-8 rounded-lg border border-zinc-900/90 bg-zinc-900 px-3 text-[12px] font-medium leading-8 text-white transition-colors hover:bg-zinc-800"
            >
              New item
            </Link>
            <Link
              href="/ideas"
              className="h-8 rounded-lg border border-zinc-200 bg-white px-3 text-[12px] font-medium leading-8 text-zinc-700 transition-colors hover:border-zinc-300"
            >
              New idea
            </Link>
          </div>
        </SectionCard>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-3">
          {sorted.map((b) => (
            <FeedSquareCard key={b.id} bundle={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function toTime(value?: string): number {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const time = +new Date(value);
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

function FeedSquareCard({ bundle }: { bundle: ContentItemBundle }) {
  return (
    <Link
      href={`/content/${bundle.id}`}
      className="group relative aspect-square overflow-hidden rounded-xl border border-zinc-200/65 bg-white transition-colors hover:border-zinc-300"
    >
      <ContentPreviewCard
        title={bundle.item.title}
        item={bundle.item}
        assets={bundle.assets}
        aspectClassName="absolute inset-0"
        variant="feed"
      />
    </Link>
  );
}
