import Link from "next/link";

import { SectionCard } from "@/components/veya/section-card";
import { VeyaAppShell } from "@/components/veya/veya-app-shell";

export default function ContentNotFound() {
  return (
    <VeyaAppShell contextLabel="Content" statusText="Saved">
      <div className="px-5 py-16 sm:px-7 lg:px-9">
        <SectionCard className="mx-auto max-w-md px-6 py-10 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-400">Not found</p>
          <h1 className="mt-2 text-xl font-semibold text-zinc-900">No content for this link</h1>
          <p className="mt-2 text-[13px] text-zinc-500">That item does not exist in the mock library yet.</p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl border border-zinc-200/80 bg-white px-4 py-2.5 text-[13px] font-medium text-zinc-800 transition-colors hover:border-zinc-300"
          >
            Back to overview
          </Link>
        </SectionCard>
      </div>
    </VeyaAppShell>
  );
}
