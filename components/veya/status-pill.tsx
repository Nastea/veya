"use client";

type StatusPillProps = {
  children: React.ReactNode;
};

export function StatusPill({ children }: StatusPillProps) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200/90 bg-zinc-50 px-2.5 py-0.5 text-[12px] font-medium text-zinc-700">
      {children}
    </span>
  );
}
