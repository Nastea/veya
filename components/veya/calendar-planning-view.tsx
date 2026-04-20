"use client";

import { DndContext, PointerSensor, type DragEndEvent, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";

import { CalendarContentCard } from "@/components/veya/calendar-content-card";
import { useInstagramProfile } from "@/components/veya/instagram-profile-context";
import { SectionCard } from "@/components/veya/section-card";
import type { ContentFormat, ContentItemBundle } from "@/data/content-types";
import { getDefaultProfileId, listInstagramProfiles } from "@/data/instagram-profiles";
import { applyChecklistAutoCompletion } from "@/lib/checklist-auto-completion";
import { saveCreatedItem, getCreatedItems } from "@/lib/client-created-items";
import { createChecklistForType } from "@/lib/checklist-templates";
import { updateSupabaseContentItem } from "@/lib/supabase-content-items";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const PLATFORM_FILTERS = ["All", "Instagram", "Pinterest"] as const;
const TYPE_FILTERS: Array<"All" | ContentFormat> = ["All", "Post", "Carousel", "Reel"];
const PROFILES = listInstagramProfiles().filter((profile) => profile.active);

function buildMonthCells(year: number, monthIndex: number): (number | null)[] {
  const first = new Date(year, monthIndex, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length < 42) cells.push(null);
  return cells;
}

function eventsByDay(items: ContentItemBundle[], year: number, monthIndex: number): Map<number, ContentItemBundle[]> {
  const map = new Map<number, ContentItemBundle[]>();
  for (const b of items) {
    if (!b.item.scheduledAt) continue;
    const d = new Date(b.item.scheduledAt);
    if (d.getFullYear() !== year || d.getMonth() !== monthIndex) continue;
    const day = d.getDate();
    const list = map.get(day) ?? [];
    list.push(b);
    map.set(day, list);
  }
  return map;
}

function matchesPlatform(bundle: ContentItemBundle, filter: (typeof PLATFORM_FILTERS)[number]): boolean {
  if (filter === "All") return true;
  return bundle.item.platform.includes(filter);
}

function matchesType(bundle: ContentItemBundle, filter: (typeof TYPE_FILTERS)[number]): boolean {
  if (filter === "All") return true;
  return bundle.item.contentType === filter;
}

function matchesProfile(bundle: ContentItemBundle, profileId: string): boolean {
  return (bundle.item.instagramProfileId ?? bundle.item.profileId) === profileId;
}

type CalendarPlanningViewProps = {
  initialYear?: number;
  initialMonthIndex?: number;
};

export function CalendarPlanningView({
  initialYear = 2026,
  initialMonthIndex = 3
}: CalendarPlanningViewProps) {
  const router = useRouter();
  const { selectedProfileId } = useInstagramProfile();
  const [allItems, setAllItems] = useState<ContentItemBundle[]>([]);
  const [year, setYear] = useState(initialYear);
  const [monthIndex, setMonthIndex] = useState(initialMonthIndex);
  const [platformFilter, setPlatformFilter] = useState<(typeof PLATFORM_FILTERS)[number]>("All");
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]>("All");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState<ContentFormat>("Post");
  const [platform, setPlatform] = useState<"Instagram" | "Pinterest">("Instagram");
  const [profileId, setProfileId] = useState<string>(selectedProfileId || getDefaultProfileId());
  const [plannedDate, setPlannedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [caption, setCaption] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    setAllItems(getCreatedItems());
  }, []);

  useEffect(() => {
    setProfileId(selectedProfileId);
  }, [selectedProfileId]);

  const filteredForMonth = useMemo(() => {
    return allItems.filter(
      (b) =>
        matchesPlatform(b, platformFilter) &&
        matchesType(b, typeFilter) &&
        matchesProfile(b, selectedProfileId) &&
        matchesMonth(b, year, monthIndex)
    );
  }, [allItems, platformFilter, typeFilter, selectedProfileId, year, monthIndex]);

  const cells = useMemo(() => buildMonthCells(year, monthIndex), [year, monthIndex]);
  const byDay = useMemo(
    () => eventsByDay(filteredForMonth, year, monthIndex),
    [filteredForMonth, year, monthIndex]
  );

  const monthLabel = new Date(year, monthIndex, 1).toLocaleString("en-US", { month: "long", year: "numeric" });

  const sortedMonthList = useMemo(
    () => [...filteredForMonth].sort((a, b) => toTime(a.item.scheduledAt) - toTime(b.item.scheduledAt)),
    [filteredForMonth]
  );

  function goPrevMonth() {
    setMonthIndex((m) => {
      if (m === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }

  function goNextMonth() {
    setMonthIndex((m) => {
      if (m === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }

  function resetCreateForm() {
    setTitle("");
    setContentType("Post");
    setPlatform("Instagram");
    setProfileId(selectedProfileId || getDefaultProfileId());
    setPlannedDate(new Date().toISOString().slice(0, 10));
    setCaption("");
  }

  function handleCreateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCreating) return;
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    setIsCreating(true);

    const id = `created-${Date.now().toString(36)}`;
    const scheduledAt = `${plannedDate}T10:00:00.000Z`;
    const scheduledDate = new Date(scheduledAt).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });

    const assets = buildAssetsForType(id, contentType);
    const filesSummary = `${assets.length} asset${assets.length === 1 ? "" : "s"} · ${assets.filter((a) => a.type === "image").length} image${assets.filter((a) => a.type === "image").length === 1 ? "" : "s"}${assets.some((a) => a.type === "video") ? `, ${assets.filter((a) => a.type === "video").length} video${assets.filter((a) => a.type === "video").length === 1 ? "" : "s"}` : ""}`;

    const draftBundle: ContentItemBundle = {
      id,
      item: {
        title: cleanTitle,
        autosaveText: "Saved",
        assignee: "Unassigned",
        status: "Planned",
        contentType,
        instagramProfileId: profileId,
        profileId,
        project: "Quick drafts",
        platform: [platform],
        script: "",
        description: "",
        notes: "",
        assetSource: "manual",
        driveLink: "https://drive.google.com/drive/folders/1mockNewItem",
        assetFolderUrl: "",
        coverImageUrl: "",
        externalId: id,
        importSource: "manual",
        googleDriveUrl: "https://drive.google.com/drive/folders/1mockNewItem",
        scheduledAt,
        scheduledDate,
        caption: caption.trim(),
        hashtags: "",
        filesSummary,
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

    setAllItems((prev) => [newBundle, ...prev]);
    saveCreatedItem(newBundle);
    setYear(new Date(scheduledAt).getUTCFullYear());
    setMonthIndex(new Date(scheduledAt).getUTCMonth());
    setCreateFeedback("Created. Opening details...");
    setIsCreateOpen(false);
    resetCreateForm();
    window.setTimeout(() => {
      setCreateFeedback(null);
      setIsCreating(false);
      router.push(`/content/${newBundle.id}`);
    }, 220);
  }

  function handleDragEnd(event: DragEndEvent) {
    const overId = event.over?.id;
    const activeId = String(event.active.id);
    if (!overId || !String(overId).startsWith("day-")) return;
    const day = Number(String(overId).slice(4));
    if (!Number.isFinite(day) || day <= 0) return;

    const nextDate = new Date(Date.UTC(year, monthIndex, day, 10, 0, 0, 0));
    const scheduledAt = nextDate.toISOString();
    const scheduledDate = nextDate.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });

    setAllItems((prev) =>
      prev.map((item) => {
        if (item.id !== activeId) return item;
        const updated: ContentItemBundle = {
          ...item,
          item: { ...item.item, scheduledAt, scheduledDate, status: item.item.status === "Idea" ? "Planned" : item.item.status }
        };
        saveCreatedItem(updated);
        if (updated.id.startsWith("supa-")) {
          void updateSupabaseContentItem(updated);
        }
        return updated;
      })
    );
  }

  return (
    <>
      <div className="space-y-8 px-5 py-8 sm:px-7 sm:py-10 lg:px-9 lg:py-12">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-400">Planning</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">Calendar</h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-zinc-500">
            Visual schedule for posts and drops. Filters narrow the grid; each card opens the content item.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
          <div className="flex items-center gap-1 rounded-xl border border-zinc-200/80 bg-white p-0.5">
            <button
              type="button"
              onClick={goPrevMonth}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-800"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <p className="min-w-[10.5rem] px-2 text-center text-[13px] font-medium tabular-nums text-zinc-800">
              {monthLabel}
            </p>
            <button
              type="button"
              onClick={goNextMonth}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-800"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">
              <span className="hidden sm:inline">Platform</span>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value as (typeof PLATFORM_FILTERS)[number])}
                className="h-9 min-w-[8.5rem] rounded-lg border border-zinc-200/80 bg-white px-2.5 text-[12px] text-zinc-800 outline-none ring-zinc-300/50 focus:ring-2"
              >
                {PLATFORM_FILTERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">
              <span className="hidden sm:inline">Type</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as (typeof TYPE_FILTERS)[number])}
                className="h-9 min-w-[8.5rem] rounded-lg border border-zinc-200/80 bg-white px-2.5 text-[12px] text-zinc-800 outline-none ring-zinc-300/50 focus:ring-2"
              >
                {TYPE_FILTERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="h-9 shrink-0 rounded-lg border border-zinc-900/90 bg-zinc-900 px-4 text-[12px] font-medium text-white transition-colors hover:bg-zinc-800"
          >
            New item
          </button>
        </div>
      </header>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SectionCard className="overflow-hidden p-0">
        <div className="grid grid-cols-7 border-b border-zinc-100 bg-zinc-50/80">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="border-l border-zinc-100 px-2 py-2.5 text-center text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400 first:border-l-0"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const dayEvents = day ? byDay.get(day) ?? [] : [];
            return (
              <DayCell
                key={i}
                index={i}
                day={day}
                className="min-h-[168px] border-b border-l border-zinc-100 bg-white p-2 first:border-l-0 [&:nth-child(7n+1)]:border-l-0 lg:min-h-[200px]"
              >
                {day !== null ? (
                  <>
                    <p className="text-[11px] font-medium tabular-nums text-zinc-500">{day}</p>
                    <ul className="mt-2 max-h-[200px] space-y-2 overflow-y-auto pr-0.5 lg:max-h-[240px]">
                      {dayEvents.map((b) => (
                        <li key={b.id}>
                          <DraggableCalendarCard bundle={b} />
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </DayCell>
            );
          })}
        </div>
      </SectionCard>
      </DndContext>

      <SectionCard className="px-6 py-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-400">This month</h2>
          <p className="text-[12px] text-zinc-500">
            {filteredForMonth.length} item{filteredForMonth.length === 1 ? "" : "s"} match filters
          </p>
        </div>
        {sortedMonthList.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-5">
            <p className="text-[13px] text-zinc-600">
              No scheduled items in this view yet. Start by creating your first calendar item.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="mt-3 h-8 rounded-lg border border-zinc-900/90 bg-zinc-900 px-3 text-[12px] font-medium text-white transition-colors hover:bg-zinc-800"
            >
              New item
            </button>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100">
            {sortedMonthList.map((b) => (
              <li
                key={b.id}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <Link href={`/content/${b.id}`} className="group flex min-w-0 items-start gap-3">
                  <div
                    className={[
                      "relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br ring-1 ring-inset ring-zinc-900/[0.05]",
                      b.assets[0]?.color ?? "from-zinc-100 to-zinc-50"
                    ].join(" ")}
                  />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-zinc-900 group-hover:underline">{b.item.title}</p>
                    <p className="mt-0.5 text-[12px] text-zinc-500">{b.item.scheduledDate ?? "Unscheduled"}</p>
                    <p className="mt-1 text-[11px] text-zinc-400">
                      {b.item.contentType} · {b.item.platform.join(" · ")}
                    </p>
                  </div>
                </Link>
                <span className="shrink-0 self-start rounded-full border border-zinc-200/90 bg-zinc-50 px-2.5 py-0.5 text-[11px] text-zinc-600 sm:self-center">
                  {b.item.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      </div>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-900/25 p-4 backdrop-blur-[1px]">
          <SectionCard className="w-full max-w-xl px-6 py-6 sm:px-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-400">New content item</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">Create draft</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateOpen(false);
                  resetCreateForm();
                }}
                className="rounded-md px-2 py-1 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
              >
                Close
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleCreateItem}>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">Title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-[13px] text-zinc-900 outline-none ring-zinc-300/50 focus:ring-2"
                  placeholder="Spring drop teaser"
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
                  <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">Planned date</span>
                  <input
                    type="date"
                    value={plannedDate}
                    onChange={(e) => setPlannedDate(e.target.value)}
                    required
                    className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-[13px] text-zinc-900 outline-none ring-zinc-300/50 focus:ring-2"
                  />
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
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">Caption</span>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="min-h-28 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] leading-relaxed text-zinc-900 outline-none ring-zinc-300/50 focus:ring-2"
                  placeholder="Short concept, tone, and CTA."
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    resetCreateForm();
                  }}
                  className="h-9 rounded-lg border border-zinc-200 bg-white px-4 text-[12px] font-medium text-zinc-700 transition-colors hover:border-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="h-9 rounded-lg border border-zinc-900/90 bg-zinc-900 px-4 text-[12px] font-medium text-white transition-colors hover:bg-zinc-800"
                >
                  {isCreating ? "Creating..." : "Create item"}
                </button>
              </div>
            </form>
          </SectionCard>
        </div>
      ) : null}

      {createFeedback ? (
        <div className="fixed bottom-6 right-6 z-40 rounded-lg border border-zinc-200/80 bg-white/95 px-3.5 py-2 text-[12px] text-zinc-600 shadow-sm backdrop-blur">
          {createFeedback}
        </div>
      ) : null}
    </>
  );
}

