import type { Metadata } from "next";

import { CalendarPlanningView } from "@/components/veya/calendar-planning-view";
import { VeyaAppShell } from "@/components/veya/veya-app-shell";

export const metadata: Metadata = {
  title: "Calendar"
};

export default function CalendarPage() {
  return (
    <VeyaAppShell contextLabel="Calendar" statusText="Saved">
      <CalendarPlanningView initialYear={2026} initialMonthIndex={3} />
    </VeyaAppShell>
  );
}
