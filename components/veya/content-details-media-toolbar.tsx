"use client";

import { ClipboardCopy, Download, ExternalLink, FolderDown } from "lucide-react";
import { useState } from "react";

import type { ContentAsset } from "@/data/content-types";
import { downloadAllMockAssets, downloadMockAssetFile } from "@/lib/mock-asset-download";

type ContentDetailsMediaToolbarProps = {
  caption: string;
  hashtags: string;
  currentAsset: ContentAsset | null;
  allAssets: ContentAsset[];
  assetSource?: string;
  assetFolderUrl?: string;
};

export function ContentDetailsMediaToolbar({
  caption,
  hashtags,
  currentAsset,
  allAssets,
  assetSource,
  assetFolderUrl
}: ContentDetailsMediaToolbarProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  function showFeedback(text: string) {
    setFeedback(text);
    window.setTimeout(() => setFeedback(null), 2200);
  }

  async function handleCopyCaption() {
    const text = [caption.trim(), hashtags.trim()].filter(Boolean).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      showFeedback("Caption copied");
    } catch {
      showFeedback("Could not copy");
    }
  }

  function handleDownloadCurrent() {
    if (!currentAsset) return;
    downloadMockAssetFile(currentAsset);
    showFeedback("Download started");
  }

  async function handleDownloadAll() {
    if (allAssets.length === 0) return;
    if ((assetSource ?? "").toLowerCase().includes("local") && assetFolderUrl) {
      showFeedback("Local assets detected. Use Open assets to access originals.");
      return;
    }
    showFeedback("Downloading…");
    await downloadAllMockAssets(allAssets);
    showFeedback("All downloads started");
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopyCaption}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200/80 bg-white px-3 text-[12px] font-medium text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
        >
          <ClipboardCopy className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
          Copy caption
        </button>
        <button
          type="button"
          onClick={handleDownloadCurrent}
          disabled={!currentAsset}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200/80 bg-white px-3 text-[12px] font-medium text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
          Download current
        </button>
        <button
          type="button"
          onClick={handleDownloadAll}
          disabled={allAssets.length === 0 && !((assetSource ?? "").toLowerCase().includes("local") && assetFolderUrl)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200/80 bg-white px-3 text-[12px] font-medium text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FolderDown className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
          Download assets
        </button>
        <a
          href={assetFolderUrl || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className={[
            "inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200/80 bg-white px-3 text-[12px] font-medium text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-zinc-50",
            !assetFolderUrl ? "pointer-events-none opacity-40" : ""
          ].join(" ")}
        >
          <ExternalLink className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
          Open assets
        </a>
      </div>
      {feedback ? (
        <p className="text-[11px] font-medium tabular-nums text-zinc-500" role="status">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
