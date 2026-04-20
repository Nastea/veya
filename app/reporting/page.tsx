import type { Metadata } from "next";

import { ReportingView } from "@/components/veya/reporting-view";
import { VeyaAppShell } from "@/components/veya/veya-app-shell";

export const metadata: Metadata = {
  title: "Reporting"
};

export default function ReportingPage() {
  return (
    <VeyaAppShell contextLabel="Reporting" statusText="Saved">
      <ReportingView />
    </VeyaAppShell>
  );
}
