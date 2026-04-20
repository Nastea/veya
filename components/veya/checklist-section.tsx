"use client";

import { Check } from "lucide-react";

import type { ContentTask } from "@/data/content-types";

import { SectionCard } from "./section-card";

type ChecklistSectionProps = {
  tasks: ContentTask[];
  title?: string;
  requirements?: string[];
  editable?: boolean;
  onToggleTask?: (id: string, completed: boolean) => void;
};

export function ChecklistSection({
  tasks,
  title = "Production checklist",
  requirements,
  editable = false,
  onToggleTask
}: ChecklistSectionProps) {
  const byLabel = new Map(tasks.map((task) => [task.label.toLowerCase(), task]));

  return (
    <SectionCard className="px-5 py-5">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-400">{title}</h3>
      {requirements?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {requirements.map((label) => {
            const task = byLabel.get(label.toLowerCase());
            return (
              <span
                key={label}
                className={[
                  "rounded-full border px-2 py-0.5 text-[11px]",
                  task?.completed
                    ? "border-zinc-300 bg-zinc-100 text-zinc-700"
                    : "border-zinc-200 bg-zinc-50 text-zinc-500"
                ].join(" ")}
              >
                {label}
              </span>
            );
          })}
        </div>
      ) : null}
      <ul className="mt-4 space-y-1">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-start gap-3 rounded-lg py-2 text-[13px] text-zinc-800">
            <button
              type="button"
              onClick={() => onToggleTask?.(task.id, !task.completed)}
              disabled={!editable}
              className={[
                "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors",
                task.completed
                  ? "border-zinc-400 bg-zinc-800 text-white"
                  : "border-zinc-300 bg-white text-transparent",
                editable ? "cursor-pointer hover:border-zinc-400" : "cursor-default"
              ].join(" ")}
            >
              <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
            </button>
            <span className={task.completed ? "text-zinc-500 line-through decoration-zinc-300" : ""}>{task.label}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
