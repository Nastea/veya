import type { ContentAsset } from "@/data/content-types";

function safeFilenamePart(label: string): string {
  return label.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 40) || "asset";
}

/** Mock “download” — creates a small text placeholder (no backend). */
export function downloadMockAssetFile(asset: ContentAsset): void {
  const body = [
    "Veya — mock export",
    `Asset: ${asset.label}`,
    `ID: ${asset.id}`,
    `Type: ${asset.type}`,
    "",
    "Replace with real file delivery when backend is connected."
  ].join("\n");

  const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `veya-${asset.id}-${safeFilenamePart(asset.label)}.txt`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadAllMockAssets(assets: ContentAsset[]): Promise<void> {
  for (let i = 0; i < assets.length; i += 1) {
    downloadMockAssetFile(assets[i]);
    if (i < assets.length - 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
}
