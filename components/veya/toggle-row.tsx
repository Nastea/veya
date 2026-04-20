"use client";

type ToggleRowProps = {
  label: string;
  enabled: boolean;
};

export function ToggleRow({ label, enabled }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <p className="text-[13px] text-zinc-600">{label}</p>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        className={[
          "relative h-[22px] w-10 shrink-0 rounded-full transition-colors",
          enabled ? "bg-zinc-700" : "bg-zinc-200"
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white ring-1 ring-zinc-900/5 transition-[left]",
            enabled ? "left-[18px]" : "left-0.5"
          ].join(" ")}
        />
      </button>
    </div>
  );
}
