import type { Metadata } from "next";

import { FeedPreviewGrid } from "@/components/veya/feed-preview-grid";
import { VeyaAppShell } from "@/components/veya/veya-app-shell";

export const metadata: Metadata = {
  title: "Feed preview"
};

export default function FeedPreviewPage() {
  return (
    <VeyaAppShell contextLabel="Feed preview" statusText="Saved">
      <FeedPreviewGrid />
    </VeyaAppShell>
  );
}
