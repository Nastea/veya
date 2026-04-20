"use client";

import { createContext, useContext } from "react";

type InstagramProfileContextValue = {
  selectedProfileId: string;
  setSelectedProfileId: (profileId: string) => void;
};

const InstagramProfileContext = createContext<InstagramProfileContextValue | null>(null);

export function InstagramProfileProvider({
  value,
  children
}: {
  value: InstagramProfileContextValue;
  children: React.ReactNode;
}) {
  return <InstagramProfileContext.Provider value={value}>{children}</InstagramProfileContext.Provider>;
}

export function useInstagramProfile(): InstagramProfileContextValue {
  const context = useContext(InstagramProfileContext);
  if (!context) {
    throw new Error("useInstagramProfile must be used within InstagramProfileProvider");
  }
  return context;
}
