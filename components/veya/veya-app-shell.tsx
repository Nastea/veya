"use client";

import { useEffect, useState } from "react";

import { AppSidebar } from "@/components/veya/app-sidebar";
import { InstagramProfileProvider } from "@/components/veya/instagram-profile-context";
import { TopStatusBar } from "@/components/veya/top-status-bar";
import { getDefaultProfileId } from "@/data/instagram-profiles";

type VeyaAppShellProps = {
  children: React.ReactNode;
  /** Shown in the thin top bar (left). */
  contextLabel?: string;
  /** Saved / sync line (right). */
  statusText?: string;
};

export function VeyaAppShell({ children, contextLabel = "Veya", statusText = "Saved" }: VeyaAppShellProps) {
  const [selectedProfileId, setSelectedProfileId] = useState<string>(getDefaultProfileId());

  useEffect(() => {
    const key = "veya-selected-profile";
    const stored = window.sessionStorage.getItem(key);
    if (stored) setSelectedProfileId(stored);
  }, []);

  function handleProfileChange(profileId: string) {
    setSelectedProfileId(profileId);
    window.sessionStorage.setItem("veya-selected-profile", profileId);
  }

  return (
    <InstagramProfileProvider value={{ selectedProfileId, setSelectedProfileId: handleProfileChange }}>
      <main className="min-h-screen bg-[#efeff2] p-4 md:p-8 lg:p-10">
        <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1600px] md:min-h-[calc(100vh-4rem)] lg:min-h-[calc(100vh-5rem)]">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col border border-zinc-200/60 bg-[#f7f7f9] lg:rounded-r-2xl">
            <TopStatusBar
              contextLabel={contextLabel}
              statusText={statusText}
              selectedProfileId={selectedProfileId}
              onProfileChange={handleProfileChange}
            />
            <div className="min-h-0 flex-1">{children}</div>
          </div>
        </div>
      </main>
    </InstagramProfileProvider>
  );
}
