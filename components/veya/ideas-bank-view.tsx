"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { ContentPreviewCard } from "@/components/veya/content-preview-card";
import { useInstagramProfile } from "@/components/veya/instagram-profile-context";
import { SectionCard } from "@/components/veya/section-card";
import type { ContentFormat, ContentItemBundle, ContentStatus } from "@/data/content-types";
import { getDefaultProfileId, listInstagramProfiles } from "@/data/instagram-profiles";
import { applyChecklistAutoCompletion } from "@/lib/checklist-auto-completion";
import { getCreatedItems, saveCreatedItem } from "@/lib/client-created-items";
import { createChecklistForType } from "@/lib/checklist-templates";
import { insertSupabaseContentItem, listSupabaseContentItems } from "@/lib/supabase-content-items";
import { importVeyaCsv } from "@/lib/veya-csv-import";

const STATUS_FILTERS: Array<"All" | ContentStatus> = ["All", "Idea", "Planned", "Filmed", "Done"];
const PLATFORM_FILTERS = ["All", "Instagram", "Pinterest"] as const;
const TYPE_FILTERS: Array<"All" | ContentFormat> = ["All", "Post", "Reel", "Carousel"];
const PROFILES = listInstagramProfiles().filter((profile) => profile.active);

type IdeasBankViewProps = {
  items?: ContentItemBundle[];
};

