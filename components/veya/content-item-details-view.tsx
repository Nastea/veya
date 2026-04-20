"use client";

import {
  CalendarClock,
  ExternalLink,
  Files,
  Folder,
  Hash,
  ImagePlus,
  LayoutTemplate,
  Layers,
  MessageSquareText,
  Sparkles,
  UserRound
} from "lucide-react";

import { ChecklistSection } from "@/components/veya/checklist-section";
import { ContentMediaPreview } from "@/components/veya/content-media-preview";
import { MetadataRow } from "@/components/veya/metadata-row";
import { PlatformChip } from "@/components/veya/platform-chip";
import { SectionCard } from "@/components/veya/section-card";
import { StatusPill } from "@/components/veya/status-pill";
import { ToggleRow } from "@/components/veya/toggle-row";
import type { ContentAsset, ContentItemFields, ContentStatus, ContentTask } from "@/data/content-types";
import { getInstagramProfileById, listInstagramProfiles } from "@/data/instagram-profiles";

type ContentItemDetailsViewProps = {
  contentId: string;
  item: ContentItemFields;
  assets: ContentAsset[];
  tasks: ContentTask[];
  editable?: boolean;
  onDelete?: () => void;
  onItemChange?: (next: ContentItemFields) => void;
  onTasksChange?: (next: ContentTask[]) => void;
};

