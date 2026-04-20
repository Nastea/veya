import type { Metadata } from "next";

import { DashboardView } from "@/components/veya/dashboard-view";
import { VeyaAppShell } from "@/components/veya/veya-app-shell";

export const metadata: Metadata = {
  title: "Overview"
};

export default function HomePage() {
  return (
    <VeyaAppShell contextLabel="Overview" statusText="Saved">
      <DashboardView />
    </VeyaAppShell>
  );
}
