"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";

import { useInstagramProfile } from "@/components/veya/instagram-profile-context";
import { SectionCard } from "@/components/veya/section-card";
import type { ContentItemBundle } from "@/data/content-types";
import { getDefaultProfileId } from "@/data/instagram-profiles";
import { getCreatedItems } from "@/lib/client-created-items";

type ReportingViewProps = {
  items?: ContentItemBundle[];
};

type ReportingMode = "weekly" | "monthly";

type ProfileTargets = {
  reelsPerWeek: number;
  carouselsPerWeek: number;
  filmingDaysPerMonth: number;
  workMonthStartDay: number;
};

const TARGETS_KEY = "veya-profile-targets";

const DEFAULT_TARGETS: ProfileTargets = {
  reelsPerWeek: 3,
  carouselsPerWeek: 2,
  filmingDaysPerMonth: 6,
  workMonthStartDay: 1
};

export function ReportingView({ items = [] }: ReportingViewProps) {
  const [allItems, setAllItems] = useState<ContentItemBundle[]>(items);
  const { selectedProfileId } = useInstagramProfile();
  const [profileId, setProfileId] = useState<string>(selectedProfileId || getDefaultProfileId());
  const [mode, setMode] = useState<ReportingMode>("monthly");
  const [anchorDate, setAnchorDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [targetsByProfile, setTargetsByProfile] = useState<Record<string, ProfileTargets>>({});

  useEffect(() => {
    setAllItems(getCreatedItems());
    try {
      const raw = window.sessionStorage.getItem(TARGETS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, ProfileTargets>;
      setTargetsByProfile(parsed);
    } catch {
      // ignore malformed session state
    }
  }, []);

  useEffect(() => {
    setProfileId(selectedProfileId);
  }, [selectedProfileId]);

  useEffect(() => {
    window.sessionStorage.setItem(TARGETS_KEY, JSON.stringify(targetsByProfile));
  }, [targetsByProfile]);

  const currentTargets = targetsByProfile[profileId] ?? DEFAULT_TARGETS;

  const period = useMemo(
    () => resolvePeriod(anchorDate, mode, currentTargets.workMonthStartDay),
    [anchorDate, mode, currentTargets.workMonthStartDay]
  );

  const scopedItems = useMemo(
    () =>
      allItems.filter(
        (bundle) =>
          (bundle.item.instagramProfileId ?? bundle.item.profileId) === profileId &&
          isWithinPeriod(bundle.item.scheduledAt, period.start, period.end)
      ),
    [allItems, profileId, period.end, period.start]
  );

  const reelsCount = scopedItems.filter((bundle) => bundle.item.contentType === "Reel").length;
  const carouselsCount = scopedItems.filter((bundle) => bundle.item.contentType === "Carousel").length;
  const postsCount = scopedItems.filter((bundle) => bundle.item.contentType === "Post").length;
  const filmingDaysCount = countFilmingDays(scopedItems, period.start, period.end);

  const weeksInPeriod = Math.max(1, Math.ceil((period.end.getTime() - period.start.getTime()) / (7 * 24 * 60 * 60 * 1000)));

  const reelsTarget = mode === "weekly" ? currentTargets.reelsPerWeek : currentTargets.reelsPerWeek * weeksInPeriod;
  const carouselsTarget =
    mode === "weekly" ? currentTargets.carouselsPerWeek : currentTargets.carouselsPerWeek * weeksInPeriod;
  const filmingTarget =
    mode === "weekly"
      ? Math.max(1, Math.round(currentTargets.filmingDaysPerMonth / 4))
      : currentTargets.filmingDaysPerMonth;

  function updateTargets(patch: Partial<ProfileTargets>) {
    setTargetsByProfile((prev) => ({
      ...prev,
      [profileId]: { ...(prev[profileId] ?? DEFAULT_TARGETS), ...patch }
    }));
  }

  function handleNumberInput(
    event: ChangeEvent<HTMLInputElement>,
    key: keyof Pick<ProfileTargets, "reelsPerWeek" | "carouselsPerWeek" | "filmingDaysPerMonth" | "workMonthStartDay">
  ) {
    const asNumber = Number(event.target.value);
    if (!Number.isFinite(asNumber)) return;
    const normalized =
      key === "workMonthStartDay" ? Math.min(28, Math.max(1, Math.round(asNumber))) : Math.max(0, Math.round(asNumber));
    updateTargets({ [key]: normalized });
  }

  return (
    <div className="space-y-8 px-5 py-8 sm:px-7 sm:py-10 lg:px-9 lg:py-12">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-400">Production tracking</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">Reporting</h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-zinc-500">
            Track delivery against planning targets by Instagram profile. This view measures production volume, not social performance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as ReportingMode)}
            className="h-9 min-w-[8.5rem] rounded-lg border border-zinc-200/80 bg-white px-2.5 text-[12px] text-zinc-800 outline-none ring-zinc-300/50 focus:ring-2"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <input
            type="date"
            value={anchorDate}
            onChange={(event) => setAnchorDate(event.target.value)}
            className="h-9 rounded-lg border border-zinc-200/80 bg-white px-2.5 text-[12px] text-zinc-800 outline-none ring-zinc-300/50 focus:ring-2"
          />
        </div>
      </header>

      <SectionCard className="px-6 py-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-400">Reporting period</p>
          <p className="text-[12px] text-zinc-500">{formatRange(period.start, period.end)}</p>
        </div>
      </SectionCard>

      <SectionCard className="px-6 py-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-400">Targets</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TargetInput label="Reels / week" value={currentTargets.reelsPerWeek} onChange={(event) => handleNumberInput(event, "reelsPerWeek")} />
          <TargetInput
            label="Carousels / week"
            value={currentTargets.carouselsPerWeek}
            onChange={(event) => handleNumberInput(event, "carouselsPerWeek")}
          />
          <TargetInput
            label="Filming days / month"
            value={currentTargets.filmingDaysPerMonth}
            onChange={(event) => handleNumberInput(event, "filmingDaysPerMonth")}
          />
          <TargetInput
            label="Work-month start day"
            value={currentTargets.workMonthStartDay}
            onChange={(event) => handleNumberInput(event, "workMonthStartDay")}
          />
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ProgressCard label="Reels created" completed={reelsCount} target={reelsTarget} />
        <ProgressCard label="Carousels created" completed={carouselsCount} target={carouselsTarget} />
        <ProgressCard label="Posts created" completed={postsCount} target={0} showTarget={false} />
        <ProgressCard label="Filming days" completed={filmingDaysCount} target={filmingTarget} />
      </div>
    </div>
  );
}

function TargetInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={onChange}
        className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-[13px] text-zinc-900 outline-none ring-zinc-300/50 focus:ring-2"
      />
    </label>
  );
}

function ProgressCard({
  label,
  completed,
  target,
  showTarget = true
}: {
  label: string;
  completed: number;
  target: number;
  showTarget?: boolean;
}) {
  const percentage = !showTarget || target <= 0 ? 0 : Math.min(100, Math.round((completed / target) * 100));
  return (
    <SectionCard className="px-5 py-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900">
        {completed}
        {showTarget ? <span className="ml-1 text-lg text-zinc-400">/ {target}</span> : null}
      </p>
      {showTarget ? (
        <>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-zinc-700/80 transition-all" style={{ width: `${percentage}%` }} />
          </div>
          <p className="mt-2 text-[12px] text-zinc-500">{percentage}% of target</p>
        </>
      ) : (
        <p className="mt-2 text-[12px] text-zinc-500">Informational metric</p>
      )}
    </SectionCard>
  );
}

function countFilmingDays(items: ContentItemBundle[], start: Date, end: Date): number {
  const uniqueDays = new Set<string>();
  for (const bundle of items) {
    const filmingSource = bundle.item.filmingDate ?? (bundle.item.status === "Filmed" ? bundle.item.scheduledAt : undefined);
    if (!isWithinPeriod(filmingSource, start, end)) continue;
    uniqueDays.add(new Date(filmingSource as string).toISOString().slice(0, 10));
  }
  return uniqueDays.size;
}

function resolvePeriod(anchorDate: string, mode: ReportingMode, workMonthStartDay: number): { start: Date; end: Date } {
  const base = new Date(`${anchorDate}T12:00:00.000Z`);
  if (mode === "weekly") {
    const day = base.getUTCDay() || 7;
    const start = new Date(base);
    start.setUTCDate(start.getUTCDate() - (day - 1));
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    return { start, end };
  }

  const startDay = Math.min(28, Math.max(1, workMonthStartDay));
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const useCurrentMonthStart = base.getUTCDate() >= startDay;
  const start = new Date(Date.UTC(year, useCurrentMonthStart ? month : month - 1, startDay, 0, 0, 0));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, startDay, 0, 0, 0));
  return { start, end };
}

function isWithinPeriod(dateLike: string | undefined, start: Date, end: Date): boolean {
  if (!dateLike) return false;
  const t = new Date(dateLike).getTime();
  return Number.isFinite(t) && t >= start.getTime() && t < end.getTime();
}

function formatRange(start: Date, end: Date): string {
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
  const endInclusive = new Date(end);
  endInclusive.setUTCDate(endInclusive.getUTCDate() - 1);
  return `${formatter.format(start)} - ${formatter.format(endInclusive)}`;
}