export function IdeasBankView({ items = [] }: IdeasBankViewProps) {
  const [allItems, setAllItems] = useState<ContentItemBundle[]>(items);
  const { selectedProfileId } = useInstagramProfile();
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("All");
  const [platformFilter, setPlatformFilter] = useState<(typeof PLATFORM_FILTERS)[number]>("All");
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]>("All");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState<ContentFormat>("Post");
  const [platform, setPlatform] = useState<"Instagram" | "Pinterest">("Instagram");
  const [status, setStatus] = useState<ContentStatus>("Idea");
  const [profileId, setProfileId] = useState<string>(selectedProfileId || getDefaultProfileId());
  const [plannedDate, setPlannedDate] = useState("");
  const [caption, setCaption] = useState("");

  useEffect(() => {
    let cancelled = false;
    const sessionItems = getCreatedItems();

    async function load() {
      try {
        const remoteItems = await listSupabaseContentItems();
        if (cancelled) return;
        setAllItems(remoteItems.length > 0 ? mergeById(sessionItems, remoteItems) : sessionItems);
      } catch {
        if (cancelled) return;
        setAllItems(sessionItems);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setProfileId(selectedProfileId);
  }, [selectedProfileId]);

  const filtered = useMemo(() => {
    return allItems.filter((item) => {
      const statusPass = statusFilter === "All" || item.item.status === statusFilter;
      const platformPass = platformFilter === "All" || item.item.platform.includes(platformFilter);
      const typePass = typeFilter === "All" || item.item.contentType === typeFilter;
      const profilePass = (item.item.instagramProfileId ?? item.item.profileId) === selectedProfileId;
      return statusPass && platformPass && typePass && profilePass;
    });
  }, [allItems, statusFilter, platformFilter, typeFilter, selectedProfileId]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => toTime(a.item.scheduledAt) - toTime(b.item.scheduledAt));
  }, [filtered]);

  function resetForm() {
    setTitle("");
    setContentType("Post");
    setPlatform("Instagram");
    setStatus("Idea");
    setProfileId(selectedProfileId || getDefaultProfileId());
    setPlannedDate("");
    setCaption("");
  }

  async function handleCreateIdea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    const id = `created-${Date.now().toString(36)}`;
    const assets = buildAssetsForType(id, contentType);
    const hasDate = plannedDate.length > 0;
    const scheduledAt = hasDate ? `${plannedDate}T10:00:00.000Z` : undefined;
    const scheduledDate = hasDate
      ? new Date(scheduledAt as string).toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit"
        })
      : undefined;

    const draftBundle: ContentItemBundle = {
      id,
      item: {
        title: cleanTitle,
        autosaveText: "Saved",
        assignee: "Unassigned",
        status,
        contentType,
        externalId: id,
        importSource: "manual",
        instagramProfileId: profileId,
        profileId,
        project: "Idea bank",
        platform: [platform],
        script: "",
        description: "",
        notes: "",
        assetSource: "manual",
        driveLink: "https://drive.google.com/drive/folders/1mockIdeaBank",
        assetFolderUrl: "",
        coverImageUrl: "",
        googleDriveUrl: "https://drive.google.com/drive/folders/1mockIdeaBank",
        scheduledAt,
        scheduledDate,
        caption: caption.trim(),
        hashtags: "",
        filesSummary: assets.length
          ? `${assets.length} asset${assets.length === 1 ? "" : "s"}`
          : "No assets yet",
        ready: false,
        includeInPreview: true,
        primaryAssetId: contentType === "Post" ? assets[0]?.id : undefined,
        primaryVideoAssetId: contentType === "Reel" ? assets.find((a) => a.type === "video")?.id : undefined,
        coverAssetId: contentType === "Reel" ? assets.find((a) => a.type === "image")?.id : undefined,
        carouselAssetOrder: contentType === "Carousel" ? assets.map((a) => a.id) : undefined
      },
      assets,
      tasks: createChecklistForType(contentType, `${id}-task`)
    };
    const newBundle: ContentItemBundle = {
      ...draftBundle,
      tasks: applyChecklistAutoCompletion(draftBundle.tasks, draftBundle.item, draftBundle.assets)
    };

    const plannedDateForDb = hasDate ? plannedDate : null;

    try {
      const inserted = await insertSupabaseContentItem({
        externalId: id,
        importSource: "manual",
        title: cleanTitle,
        contentType,
        instagramProfileId: profileId,
        status,
        plannedDate: plannedDateForDb,
        caption: caption.trim(),
        script: "",
        description: "",
        notes: "",
        filmingDate: null,
        assetSource: "manual",
        assetFolderUrl: "",
        driveLink: "https://drive.google.com/drive/folders/1mockIdeaBank",
        coverImageUrl: ""
      });
      setAllItems((prev) => [inserted, ...prev]);
      saveCreatedItem(inserted);
      setImportFeedback("Idea saved to Supabase");
    } catch {
      setAllItems((prev) => [newBundle, ...prev]);
      saveCreatedItem(newBundle);
      setImportFeedback("Supabase unavailable. Saved locally for now.");
    }

    setIsCreateOpen(false);
    resetForm();
    window.setTimeout(() => setImportFeedback(null), 2600);
  }

  async function handleCsvImport(file: File | null) {
    if (!file) return;
    try {
      const text = await file.text();
      const imported = importVeyaCsv(text);
      if (imported.length === 0) {
        setImportFeedback("No rows imported");
      } else {
        setAllItems((prev) => mergeById(prev, imported));
        imported.forEach((bundle) => saveCreatedItem(bundle));
        setImportFeedback(`Imported ${imported.length} item${imported.length === 1 ? "" : "s"}`);
      }
    } catch (error) {
      setImportFeedback(error instanceof Error ? error.message : "CSV import failed");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      window.setTimeout(() => setImportFeedback(null), 2600);
    }
  }

  return (
    <>
      <div className="space-y-8 px-5 py-8 sm:px-7 sm:py-10 lg:px-9 lg:py-12">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-400">Workspace</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">Idea Bank</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
              Capture concepts before scheduling. Planned items still flow into Calendar.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as (typeof STATUS_FILTERS)[number])}
              className="h-9 min-w-[8rem] rounded-lg border border-zinc-200/80 bg-white px-2.5 text-[12px] text-zinc-800 outline-none ring-zinc-300/50 focus:ring-2"
            >
              {STATUS_FILTERS.map((v) => (
                <option key={v} value={v}>
                  {v === "All" ? "All status" : v}
                </option>
              ))}
            </select>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as (typeof PLATFORM_FILTERS)[number])}
              className="h-9 min-w-[8rem] rounded-lg border border-zinc-200/80 bg-white px-2.5 text-[12px] text-zinc-800 outline-none ring-zinc-300/50 focus:ring-2"
            >
              {PLATFORM_FILTERS.map((v) => (
                <option key={v} value={v}>
                  {v === "All" ? "All platform" : v}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as (typeof TYPE_FILTERS)[number])}
              className="h-9 min-w-[8rem] rounded-lg border border-zinc-200/80 bg-white px-2.5 text-[12px] text-zinc-800 outline-none ring-zinc-300/50 focus:ring-2"
            >
              {TYPE_FILTERS.map((v) => (
                <option key={v} value={v}>
                  {v === "All" ? "All types" : v}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="h-9 rounded-lg border border-zinc-900/90 bg-zinc-900 px-4 text-[12px] font-medium text-white transition-colors hover:bg-zinc-800"
            >
              New idea
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-9 rounded-lg border border-zinc-200 bg-white px-4 text-[12px] font-medium text-zinc-700 transition-colors hover:border-zinc-300"
            >
              Import CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => handleCsvImport(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </div>
        </header>
        {importFeedback ? <p className="text-[12px] text-zinc-500">{importFeedback}</p> : null}

        {sorted.length === 0 ? (
          <SectionCard className="px-6 py-10 text-center">
            <p className="text-[13px] text-zinc-600">Your Idea Bank is empty. Capture the first concept to begin planning.</p>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="mt-4 h-9 rounded-lg border border-zinc-900/90 bg-zinc-900 px-4 text-[12px] font-medium text-white transition-colors hover:bg-zinc-800"
            >
              New idea
            </button>
          </SectionCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((bundle) => (
              <IdeaCard key={bundle.id} bundle={bundle} />
            ))}
          </div>
        )}
      </div>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-900/25 p-4 backdrop-blur-[1px]">
          <SectionCard className="w-full max-w-xl px-6 py-6 sm:px-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-400">New idea</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">Capture concept</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateOpen(false);
                  resetForm();
                }}
                className="rounded-md px-2 py-1 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
              >
                Close
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleCreateIdea}>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">Title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-[13px] text-zinc-900 outline-none ring-zinc-300/50 focus:ring-2"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-4">
                <label>
                  <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">Type</span>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value as ContentFormat)}
                    className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-[13px] text-zinc-900 outline-none ring-zinc-300/50 focus:ring-2"
                  >
                    <option value="Post">Post</option>
                    <option value="Reel">Reel</option>
                    <option value="Carousel">Carousel</option>
                  </select>
                </label>
                <label>
                  <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">Platform</span>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as "Instagram" | "Pinterest")}
                    className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-[13px] text-zinc-900 outline-none ring-zinc-300/50 focus:ring-2"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="Pinterest">Pinterest</option>
                  </select>
                </label>
                <label>
                  <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">Status</span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ContentStatus)}
                    className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-[13px] text-zinc-900 outline-none ring-zinc-300/50 focus:ring-2"
                  >
                    <option value="Idea">Idea</option>
                    <option value="Planned">Planned</option>
                    <option value="Filmed">Filmed</option>
                    <option value="Done">Done</option>
                  </select>
                </label>
                <label>
                  <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">Profile</span>
                  <select
                    value={profileId}
                    onChange={(e) => setProfileId(e.target.value)}
                    className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-[13px] text-zinc-900 outline-none ring-zinc-300/50 focus:ring-2"
                  >
                    {PROFILES.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">Planned date (optional)</span>
                <input
                  type="date"
                  value={plannedDate}
                  onChange={(e) => setPlannedDate(e.target.value)}
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-[13px] text-zinc-900 outline-none ring-zinc-300/50 focus:ring-2"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">Caption (optional)</span>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="min-h-24 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] leading-relaxed text-zinc-900 outline-none ring-zinc-300/50 focus:ring-2"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    resetForm();
                  }}
                  className="h-9 rounded-lg border border-zinc-200 bg-white px-4 text-[12px] font-medium text-zinc-700 transition-colors hover:border-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-lg border border-zinc-900/90 bg-zinc-900 px-4 text-[12px] font-medium text-white transition-colors hover:bg-zinc-800"
                >
                  Create idea
                </button>
              </div>
            </form>
          </SectionCard>
        </div>
      ) : null}
    </>
  );
}