function DayCell({
  index,
  day,
  className,
  children
}: {
  index: number;
  day: number | null;
  className: string;
  children: ReactNode;
}) {
  const droppableId = day !== null ? `day-${day}` : `empty-${index}`;
  const { isOver, setNodeRef } = useDroppable({ id: droppableId, disabled: day === null });
  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? "bg-zinc-50/80" : ""}`}
    >
      {children}
    </div>
  );
}

function DraggableCalendarCard({ bundle }: { bundle: ContentItemBundle }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: bundle.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <CalendarContentCard bundle={bundle} />
    </div>
  );
}

function matchesMonth(bundle: ContentItemBundle, year: number, monthIndex: number): boolean {
  if (!bundle.item.scheduledAt) return false;
  const d = new Date(bundle.item.scheduledAt);
  return d.getFullYear() === year && d.getMonth() === monthIndex;
}

function toTime(value?: string): number {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const time = +new Date(value);
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

function buildAssetsForType(id: string, type: ContentFormat) {
  if (type === "Post") {
    return [{ id: `${id}-asset-1`, type: "image" as const, label: "Primary", color: "from-zinc-200/80 to-zinc-50" }];
  }
  if (type === "Reel") {
    return [
      { id: `${id}-asset-1`, type: "video" as const, label: "Video", color: "from-zinc-300/70 to-stone-100" },
      { id: `${id}-asset-2`, type: "image" as const, label: "Cover", color: "from-neutral-100 to-zinc-50" }
    ];
  }
  return [
    { id: `${id}-asset-1`, type: "image" as const, label: "Slide 1", color: "from-zinc-200/70 to-zinc-50" },
    { id: `${id}-asset-2`, type: "image" as const, label: "Slide 2", color: "from-stone-200/60 to-neutral-50" },
    { id: `${id}-asset-3`, type: "image" as const, label: "Slide 3", color: "from-neutral-100 to-zinc-50" }
  ];
}
