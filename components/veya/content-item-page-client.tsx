"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ContentItemDetailsView } from "@/components/veya/content-item-details-view";
import { SectionCard } from "@/components/veya/section-card";
import { VeyaAppShell } from "@/components/veya/veya-app-shell";
import type { ContentItemBundle, ContentItemFields } from "@/data/content-types";
import { applyChecklistAutoCompletion } from "@/lib/checklist-auto-completion";
import { reconcileChecklistForType } from "@/lib/checklist-templates";
import {
  deleteSupabaseContentItem,
  getSupabaseContentItemById,
  updateSupabaseContentItem
} from "@/lib/supabase-content-items";

type ContentItemPageClientProps = {
  id: string;
  initialBundle: ContentItemBundle | null;
};

export function ContentItemPageClient({ id, initialBundle }: ContentItemPageClientProps) {
  const router = useRouter();
  const [bundle, setBundle] = useState<ContentItemBundle | null>(initialBundle);
  const [statusText, setStatusText] = useState("Saved");
  const editable = id.startsWith("supa-");

  useEffect(() => {
    let cancelled = false;

    async function loadBundle() {
      if (initialBundle) return;
      try {
        const fromSupabase = await getSupabaseContentItemById(id);
        if (!cancelled && fromSupabase) {
          setBundle(fromSupabase);
        }
      } catch {
        // Keep empty-state behavior if Supabase fetch fails.
      }
    }

    void loadBundle();
    return () => {
      cancelled = true;
    };
  }, [id, initialBundle]);

  if (!bundle) {
    return (
      <VeyaAppShell contextLabel="Content" statusText="Saved">
        <div className="px-5 py-16 sm:px-7 lg:px-9">
          <SectionCard className="mx-auto max-w-md px-6 py-10 text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-400">Not found</p>
            <h1 className="mt-2 text-xl font-semibold text-zinc-900">No content for this link</h1>
            <p className="mt-2 text-[13px] text-zinc-500">That item does not exist in the mock library yet.</p>
            <Link
              href="/calendar"
              className="mt-6 inline-flex rounded-xl border border-zinc-200/80 bg-white px-4 py-2.5 text-[13px] font-medium text-zinc-800 transition-colors hover:border-zinc-300"
            >
              Back to calendar
            </Link>
          </SectionCard>
        </div>
      </VeyaAppShell>
    );
  }

  function handleItemChange(next: ContentItemFields) {
    setBundle((prev) => {
      if (!prev) return prev;
      const typeChanged = prev.item.contentType !== next.contentType;
      const baseTasks = typeChanged
        ? reconcileChecklistForType(prev.tasks, next.contentType, `${prev.id}-task`)
        : prev.tasks;
      const nextTasks = applyChecklistAutoCompletion(baseTasks, next, prev.assets, prev.item);
      const updated = { ...prev, item: next, tasks: nextTasks };
      if (editable) {
        setStatusText("Syncing...");
        void updateSupabaseContentItem(updated)
          .then(() => setStatusText("Synced"))
          .catch((error) => setStatusText(error instanceof Error ? error.message : "Sync failed"));
      }
      return updated;
    });
  }

  function handleTasksChange(nextTasks: ContentItemBundle["tasks"]) {
    setBundle((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, tasks: nextTasks };
      if (editable) {
        setStatusText("Syncing...");
        void updateSupabaseContentItem(updated)
          .then(() => setStatusText("Synced"))
          .catch((error) => setStatusText(error instanceof Error ? error.message : "Sync failed"));
      }
      return updated;
    });
  }

  function handleDelete() {
    if (!bundle) return;
    if (bundle.id.startsWith("supa-")) {
      setStatusText("Deleting...");
      void deleteSupabaseContentItem(bundle.id)
        .then(() => router.push("/ideas"))
        .catch(() => setStatusText("Could not delete"));
      return;
    }
    router.push("/ideas");
  }

  return (
    <VeyaAppShell contextLabel="Content" statusText={statusText}>
      <ContentItemDetailsView
        contentId={bundle.id}
        item={bundle.item}
        assets={bundle.assets}
        tasks={bundle.tasks}
        editable={editable}
        onDelete={handleDelete}
        onItemChange={handleItemChange}
        onTasksChange={handleTasksChange}
      />
    </VeyaAppShell>
  );
}
