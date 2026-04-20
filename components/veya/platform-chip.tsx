"use client";

type PlatformChipProps = {
  children: React.ReactNode;
};

export function PlatformChip({ children }: PlatformChipProps) {
  return (
    <span className="rounded-md border border-zinc-200/80 bg-zinc-50/80 px-2 py-0.5 text-[12px] text-zinc-700">
      {children}
    </span>
  );
}
