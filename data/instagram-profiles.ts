import type { InstagramProfile } from "./content-types";

export const instagramProfiles: InstagramProfile[] = [
  { id: "anastasia", name: "Anastasia", handle: "@anastasia", avatar: "A", active: true },
  { id: "ecaterina", name: "Ecaterina", handle: "@ecaterina", avatar: "E", active: true }
];

export function listInstagramProfiles(): InstagramProfile[] {
  return [...instagramProfiles];
}

export function getInstagramProfileById(id: string): InstagramProfile | undefined {
  return instagramProfiles.find((profile) => profile.id === id);
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/^@/, "");
}

export function resolveInstagramProfileId(rawValue: string | null | undefined): string {
  if (!rawValue) return getDefaultProfileId();
  const normalized = normalizeKey(rawValue);
  const exact = instagramProfiles.find((profile) => profile.id === normalized && profile.active);
  if (exact) return exact.id;

  const byName = instagramProfiles.find((profile) => normalizeKey(profile.name) === normalized && profile.active);
  if (byName) return byName.id;

  const byHandle = instagramProfiles.find((profile) => normalizeKey(profile.handle) === normalized && profile.active);
  if (byHandle) return byHandle.id;

  return getDefaultProfileId();
}

export function getDefaultProfileId(): string {
  return (
    instagramProfiles.find((profile) => profile.id === "ecaterina" && profile.active)?.id ??
    instagramProfiles.find((profile) => profile.active)?.id ??
    instagramProfiles[0]?.id ??
    "ecaterina"
  );
}
