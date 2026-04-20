"use client";

import type { ContentFormat, ContentItemBundle, ContentStatus } from "@/data/content-types";
import { getDefaultProfileId, listInstagramProfiles } from "@/data/instagram-profiles";
import { applyChecklistAutoCompletion } from "@/lib/checklist-auto-completion";
import { createChecklistForType } from "@/lib/checklist-templates";

type CsvRow = Record<string, string>;
type ImportOptions = {
  defaultProfileId?: string;
};

const REQUIRED_HEADERS = ["externalid", "title", "contenttype", "status"] as const;

export function importVeyaCsv(text: string, options: ImportOptions = {}): ContentItemBundle[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  const source = rows[0] ?? {};
  const normalizedHeaders = new Set(Object.keys(source));
  const missing = REQUIRED_HEADERS.filter((header) => !normalizedHeaders.has(header));
  if (missing.length > 0) {
    throw new Error(`Missing CSV headers: ${missing.join(", ")}`);
  }

  return rows.map((row, index) => rowToBundle(row, index, options));
}

function rowToBundle(row: CsvRow, index: number, options: ImportOptions): ContentItemBundle {
  const contentType = toContentType(row.contenttype);
  const status = toStatus(row.status);
  const externalId = row.externalid || `row-${index + 1}`;
  const id = `created-${slug(externalId)}-${Date.now().toString(36)}-${index}`;
  const profileId = resolveProfileId(row.instagramprofileid || row.instagramprofile, options.defaultProfileId);
  const plannedDate = row.planneddate || "";
  const filmingDate = row.filmingdate || "";
  const driveUrl = row.drivelink || row.assetfolderurl || "";
  const scheduledAt = normalizeIsoDate(plannedDate);
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

  const draft: ContentItemBundle = {
    id,
    item: {
      externalId,
      importSource: row.importsource || "csv",
      title: row.title || `Imported item ${index + 1}`,
      autosaveText: "Imported",
      assignee: "Unassigned",
      status,
      contentType,
      instagramProfileId: profileId,
      profileId,
      project: "Imported",
      platform: ["Instagram"],
      script: row.script || "",
      description: row.description || "",
      notes: row.notes || "",
      assetSource: row.assetsource || "csv",
      driveLink: driveUrl,
      assetFolderUrl: driveUrl,
      coverImageUrl: row.coverimageurl || "",
      googleDriveUrl: driveUrl,
      scheduledAt,
      scheduledDate,
      filmingDate: filmingDate || undefined,
      caption: row.caption || "",
      hashtags: "",
      filesSummary: driveUrl ? "Imported assets folder" : "No assets linked",
      ready: false,
      includeInPreview: true,
      primaryAssetId: undefined,
      primaryVideoAssetId: undefined,
      coverAssetId: undefined,
      carouselAssetOrder: undefined
    },
    assets: [],
    tasks: createChecklistForType(contentType, `${id}-task`)
  };

  return {
    ...draft,
    tasks: applyChecklistAutoCompletion(draft.tasks, draft.item, draft.assets)
  };
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((header) => normalizeKey(header));
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeIsoDate(value: string): string | undefined {
  if (!value) return undefined;
  const base = new Date(value);
  if (!Number.isFinite(+base)) return undefined;
  return `${base.toISOString().slice(0, 10)}T10:00:00.000Z`;
}

function toContentType(value: string): ContentFormat {
  const normalized = value.trim().toLowerCase();
  if (normalized === "reel" || normalized === "reels") return "Reel";
  if (normalized === "carousel" || normalized === "carousels") return "Carousel";
  return "Post";
}

function toStatus(value: string): ContentStatus {
  const normalized = value.trim().toLowerCase();
  if (normalized === "planned") return "Planned";
  if (normalized === "filmed") return "Filmed";
  if (normalized === "done") return "Done";
  return "Idea";
}

function resolveProfileId(raw: string, fallbackProfileId?: string): string {
  const value = raw.trim();
  if (!value) return fallbackProfileId || getDefaultProfileId();
  const profiles = listInstagramProfiles();
  const byId = profiles.find((profile) => profile.id.toLowerCase() === value.toLowerCase());
  if (byId) return byId.id;
  const byHandle = profiles.find((profile) => profile.handle.toLowerCase() === value.toLowerCase());
  if (byHandle) return byHandle.id;
  const byName = profiles.find((profile) => profile.name.toLowerCase() === value.toLowerCase());
  if (byName) return byName.id;
  return fallbackProfileId || getDefaultProfileId();
}

function slug(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
