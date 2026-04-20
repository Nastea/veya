"use client";

type MetadataRowProps = {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  valueClassName?: string;
};

export function MetadataRow({ label, value, icon, valueClassName }: MetadataRowProps) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-zinc-100 py-4 first:pt-0 last:border-b-0 sm:grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] sm:items-start sm:gap-6 sm:py-3.5">
      <div className="flex items-center gap-2 text-zinc-400">
        <span className="text-zinc-400 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:stroke-[1.5]">{icon}</span>
        <span className="text-[11px] font-medium uppercase tracking-[0.08em]">{label}</span>
      </div>
      <div
        className={`min-w-0 text-[13px] leading-snug text-zinc-800 sm:text-right sm:leading-relaxed ${valueClassName ?? ""}`}
      >
        {value}
      </div>
    </div>
  );
}