function ContentDetailsPanel({
  item,
  tasks,
  editable = false,
  onDelete,
  onItemChange,
  onTasksChange
}: {
  item: ContentItemFields;
  tasks: ContentTask[];
  editable?: boolean;
  onDelete?: () => void;
  onItemChange?: (next: ContentItemFields) => void;
  onTasksChange?: (next: ContentTask[]) => void;
}) {
  const activeProfileId = item.instagramProfileId ?? item.profileId;
  const profile = getInstagramProfileById(activeProfileId);
  const activeProfiles = listInstagramProfiles().filter((entry) => entry.active);
  const requirementsByType: Record<ContentItemFields["contentType"], string[]> = {
    Post: ["Photo", "Caption"],
    Reel: ["Video", "Cover", "Caption"],
    Carousel: ["Carousel slides", "Caption"]
  };

  function patchItem(patch: Partial<ContentItemFields>) {
    if (!onItemChange) return;
    onItemChange({ ...item, ...patch });
  }

  async function handleCoverUpload(file: File | null) {
    if (!file || !onItemChange) return;
    const dataUrl = await fileToDataUrl(file);
    onItemChange({ ...item, coverImageUrl: dataUrl });
  }

  function handlePlannedDateChange(value: string) {
    if (!onItemChange) return;
    if (!value) {
      onItemChange({ ...item, scheduledAt: undefined, scheduledDate: undefined });
      return;
    }
    const scheduledAt = `${value}T10:00:00.000Z`;
    const scheduledDate = new Date(scheduledAt).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
    onItemChange({ ...item, scheduledAt, scheduledDate });
  }

  const plannedDateValue = item.scheduledAt ? item.scheduledAt.slice(0, 10) : "";

  const incompleteChecklistCount = tasks.filter((task) => !task.completed).length;

  return (
    <section className="flex min-w-0 max-w-md flex-col gap-8 xl:max-w-sm">
      <SectionCard className="px-6 py-7">
        <div>
          <MetadataRow label="Assignee" value={item.assignee} icon={<UserRound />} />
          <MetadataRow
            label="Status"
            value={
              editable ? (
                <select
                  value={item.status}
                  onChange={(e) => patchItem({ status: e.target.value as ContentStatus })}
                  className="h-8 min-w-[7.5rem] rounded-md border border-zinc-200 bg-white px-2 text-[12px] text-zinc-800 outline-none ring-zinc-300/50 focus:ring-2"
                >
                  <option value="Idea">Idea</option>
                  <option value="Planned">Planned</option>
                  <option value="Filmed">Filmed</option>
                  <option value="Done">Done</option>
                </select>
              ) : (
                <StatusPill>{item.status}</StatusPill>
              )
            }
            icon={<Sparkles />}
          />
          <MetadataRow
            label="Format"
            value={
              editable ? (
                <select
                  value={item.contentType}
                  onChange={(e) => patchItem({ contentType: e.target.value as ContentItemFields["contentType"] })}
                  className="h-8 min-w-[7.5rem] rounded-md border border-zinc-200 bg-white px-2 text-[12px] text-zinc-800 outline-none ring-zinc-300/50 focus:ring-2"
                >
                  <option value="Post">Post</option>
                  <option value="Reel">Reel</option>
                  <option value="Carousel">Carousel</option>
                </select>
              ) : (
                item.contentType
              )
            }
            icon={<LayoutTemplate />}
          />
          <MetadataRow label="Project" value={item.project} icon={<Layers />} />
          <MetadataRow
            label="Profile"
            value={
              editable ? (
                <select
                  value={activeProfileId}
                  onChange={(e) => patchItem({ instagramProfileId: e.target.value, profileId: e.target.value })}
                  className="h-8 min-w-[10rem] rounded-md border border-zinc-200 bg-white px-2 text-[12px] text-zinc-800 outline-none ring-zinc-300/50 focus:ring-2"
                >
                  {activeProfiles.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name} ({entry.handle})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="inline-flex items-center gap-2 text-[12px] font-medium text-zinc-700">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-[11px] text-zinc-600">
                    {(profile?.avatar ?? "I").slice(0, 1).toUpperCase()}
                  </span>
                  <span>{profile ? `${profile.name} (${profile.handle})` : activeProfileId}</span>
                </span>
              )
            }
            icon={<UserRound />}
          />
          <MetadataRow
            label="Google Drive"
            value={
              editable ? (
                <input
                  value={item.driveLink || item.assetFolderUrl || item.googleDriveUrl}
                  onChange={(e) =>
                    patchItem({
                      driveLink: e.target.value,
                      assetFolderUrl: e.target.value,
                      googleDriveUrl: e.target.value
                    })
                  }
                  className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-[12px] text-zinc-700 outline-none ring-zinc-300/50 focus:ring-2"
                />
              ) : (
                <a
                  href={item.driveLink || item.assetFolderUrl || item.googleDriveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-zinc-800 underline decoration-zinc-300 underline-offset-2 transition-colors hover:decoration-zinc-500"
                >
                  Open in Drive
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-60" strokeWidth={1.5} />
                </a>
              )
            }
            icon={<Folder className="h-3.5 w-3.5" strokeWidth={1.5} />}
          />
          {editable ? (
            <div className="flex items-center justify-between border-b border-zinc-100 py-3">
              <div className="flex items-center gap-2 text-[12px] text-zinc-500">
                <ImagePlus className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>Cover image</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex h-8 cursor-pointer items-center rounded-md border border-zinc-200 bg-white px-2 text-[11px] text-zinc-700 transition-colors hover:border-zinc-300">
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleCoverUpload(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </label>
                {item.coverImageUrl ? (
                  <img
                    src={item.coverImageUrl}
                    alt="Cover preview"
                    className="h-8 w-8 rounded-md border border-zinc-200 object-cover"
                  />
                ) : null}
              </div>
            </div>
          ) : null}
          <MetadataRow
            label="Platform"
            value={
              editable ? (
                <select
                  value={item.platform[0] ?? "Instagram"}
                  onChange={(e) => patchItem({ platform: [e.target.value] })}
                  className="h-8 min-w-[7.5rem] rounded-md border border-zinc-200 bg-white px-2 text-[12px] text-zinc-800 outline-none ring-zinc-300/50 focus:ring-2"
                >
                  <option value="Instagram">Instagram</option>
                  <option value="Pinterest">Pinterest</option>
                </select>
              ) : (
                <span className="inline-flex flex-wrap justify-end gap-1.5 sm:justify-end">
                  {item.platform.map((p) => (
                    <PlatformChip key={p}>{p}</PlatformChip>
                  ))}
                </span>
              )
            }
            icon={<Files />}
          />
          <MetadataRow
            label="Scheduled"
            value={
              editable ? (
                <div className="flex items-center justify-end gap-2">
                  <input
                    type="date"
                    value={plannedDateValue}
                    onChange={(e) => handlePlannedDateChange(e.target.value)}
                    className="h-8 min-w-[8.5rem] rounded-md border border-zinc-200 bg-white px-2 text-[12px] text-zinc-800 outline-none ring-zinc-300/50 focus:ring-2"
                  />
                  <button
                    type="button"
                    onClick={() => handlePlannedDateChange("")}
                    className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-[11px] text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                item.scheduledDate ?? "Unscheduled"
              )
            }
            icon={<CalendarClock />}
          />
          <MetadataRow label="Hashtags" value={item.hashtags} icon={<Hash />} />
          <MetadataRow label="Files" value={item.filesSummary} icon={<Files />} />
        </div>
      </SectionCard>

      <ChecklistSection
        tasks={tasks}
        title="Production checklist"
        requirements={requirementsByType[item.contentType]}
        editable={editable}
        onToggleTask={(id, completed) => {
          if (!onTasksChange) return;
          onTasksChange(tasks.map((task) => (task.id === id ? { ...task, completed } : task)));
        }}
      />
      {item.status === "Done" && incompleteChecklistCount > 0 ? (
        <p className="-mt-5 text-[12px] text-amber-700/85">
          Mark checklist requirements complete before final delivery.
        </p>
      ) : null}

      <SectionCard className="px-6 py-1">
        <ToggleRow label="Ready" enabled={item.ready} />
        <div className="border-t border-zinc-100" />
        <ToggleRow label="Include in feed preview" enabled={item.includeInPreview} />
      </SectionCard>
      {editable && onDelete ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onDelete}
            className="h-9 rounded-lg border border-rose-200 bg-white px-3.5 text-[12px] font-medium text-rose-700 transition-colors hover:border-rose-300 hover:bg-rose-50"
          >
            Delete item
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function ContentItemDetailsView({
  contentId,
  item,
  assets,
  tasks,
  editable = false,
  onDelete,
  onItemChange,
  onTasksChange
}: ContentItemDetailsViewProps) {
  return (
    <div className="grid flex-1 gap-8 px-5 py-8 sm:px-7 sm:py-10 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,0.72fr)] lg:gap-x-12 lg:gap-y-0 lg:px-9 lg:py-12 xl:grid-cols-[minmax(0,1.75fr)_minmax(280px,0.65fr)] xl:gap-x-16">
      <section className="space-y-6">
        {editable ? (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-400">Editing draft</p>
            <input
              value={item.title}
              onChange={(e) => onItemChange?.({ ...item, title: e.target.value })}
              className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-2xl font-bold leading-[1.15] tracking-tight text-zinc-900 outline-none ring-zinc-300/50 focus:ring-2 sm:text-[1.65rem]"
            />
          </div>
        ) : (
          <h1 className="text-balance text-2xl font-bold leading-[1.15] tracking-tight text-zinc-900 sm:text-[1.65rem]">
            {item.title}
          </h1>
        )}
        <ContentMediaPreview key={contentId} item={item} assets={assets} />
        <SectionCard className="space-y-4 px-6 py-6">
          <FieldBlock
            label="Caption"
            value={item.caption}
            editable={editable}
            minHeightClassName="min-h-28"
            onChange={(next) => onItemChange?.({ ...item, caption: next })}
          />
          <FieldBlock
            label="Scenariu"
            value={item.script}
            editable={editable}
            minHeightClassName="min-h-24"
            onChange={(next) => onItemChange?.({ ...item, script: next })}
          />
          <FieldBlock
            label="Comentarii"
            value={item.description}
            editable={editable}
            minHeightClassName="min-h-20"
            onChange={(next) => onItemChange?.({ ...item, description: next })}
          />
          <FieldBlock
            label="Note"
            value={item.notes}
            editable={editable}
            minHeightClassName="min-h-20"
            onChange={(next) => onItemChange?.({ ...item, notes: next })}
          />
        </SectionCard>
      </section>
      <ContentDetailsPanel
        item={item}
        tasks={tasks}
        editable={editable}
        onDelete={onDelete}
        onItemChange={onItemChange}
        onTasksChange={onTasksChange}
      />
    </div>
  );
}

function FieldBlock({
  label,
  value,
  editable,
  minHeightClassName,
  onChange
}: {
  label: string;
  value: string;
  editable: boolean;
  minHeightClassName: string;
  onChange: (next: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">{label}</p>
      {editable ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${minHeightClassName} w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-[13px] leading-relaxed text-zinc-800 outline-none ring-zinc-300/50 focus:ring-2`}
        />
      ) : (
        <p className="whitespace-pre-wrap rounded-md border border-zinc-100 bg-zinc-50/60 px-3 py-2 text-[14px] leading-relaxed text-zinc-800">
          {value || "—"}
        </p>
      )}
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
