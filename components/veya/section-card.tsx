"use client";

type SectionCardProps = {
  children: React.ReactNode;
  className?: string;
};

export function SectionCard({ children, className = "" }: SectionCardProps) {
  return (
    <div className={["rounded-2xl border border-zinc-200/70 bg-white", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