function IdeaCard({ bundle }: { bundle: ContentItemBundle }) {
  return (
    <Link
      href={`/content/${bundle.id}`}
      className="group overflow-hidden rounded-2xl border border-zinc-200/70 bg-white transition-colors hover:border-zinc-300"
    >
      <ContentPreviewCard
        title={bundle.item.title}
        item={bundle.item}
        assets={bundle.assets}
        aspectClassName="aspect-[4/3]"
        variant="ideas"
      />
      <div className="space-y-2 px-4 py-4">
        <p className="line-clamp-2 text-[13px] font-medium leading-snug text-zinc-900">{bundle.item.title}</p>
        <p className="text-[11px] text-zinc-500">
          {bundle.item.contentType} · {bundle.item.platform.join(" · ")}
        </p>
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full border border-zinc-200/90 bg-zinc-50 px-2 py-0.5 text-[11px] text-zinc-600">
            {bundle.item.status}
          </span>
          <span className="text-[11px] text-zinc-400">{bundle.item.scheduledDate ?? "Unscheduled"}</span>
        </div>
      </div>
    </Link>
  );
}

function toTime(value?: string): number {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const t = +new Date(value);
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
}

function mergeById(base: ContentItemBundle[], additions: ContentItemBundle[]): ContentItemBundle[] {
  const seen = new Set<string>();
  const merged: ContentItemBundle[] = [];
  for (const item of [...additions, ...base]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }
  return merged;
}

function buildAssetsForType(id: string, type: ContentFormat) {
  if (type === "Post") return [];
  if (type === "Reel") {
    return [{ id: `${id}-asset-1`, type: "video" as const, label: "Video", color: "from-zinc-300/70 to-stone-100" }];
  }
  return [
    { id: `${id}-asset-1`, type: "image" as const, label: "Slide 1", color: "from-zinc-200/70 to-zinc-50" },
    { id: `${id}-asset-2`, type: "image" as const, label: "Slide 2", color: "from-stone-200/60 to-neutral-50" }
  ];
}
