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

export function getDefaultProfileId(): string {
  return (
    instagramProfiles.find((profile) => profile.id === "ecaterina" && profile.active)?.id ??
    instagramProfiles.find((profile) => profile.active)?.id ??
    instagramProfiles[0]?.id ??
    "ecaterina"
  );
}
