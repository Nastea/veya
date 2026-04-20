"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { SectionCard } from "@/components/veya/section-card";
import type { ContentItemBundle } from "@/data/content-types";
import { getCreatedItems } from "@/lib/client-created-items";

export function DashboardView() {
  const [items, setItems] = useState<ContentItemBundle[]>([]);

  useEffect(() => {
    setItems(getCreatedItems());
  }, []);

  const sorted = useMemo(() => [...items].sort((a, b) => toTime(a.item.scheduledAt) - toTime(b.item.scheduledAt)), [items]);

  return (
    <div className="space-y-10 px-5 py-8 sm:px-7 sm:py-10 lg:px-9 lg:py-12">
      <header className="max-w-2xl">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-400">Overview</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">Veya</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
          Plan content, attach media, and preview how posts read together — without leaving a calm workspace.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard className="p-6 lg:col-span-2">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-400">Next up</h2>
          {sorted.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-6">
              <p className="text-[13px] text-zinc-600">No content yet. Create your first item from Calendar or Idea Bank.</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {sorted.slice(0, 4).map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/content/${b.id}`}
                    className="group flex items-start justify-between gap-4 rounded-xl border border-transparent px-1 py-2 transition-colors hover:border-zinc-200 hover:bg-zinc-50/80"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-zinc-900 group-hover:underline">{b.item.title}</p>
                      <p className="mt-0.5 text-[12px] text-zinc-500">{b.item.scheduledDate ?? "Unscheduled idea"}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-zinc-200/90 bg-white px-2 py-0.5 text-[11px] text-zinc-600">
                      {b.item.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard className="flex flex-col gap-3 p-6">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-400">Shortcuts</h2>
          <Link
            href="/ideas"
            className="rounded-xl border border-zinc-200/80 bg-white px-4 py-3 text-[13px] font-medium text-zinc-800 transition-colors hover:border-zinc-300"
          >
            Idea bank
          </Link>
          <Link
            href="/calendar"
            className="rounded-xl border border-zinc-200/80 bg-white px-4 py-3 text-[13px] font-medium text-zinc-800 transition-colors hover:border-zinc-300"
          >
            Open calendar
          </Link>
          <Link
            href="/feed-preview"
            className="rounded-xl border border-zinc-200/80 bg-white px-4 py-3 text-[13px] font-medium text-zinc-800 transition-colors hover:border-zinc-300"
          >
            Feed preview
          </Link>
          <Link
            href="/reporting"
            className="rounded-xl border border-zinc-200/80 bg-white px-4 py-3 text-[13px] font-medium text-zinc-800 transition-colors hover:border-zinc-300"
          >
            Reporting
          </Link>
          <Link
            href={sorted[0] ? `/content/${sorted[0].id}` : "/calendar"}
            className="rounded-xl border border-zinc-200/80 bg-white px-4 py-3 text-[13px] font-medium text-zinc-800 transition-colors hover:border-zinc-300"
          >
            Latest content item
          </Link>
        </SectionCard>
      </div>
    </div>
  );
}

function toTime(value?: string): number {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const time = +new Date(value);
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}
