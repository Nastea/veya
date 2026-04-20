import type { ContentFormat, ContentTask } from "@/data/content-types";

const TEMPLATE_BY_TYPE: Record<ContentFormat, string[]> = {
  Post: ["Photo", "Caption"],
  Reel: ["Video", "Cover", "Caption"],
  Carousel: ["Carousel slides", "Caption"]
};

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function checklistTemplateForType(type: ContentFormat): string[] {
  return TEMPLATE_BY_TYPE[type];
}

export function createChecklistForType(type: ContentFormat, prefix = "task"): ContentTask[] {
  return checklistTemplateForType(type).map((label) => ({
    id: `${prefix}-${slug(label)}`,
    label,
    completed: false
  }));
}

export function reconcileChecklistForType(
  existing: ContentTask[],
  nextType: ContentFormat,
  prefix = "task"
): ContentTask[] {
  const byLabel = new Map(existing.map((task) => [task.label.toLowerCase(), task]));
  return checklistTemplateForType(nextType).map((label) => {
    const prior = byLabel.get(label.toLowerCase());
    return {
      id: `${prefix}-${slug(label)}`,
      label,
      completed: prior?.completed ?? false
    };
  });
}
