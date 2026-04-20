import type { InstagramProfile } from "./content-types";

export const instagramProfiles: InstagramProfile[] = [
  { id: "luna-studio", name: "Luna Studio", handle: "@lunastudio", avatar: "L", active: true },
  { id: "northbound-skin", name: "Northbound Skin", handle: "@northboundskin", avatar: "N", active: true },
  { id: "atelier-house", name: "Atelier House", handle: "@atelierhouse", avatar: "A", active: true }
];

export function listInstagramProfiles(): InstagramProfile[] {
  return [...instagramProfiles];
}

export function getInstagramProfileById(id: string): InstagramProfile | undefined {
  return instagramProfiles.find((profile) => profile.id === id);
}

export function getDefaultProfileId(): string {
  return instagramProfiles.find((profile) => profile.active)?.id ?? instagramProfiles[0]?.id ?? "luna-studio";
}
