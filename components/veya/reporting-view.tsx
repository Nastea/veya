"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";

import { useInstagramProfile } from "@/components/veya/instagram-profile-context";
import { SectionCard } from "@/components/veya/section-card";
import type { ContentItemBundle } from "@/data/content-types";
import { getDefaultProfileId, getInstagramProfileById } from "@/data/instagram-profiles";
import { getCreatedItems } from "@/lib/client-created-items";
import { listSupabaseContentItems } from "@/lib/supabase-content-items";

type ReportingViewProps = {
  items?: ContentItemBundle[];
};

type ReportingMode = "weekly" | "monthly" | "custom";

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
  const [customStartDate, setCustomStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [targetsByProfile, setTargetsByProfile] = useState<Record<string, ProfileTargets>>({});

  useEffect(() => {
    let cancelled = false;
    const sessionItems = getCreatedItems();
    async function loadItems() {
      try {
        const remoteItems = await listSupabaseContentItems();
        if (cancelled) return;
        setAllItems(remoteItems.length > 0 ? mergeById(sessionItems, remoteItems) : sessionItems);
      } catch {
        if (cancelled) return;
        setAllItems(sessionItems);
      }
    }
    void loadItems();
    try {
      const raw = window.sessionStorage.getItem(TARGETS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, ProfileTargets>;
      setTargetsByProfile(parsed);
    } catch {
      // ignore malformed session state
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setProfileId(selectedProfileId);
  }, [selectedProfileId]);

  useEffect(() => {
    window.sessionStorage.setItem(TARGETS_KEY, JSON.stringify(targetsByProfile));
  }, [targetsByProfile]);

  const currentTargets = targetsByProfile[profileId] ?? DEFAULT_TARGETS;

  const period = useMemo(
    () => resolvePeriod(anchorDate, mode, currentTargets.workMonthStartDay, customStartDate, customEndDate),
    [anchorDate, mode, currentTargets.workMonthStartDay, customStartDate, customEndDate]
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
  const sortedScopedItems = useMemo(
    () =>
      [...scopedItems].sort((a, b) => {
        const delta = toTime(a.item.scheduledAt) - toTime(b.item.scheduledAt);
        if (delta !== 0) return delta;
        return a.item.title.localeCompare(b.item.title, "en");
      }),
    [scopedItems]
  );

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
            <option value="custom">Custom range</option>
          </select>
          {mode === "custom" ? (
            <>
              <input
                type="date"
                value={customStartDate}
                onChange={(event) => setCustomStartDate(event.target.value)}
                className="h-9 rounded-lg border border-zinc-200/80 bg-white px-2.5 text-[12px] text-zinc-800 outline-none ring-zinc-300/50 focus:ring-2"
              />
              <input
                type="date"
                value={customEndDate}
                onChange={(event) => setCustomEndDate(event.target.value)}
                className="h-9 rounded-lg border border-zinc-200/80 bg-white px-2.5 text-[12px] text-zinc-800 outline-none ring-zinc-300/50 focus:ring-2"
              />
            </>
          ) : (
            <input
              type="date"
              value={anchorDate}
              onChange={(event) => setAnchorDate(event.target.value)}
              className="h-9 rounded-lg border border-zinc-200/80 bg-white px-2.5 text-[12px] text-zinc-800 outline-none ring-zinc-300/50 focus:ring-2"
            />
          )}
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

      <SectionCard className="px-6 py-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-400">Detailed report</h2>
          <p className="text-[12px] text-zinc-500">
            {sortedScopedItems.length} post{sortedScopedItems.length === 1 ? "" : "s"} in selected period
          </p>
        </div>

        {sortedScopedItems.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-5 text-[13px] text-zinc-600">
            No posts found in this period.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[1300px] border-collapse text-left text-[12px]">
              <thead>
                <tr className="border-b border-zinc-200 text-[10px] uppercase tracking-[0.08em] text-zinc-400">
                  <th className="px-2 py-2 font-medium">Title</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Type</th>
                  <th className="px-2 py-2 font-medium">Profile</th>
                  <th className="px-2 py-2 font-medium">Platform</th>
                  <th className="px-2 py-2 font-medium">Planned</th>
                  <th className="px-2 py-2 font-medium">Filming</th>
                  <th className="px-2 py-2 font-medium">Ready</th>
                  <th className="px-2 py-2 font-medium">In preview</th>
                  <th className="px-2 py-2 font-medium">Caption</th>
                  <th className="px-2 py-2 font-medium">Script</th>
                  <th className="px-2 py-2 font-medium">Comments</th>
                  <th className="px-2 py-2 font-medium">Notes</th>
                  <th className="px-2 py-2 font-medium">Drive</th>
                </tr>
              </thead>
              <tbody>
                {sortedScopedItems.map((bundle) => {
                  const profile = getInstagramProfileById(bundle.item.instagramProfileId ?? bundle.item.profileId ?? "");
                  return (
                    <tr key={bundle.id} className="border-b border-zinc-100 align-top text-zinc-700">
                      <td className="max-w-[230px] px-2 py-2 font-medium text-zinc-900">{bundle.item.title}</td>
                      <td className="px-2 py-2">{bundle.item.status}</td>
                      <td className="px-2 py-2">{bundle.item.contentType}</td>
                      <td className="px-2 py-2">{profile?.name ?? (bundle.item.instagramProfileId ?? bundle.item.profileId)}</td>
                      <td className="px-2 py-2">{bundle.item.platform.join(", ")}</td>
                      <td className="px-2 py-2">{bundle.item.scheduledDate ?? "—"}</td>
                      <td className="px-2 py-2">{bundle.item.filmingDate ?? "—"}</td>
                      <td className="px-2 py-2">{bundle.item.ready ? "Yes" : "No"}</td>
                      <td className="px-2 py-2">{bundle.item.includeInPreview ? "Yes" : "No"}</td>
                      <td className="max-w-[260px] px-2 py-2">{bundle.item.caption || "—"}</td>
                      <td className="max-w-[260px] px-2 py-2">{bundle.item.script || "—"}</td>
                      <td className="max-w-[260px] px-2 py-2">{bundle.item.description || "—"}</td>
                      <td className="max-w-[260px] px-2 py-2">{bundle.item.notes || "—"}</td>
                      <td className="max-w-[220px] px-2 py-2">
                        {bundle.item.driveLink || bundle.item.assetFolderUrl || bundle.item.googleDriveUrl || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
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

function resolvePeriod(
  anchorDate: string,
  mode: ReportingMode,
  workMonthStartDay: number,
  customStartDate: string,
  customEndDate: string
): { start: Date; end: Date } {
  if (mode === "custom") {
    const start = new Date(`${customStartDate}T00:00:00.000Z`);
    const endBase = new Date(`${customEndDate}T00:00:00.000Z`);
    if (!Number.isFinite(+start) || !Number.isFinite(+endBase)) {
      const fallback = new Date(`${anchorDate}T12:00:00.000Z`);
      const end = new Date(fallback);
      end.setUTCDate(end.getUTCDate() + 1);
      fallback.setUTCHours(0, 0, 0, 0);
      return { start: fallback, end };
    }
    const orderedStart = start.getTime() <= endBase.getTime() ? start : endBase;
    const orderedEndBase = start.getTime() <= endBase.getTime() ? endBase : start;
    const end = new Date(orderedEndBase);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start: orderedStart, end };
  }

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

function toTime(value?: string): number {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const time = +new Date(value);
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
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

function mergeById(base: ContentItemBundle[], additions: ContentItemBundle[]): ContentItemBundle[] {
  const seen = new Set<string>();
  const merged: ContentItemBundle[] = [];
  for (const item of [...additions, ...base]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }
  return merged;
}

