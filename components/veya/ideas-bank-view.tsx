"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { ContentPreviewCard } from "@/components/veya/content-preview-card";
import { useInstagramProfile } from "@/components/veya/instagram-profile-context";
import { SectionCard } from "@/components/veya/section-card";
import type { ContentFormat, ContentItemBundle, ContentStatus } from "@/data/content-types";
import { getDefaultProfileId, listInstagramProfiles } from "@/data/instagram-profiles";
import { applyChecklistAutoCompletion } from "@/lib/checklist-auto-completion";
import { createChecklistForType } from "@/lib/checklist-templates";
import {
  deleteSupabaseContentItem,
  insertSupabaseBundle,
  listSupabaseContentItems
} from "@/lib/supabase-content-items";
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
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [csvText, setCsvText] = useState("");
  const [csvImportProfileId, setCsvImportProfileId] = useState<string>(selectedProfileId || getDefaultProfileId());
  const [csvImportPlatform, setCsvImportPlatform] = useState<"Instagram" | "Pinterest">("Instagram");

  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState<ContentFormat>("Post");
  const [platform, setPlatform] = useState<"Instagram" | "Pinterest">("Instagram");
  const [status, setStatus] = useState<ContentStatus>("Idea");
  const [profileId, setProfileId] = useState<string>(selectedProfileId || getDefaultProfileId());
  const [plannedDate, setPlannedDate] = useState("");
  const [caption, setCaption] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const remoteItems = await listSupabaseContentItems();
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

  useEffect(() => {
    setProfileId(selectedProfileId);
    setCsvImportProfileId(selectedProfileId);
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

  const allVisibleSelected = sorted.length > 0 && sorted.every((bundle) => selectedIds.has(bundle.id));

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

    try {
      const inserted = await insertSupabaseBundle(newBundle);
      setAllItems((prev) => [inserted, ...prev]);
      setImportFeedback("Idea saved to Supabase");
    } catch {
      setImportFeedback("Save failed. Could not sync to Supabase.");
    }

    setIsCreateOpen(false);
    resetForm();
    window.setTimeout(() => setImportFeedback(null), 2600);
  }

  async function handleCsvImport(file: File | null) {
    if (!file) return;
    try {
      const text = await file.text();
      const imported = importVeyaCsv(text, {
        defaultProfileId: csvImportProfileId,
        defaultPlatform: csvImportPlatform
      });
      if (imported.length === 0) {
        setImportFeedback("No rows imported");
      } else {
        const results = await Promise.allSettled(imported.map((bundle) => insertSupabaseBundle(bundle)));
        const synced = results
          .filter((entry): entry is PromiseFulfilledResult<ContentItemBundle> => entry.status === "fulfilled")
          .map((entry) => entry.value);
        const failed = results.length - synced.length;
        setAllItems((prev) => mergeById(prev, synced));
        setImportFeedback(
          failed > 0
            ? `Imported ${synced.length} items (${failed} failed to sync)`
            : `Imported ${synced.length} item${synced.length === 1 ? "" : "s"}`
        );
      }
    } catch (error) {
      setImportFeedback(error instanceof Error ? error.message : "CSV import failed");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      window.setTimeout(() => setImportFeedback(null), 2600);
    }
  }

  function handleCsvPasteImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void (async () => {
      try {
      const imported = importVeyaCsv(csvText, {
        defaultProfileId: csvImportProfileId,
        defaultPlatform: csvImportPlatform
      });
      if (imported.length === 0) {
        setImportFeedback("No rows imported");
      } else {
        const results = await Promise.allSettled(imported.map((bundle) => insertSupabaseBundle(bundle)));
        const synced = results
          .filter((entry): entry is PromiseFulfilledResult<ContentItemBundle> => entry.status === "fulfilled")
          .map((entry) => entry.value);
        const failed = results.length - synced.length;
        setAllItems((prev) => mergeById(prev, synced));
        setImportFeedback(
          failed > 0
            ? `Imported ${synced.length} items (${failed} failed to sync)`
            : `Imported ${synced.length} item${synced.length === 1 ? "" : "s"}`
        );
      }
      setIsPasteOpen(false);
      setCsvText("");
      } catch (error) {
        setImportFeedback(error instanceof Error ? error.message : "CSV import failed");
      } finally {
        window.setTimeout(() => setImportFeedback(null), 2600);
      }
    })();
  }

  async function handleDeleteIdea(id: string) {
    try {
      await deleteSupabaseContentItem(id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setAllItems((prev) => prev.filter((item) => item.id !== id));
      setImportFeedback("Idea deleted");
    } catch {
      setImportFeedback("Delete failed on Supabase.");
    }
    window.setTimeout(() => setImportFeedback(null), 2000);
  }

  function toggleSelection(id: string, selected: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleSelectAllVisible(selected: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        sorted.forEach((bundle) => next.add(bundle.id));
      } else {
        sorted.forEach((bundle) => next.delete(bundle.id));
      }
      return next;
    });
  }

  async function handleDeleteSelected() {
    const targetIds = sorted.map((bundle) => bundle.id).filter((id) => selectedIds.has(id));
    if (targetIds.length === 0) return;

    const results = await Promise.allSettled(targetIds.map((id) => deleteSupabaseContentItem(id)));
    const succeeded = results
      .map((result, index) => ({ result, id: targetIds[index] }))
      .filter((entry) => entry.result.status === "fulfilled")
      .map((entry) => entry.id);
    const failed = targetIds.length - succeeded.length;

    if (succeeded.length > 0) {
      setAllItems((prev) => prev.filter((item) => !succeeded.includes(item.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        succeeded.forEach((id) => next.delete(id));
        return next;
      });
    }

    if (failed > 0) {
      setImportFeedback(`Deleted ${succeeded.length} items. ${failed} failed on Supabase.`);
    } else {
      setImportFeedback(`Deleted ${succeeded.length} items.`);
    }
    window.setTimeout(() => setImportFeedback(null), 2200);
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
            <button
              type="button"
              onClick={() => setIsPasteOpen(true)}
              className="h-9 rounded-lg border border-zinc-200 bg-white px-4 text-[12px] font-medium text-zinc-700 transition-colors hover:border-zinc-300"
            >
              Paste CSV
            </button>
            <select
              value={csvImportProfileId}
              onChange={(e) => setCsvImportProfileId(e.target.value)}
              className="h-9 min-w-[10rem] rounded-lg border border-zinc-200/80 bg-white px-2.5 text-[12px] text-zinc-800 outline-none ring-zinc-300/50 focus:ring-2"
              aria-label="CSV import profile"
            >
              {PROFILES.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  CSV: {profile.name}
                </option>
              ))}
            </select>
            <select
              value={csvImportPlatform}
              onChange={(e) => setCsvImportPlatform(e.target.value as "Instagram" | "Pinterest")}
              className="h-9 min-w-[8rem] rounded-lg border border-zinc-200/80 bg-white px-2.5 text-[12px] text-zinc-800 outline-none ring-zinc-300/50 focus:ring-2"
              aria-label="CSV import platform"
            >
              <option value="Instagram">CSV: Instagram</option>
              <option value="Pinterest">CSV: Pinterest</option>
            </select>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => handleCsvImport(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </div>
        </header>
        {sorted.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-[12px] text-zinc-600">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-zinc-700 focus:ring-zinc-300"
              />
              Select all visible
            </label>
            <button
              type="button"
              onClick={() => void handleDeleteSelected()}
              disabled={!sorted.some((bundle) => selectedIds.has(bundle.id))}
              className="h-8 rounded-lg border border-rose-200 bg-white px-3 text-[12px] font-medium text-rose-700 transition-colors hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete selected
            </button>
          </div>
        ) : null}
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
          <div className="space-y-3">
            {sorted.map((bundle) => (
              <IdeaCard
                key={bundle.id}
                bundle={bundle}
                selected={selectedIds.has(bundle.id)}
                onSelectChange={toggleSelection}
                onDelete={handleDeleteIdea}
              />
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

      {isPasteOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-900/25 p-4 backdrop-blur-[1px]">
          <SectionCard className="w-full max-w-2xl px-6 py-6 sm:px-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-400">Import</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">Paste CSV</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPasteOpen(false);
                  setCsvText("");
                }}
                className="rounded-md px-2 py-1 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
              >
                Close
              </button>
            </div>
            <form className="mt-5 space-y-4" onSubmit={handleCsvPasteImport}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">
                    Import profile
                  </span>
                  <select
                    value={csvImportProfileId}
                    onChange={(e) => setCsvImportProfileId(e.target.value)}
                    className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-[13px] text-zinc-900 outline-none ring-zinc-300/50 focus:ring-2"
                  >
                    {PROFILES.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">
                    Import platform
                  </span>
                  <select
                    value={csvImportPlatform}
                    onChange={(e) => setCsvImportPlatform(e.target.value as "Instagram" | "Pinterest")}
                    className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-[13px] text-zinc-900 outline-none ring-zinc-300/50 focus:ring-2"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="Pinterest">Pinterest</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">
                  CSV content
                </span>
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Paste full CSV including header row..."
                  required
                  className="min-h-56 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] leading-relaxed text-zinc-900 outline-none ring-zinc-300/50 focus:ring-2"
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasteOpen(false);
                    setCsvText("");
                  }}
                  className="h-9 rounded-lg border border-zinc-200 bg-white px-4 text-[12px] font-medium text-zinc-700 transition-colors hover:border-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-lg border border-zinc-900/90 bg-zinc-900 px-4 text-[12px] font-medium text-white transition-colors hover:bg-zinc-800"
                >
                  Import pasted CSV
                </button>
              </div>
            </form>
          </SectionCard>
        </div>
      ) : null}
    </>
  );
}

