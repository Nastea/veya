"use client";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { restrictToHorizontalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CirclePlay, FileImage, GripVertical } from "lucide-react";

import type { ContentAsset } from "@/data/content-types";

type CarouselSortableStripProps = {
  items: ContentAsset[];
  selectedId: string | null;
  onReorder: (next: ContentAsset[]) => void;
  onSelect: (id: string) => void;
};

function SortableThumb({
  asset,
  selected,
  onSelect
}: {
  asset: ContentAsset;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: asset.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined
  };

  return (
    <div ref={setNodeRef} style={style} className="flex shrink-0 items-stretch gap-1">
      <button
        type="button"
        className="flex h-[92px] w-7 shrink-0 items-center justify-center rounded-l-lg border border-r-0 border-zinc-200/80 bg-zinc-50/80 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" strokeWidth={1.5} />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className={[
          "w-[104px] shrink-0 overflow-hidden rounded-r-xl border border-l-0 bg-white p-1.5 text-left transition-colors",
          selected ? "border-zinc-400 ring-1 ring-zinc-300/60" : "border-zinc-200/80 hover:border-zinc-300"
        ].join(" ")}
      >
        <div
          className={[
            "flex aspect-[4/3] items-center justify-center rounded-lg bg-gradient-to-br ring-1 ring-inset ring-zinc-900/[0.04]",
            asset.color
          ].join(" ")}
        >
          {asset.type === "video" ? (
            <CirclePlay className="h-4 w-4 text-zinc-600/55" strokeWidth={1.5} />
          ) : (
            <FileImage className="h-4 w-4 text-zinc-600/55" strokeWidth={1.5} />
          )}
        </div>
        <p className="mt-2 truncate px-0.5 text-[11px] text-zinc-600">{asset.label}</p>
      </button>
    </div>
  );
}

export function CarouselSortableStrip({ items, selectedId, onReorder, onSelect }: CarouselSortableStripProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((a) => a.id === active.id);
    const newIndex = items.findIndex((a) => a.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  }

  return (
    <div>
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-400">Slides — drag to reorder</p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToHorizontalAxis, restrictToParentElement]}
      >
        <SortableContext items={items.map((a) => a.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:overflow-x-auto sm:pb-1">
            {items.map((asset) => (
              <SortableThumb
                key={asset.id}
                asset={asset}
                selected={selectedId === asset.id}
                onSelect={() => onSelect(asset.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
