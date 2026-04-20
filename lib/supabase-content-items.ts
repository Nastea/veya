"use client";

import type { ContentFormat, ContentItemBundle, ContentStatus } from "@/data/content-types";
import { getDefaultProfileId, resolveInstagramProfileId } from "@/data/instagram-profiles";
import { getSupabaseClient } from "@/lib/supabase";
import { createChecklistForType } from "@/lib/checklist-templates";

type SupabaseContentItemRow = {
  id: string;
  external_id: string | null;
  import_source: string | null;
  title: string | null;
  content_type: string | null;
  instagram_profile_id: string | null;
  status: string | null;
  planned_date: string | null;
  caption: string | null;
  script: string | null;
  description: string | null;
  notes: string | null;
  filming_date: string | null;
  asset_source: string | null;
  asset_folder_url: string | null;
  drive_link: string | null;
  cover_image_url: string | null;
};

type InsertSupabaseContentItemInput = {
  externalId: string;
  importSource: string;
  title: string;
  contentType: ContentFormat;
  instagramProfileId: string;
  status: ContentStatus;
  plannedDate: string | null;
  caption: string;
  script: string;
  description: string;
  notes: string;
  filmingDate: string | null;
  assetSource: string;
  assetFolderUrl: string;
  driveLink: string;
  coverImageUrl: string;
};

export async function listSupabaseContentItems(): Promise<ContentItemBundle[]> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.from("content_items").select("*").order("planned_date", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data as SupabaseContentItemRow[]).map((row) => mapRowToBundle(row));
}

export async function getSupabaseContentItemById(id: string): Promise<ContentItemBundle | null> {
  const supabase = requireSupabaseClient();
  const rawId = id.startsWith("supa-") ? id.slice(5) : id;
  const { data, error } = await supabase.from("content_items").select("*").eq("id", rawId).maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapRowToBundle(data as SupabaseContentItemRow);
}

