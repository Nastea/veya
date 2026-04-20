import type { Metadata } from "next";

import { IdeasBankView } from "@/components/veya/ideas-bank-view";
import { VeyaAppShell } from "@/components/veya/veya-app-shell";

export const metadata: Metadata = {
  title: "Idea bank"
};

export default function IdeasPage() {
  return (
    <VeyaAppShell contextLabel="Ideas" statusText="Saved">
      <IdeasBankView />
    </VeyaAppShell>
  );
}
