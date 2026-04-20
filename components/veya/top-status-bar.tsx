"use client";

import { listInstagramProfiles } from "@/data/instagram-profiles";

type TopStatusBarProps = {
  contextLabel?: string;
  statusText: string;
  selectedProfileId: string;
  onProfileChange: (profileId: string) => void;
};

const PROFILES = listInstagramProfiles().filter((profile) => profile.active);

export function TopStatusBar({
  contextLabel = "Content",
  statusText,
  selectedProfileId,
  onProfileChange
}: TopStatusBarProps) {
  return (
    <header className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-zinc-200/50 bg-[#fafafa]/90 px-5 backdrop-blur-[2px]">
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400">{contextLabel}</span>
        <select
          value={selectedProfileId}
          onChange={(e) => onProfileChange(e.target.value)}
          className="h-7 min-w-[10.5rem] rounded-md border border-zinc-200/80 bg-white px-2 text-[11px] text-zinc-700 outline-none ring-zinc-300/50 focus:ring-2"
          aria-label="Instagram profile"
        >
          {PROFILES.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
      </div>
      <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
        <span className="h-1 w-1 rounded-full bg-emerald-500/70" aria-hidden />
        {statusText}
      </span>
    </header>
  );
}
