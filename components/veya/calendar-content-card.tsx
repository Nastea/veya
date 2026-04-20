"use client";

import { CheckCircle2, GripVertical } from "lucide-react";
import Link from "next/link";
import type { HTMLAttributes } from "react";

import { ContentPreviewCard } from "@/components/veya/content-preview-card";
import type { ContentItemBundle } from "@/data/content-types";

type CalendarContentCardProps = {
  bundle: ContentItemBundle;
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>;
};

export function CalendarContentCard({ bundle, dragHandleProps }: CalendarContentCardProps) {
  const platformLabel =
    bundle.item.platform.length > 2
      ? `${bundle.item.platform[0]} +${bundle.item.platform.length - 1}`
      : bundle.item.platform.join(" · ");

  return (
    <Link
      href={`/content/${bundle.id}`}
      className="group block overflow-hidden rounded-xl border border-zinc-200/75 bg-white transition-colors hover:border-zinc-300"
    >
      <ContentPreviewCard
        title={bundle.item.title}
        item={bundle.item}
        assets={bundle.assets}
        aspectClassName="aspect-[4/5] w-full"
        variant="calendar"
      />
      <div className="space-y-2 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={[
                "inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]",
                bundle.item.contentType === "Reel"
                  ? "border-indigo-200/90 bg-indigo-50 text-indigo-700"
                  : bundle.item.contentType === "Carousel"
                    ? "border-amber-200/90 bg-amber-50 text-amber-700"
                    : "border-zinc-200/90 bg-zinc-50 text-zinc-700"
              ].join(" ")}
            >
              {bundle.item.contentType}
            </span>
            {bundle.item.status === "Done" ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/90 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                Done
              </span>
            ) : null}
          </div>
          {dragHandleProps ? (
            <button
              type="button"
              aria-label="Drag post to another day"
              className="inline-flex h-5 w-5 cursor-grab items-center justify-center rounded border border-zinc-200 bg-white text-zinc-400 transition-colors hover:border-zinc-300 hover:text-zinc-600 active:cursor-grabbing"
              onClick={(event) => event.preventDefault()}
              {...dragHandleProps}
            >
              <GripVertical className="h-3 w-3" />
            </button>
          ) : null}
        </div>
        <p className="line-clamp-2 text-[11px] font-medium leading-snug text-zinc-900 group-hover:text-zinc-950">
          {bundle.item.title}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          <span className="truncate text-zinc-500">{platformLabel}</span>
          <span className="text-zinc-300">•</span>
          <span className="inline-flex rounded-full border border-zinc-200/90 bg-zinc-50 px-1.5 py-0.5 text-zinc-600">
            {bundle.item.status}
          </span>
        </div>
      </div>
    </Link>
  );
}