function IdeaCard({
  bundle,
  selected,
  onSelectChange,
  onDelete
}: {
  bundle: ContentItemBundle;
  selected: boolean;
  onSelectChange: (id: string, selected: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="group overflow-hidden rounded-xl border border-zinc-200/70 bg-white transition-colors hover:border-zinc-300">
      <Link href={`/content/${bundle.id}`} className="flex items-center gap-3 p-3">
        <div className="w-[88px] shrink-0 overflow-hidden rounded-lg">
          <ContentPreviewCard
            title={bundle.item.title}
            item={bundle.item}
            assets={bundle.assets}
            aspectClassName="aspect-[4/5]"
            variant="ideas"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-[13px] font-medium leading-snug text-zinc-900">{bundle.item.title}</p>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {bundle.item.contentType} · {bundle.item.platform.join(" · ")} · {bundle.item.scheduledDate ?? "Unscheduled"}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-zinc-200/90 bg-zinc-50 px-2 py-0.5 text-[10px] text-zinc-600">
          {bundle.item.status}
        </span>
      </Link>
      <div className="flex items-center justify-between border-t border-zinc-100 px-3 py-2">
        <label className="inline-flex items-center gap-1.5 text-[10px] text-zinc-600">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelectChange(bundle.id, e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-zinc-700 focus:ring-zinc-300"
          />
          Select
        </label>
        <button
          type="button"
          onClick={() => void onDelete(bundle.id)}
          className="text-[10px] font-medium text-rose-600 transition-colors hover:text-rose-700"
        >
          Delete idea
        </button>
      </div>
    </div>
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
