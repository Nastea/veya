"use client";

import type { ContentItemBundle } from "@/data/content-types";
import { getDefaultProfileId } from "@/data/instagram-profiles";

const STORAGE_KEY = "veya-created-items-v1";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function getCreatedItems(): ContentItemBundle[] {
  if (!canUseStorage()) return [];
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const defaultProfileId = getDefaultProfileId();
    return (parsed as ContentItemBundle[]).map((bundle) => normalizeBundle(bundle, defaultProfileId));
  } catch {
    return [];
  }
}

export function getCreatedItemById(id: string): ContentItemBundle | null {
  return getCreatedItems().find((item) => item.id === id) ?? null;
}

export function saveCreatedItem(nextItem: ContentItemBundle): void {
  if (!canUseStorage()) return;
  const existing = getCreatedItems();
  const withoutSame = existing.filter((item) => item.id !== nextItem.id);
  const merged = [normalizeBundle(nextItem, getDefaultProfileId()), ...withoutSame];
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

function normalizeBundle(bundle: ContentItemBundle, defaultProfileId: string): ContentItemBundle {
  const instagramProfileId = bundle.item.instagramProfileId ?? bundle.item.profileId ?? defaultProfileId;
  return {
    ...bundle,
    item: {
      ...bundle.item,
      instagramProfileId,
      profileId: instagramProfileId,
      externalId: bundle.item.externalId ?? bundle.id,
      importSource: bundle.item.importSource ?? "manual",
      script: bundle.item.script ?? "",
      description: bundle.item.description ?? "",
      notes: bundle.item.notes ?? "",
      assetSource: bundle.item.assetSource ?? "mock",
      assetFolderUrl: bundle.item.assetFolderUrl ?? "",
      driveLink: bundle.item.driveLink ?? bundle.item.assetFolderUrl ?? bundle.item.googleDriveUrl ?? "",
      coverImageUrl: bundle.item.coverImageUrl ?? "",
      googleDriveUrl:
        bundle.item.googleDriveUrl ?? bundle.item.driveLink ?? bundle.item.assetFolderUrl ?? ""
    }
  };
}