export async function insertSupabaseContentItem(input: InsertSupabaseContentItemInput): Promise<ContentItemBundle> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("content_items")
    .insert({
      external_id: input.externalId,
      import_source: input.importSource,
      title: input.title,
      content_type: input.contentType,
      instagram_profile_id: input.instagramProfileId,
      status: input.status,
      planned_date: input.plannedDate,
      caption: input.caption,
      script: input.script,
      description: input.description,
      notes: input.notes,
      filming_date: input.filmingDate,
      asset_source: input.assetSource,
      asset_folder_url: input.assetFolderUrl,
      drive_link: input.driveLink,
      cover_image_url: input.coverImageUrl
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapRowToBundle(data as SupabaseContentItemRow);
}

export async function insertSupabaseBundle(bundle: ContentItemBundle): Promise<ContentItemBundle> {
  const plannedDate = bundle.item.scheduledAt ? bundle.item.scheduledAt.slice(0, 10) : null;
  const filmingDate = bundle.item.filmingDate ? bundle.item.filmingDate.slice(0, 10) : null;
  return insertSupabaseContentItem({
    externalId: bundle.item.externalId ?? bundle.id,
    importSource: bundle.item.importSource ?? "manual",
    title: bundle.item.title,
    contentType: bundle.item.contentType,
    instagramProfileId: resolveInstagramProfileId(bundle.item.instagramProfileId ?? bundle.item.profileId ?? getDefaultProfileId()),
    status: bundle.item.status,
    plannedDate,
    caption: bundle.item.caption ?? "",
    script: bundle.item.script ?? "",
    description: bundle.item.description ?? "",
    notes: bundle.item.notes ?? "",
    filmingDate,
    assetSource: bundle.item.assetSource ?? "manual",
    assetFolderUrl: bundle.item.assetFolderUrl ?? "",
    driveLink: bundle.item.driveLink ?? bundle.item.googleDriveUrl ?? "",
    coverImageUrl: bundle.item.coverImageUrl ?? ""
  });
}

export async function updateSupabaseContentItem(bundle: ContentItemBundle): Promise<void> {
  const supabase = requireSupabaseClient();
  const rawId = bundle.id.startsWith("supa-") ? bundle.id.slice(5) : bundle.id;
  const plannedDate = bundle.item.scheduledAt ? bundle.item.scheduledAt.slice(0, 10) : null;
  const filmingDate = bundle.item.filmingDate ? bundle.item.filmingDate.slice(0, 10) : null;

  const { data, error } = await supabase
    .from("content_items")
    .update({
      external_id: bundle.item.externalId,
      import_source: bundle.item.importSource,
      title: bundle.item.title,
      content_type: bundle.item.contentType,
      instagram_profile_id: resolveInstagramProfileId(bundle.item.instagramProfileId ?? bundle.item.profileId ?? getDefaultProfileId()),
      status: bundle.item.status,
      planned_date: plannedDate,
      caption: bundle.item.caption,
      script: bundle.item.script,
      description: bundle.item.description,
      notes: bundle.item.notes,
      filming_date: filmingDate,
      asset_source: bundle.item.assetSource,
      asset_folder_url: bundle.item.assetFolderUrl,
      drive_link: bundle.item.driveLink,
      cover_image_url: bundle.item.coverImageUrl
    })
    .eq("id", rawId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Update was blocked in Supabase. Apply the UPDATE RLS policy for table content_items.");
  }
}

export async function deleteSupabaseContentItem(id: string): Promise<void> {
  const supabase = requireSupabaseClient();
  const rawId = id.startsWith("supa-") ? id.slice(5) : id;
  const { error } = await supabase.from("content_items").delete().eq("id", rawId);
  if (error) throw error;
}

function requireSupabaseClient(): any {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client is not configured.");
  return supabase;
}

function mapRowToBundle(row: SupabaseContentItemRow): ContentItemBundle {
  const profileId = resolveInstagramProfileId(row.instagram_profile_id || getDefaultProfileId());
  const contentType = toContentType(row.content_type);
  const status = toStatus(row.status);
  const scheduledAt = normalizePlannedDate(row.planned_date);
  const scheduledDate = scheduledAt
    ? new Date(scheduledAt).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      })
    : undefined;

  return {
    id: `supa-${row.id}`,
    item: {
      externalId: row.external_id || row.id,
      importSource: row.import_source || "supabase",
      title: row.title || "Untitled",
      autosaveText: "Synced",
      assignee: "Unassigned",
      status,
      contentType,
      instagramProfileId: profileId,
      profileId,
      project: "Supabase",
      platform: ["Instagram"],
      script: row.script || "",
      description: row.description || "",
      notes: row.notes || "",
      assetSource: row.asset_source || "drive",
      driveLink: row.drive_link || row.asset_folder_url || "",
      assetFolderUrl: row.asset_folder_url || "",
      coverImageUrl: row.cover_image_url || "",
      googleDriveUrl: row.drive_link || row.asset_folder_url || "",
      scheduledAt,
      scheduledDate,
      filmingDate: row.filming_date || undefined,
      caption: row.caption || "",
      hashtags: "",
      filesSummary: row.drive_link || row.asset_folder_url ? "Drive assets linked" : "No assets linked",
      ready: false,
      includeInPreview: true
    },
    assets: [],
    tasks: createChecklistForType(contentType, `supa-${row.id}-task`)
  };
}

function normalizePlannedDate(value: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (!Number.isFinite(+date)) return undefined;
  return `${date.toISOString().slice(0, 10)}T10:00:00.000Z`;
}

function toContentType(value: string | null): ContentFormat {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === "reel" || normalized === "reels") return "Reel";
  if (normalized === "carousel" || normalized === "carousels") return "Carousel";
  return "Post";
}

function toStatus(value: string | null): ContentStatus {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === "planned") return "Planned";
  if (normalized === "filmed") return "Filmed";
  if (normalized === "done") return "Done";
  return "Idea";
}
