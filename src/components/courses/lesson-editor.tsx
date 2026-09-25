"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import {
  CodeIcon, FileIcon, FlaskConicalIcon, GripVerticalIcon,
  ImageIcon, LinkIcon, PackageIcon, ClipboardListIcon, Trash2Icon,
  TypeIcon, VideoIcon,
} from "lucide-react";
import { api } from "@/lib/api-client";
import type { LessonNode, OptionItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AsyncCombobox } from "@/components/async-combobox";
import { cn } from "@/lib/utils";

interface Block {
  id: string;
  type: "text" | "video" | "image" | "pdf" | "link" | "code" | "resource" | "quiz" | "lab";
  text?: string;
  url?: string;
  language?: string;
  refId?: number;
}

const BLOCK_TYPES: { type: Block["type"]; label: string; icon: React.ReactNode }[] = [
  { type: "text", label: "Text", icon: <TypeIcon className="size-4" /> },
  { type: "video", label: "Video", icon: <VideoIcon className="size-4" /> },
  { type: "image", label: "Image", icon: <ImageIcon className="size-4" /> },
  { type: "pdf", label: "PDF", icon: <FileIcon className="size-4" /> },
  { type: "link", label: "Link", icon: <LinkIcon className="size-4" /> },
  { type: "code", label: "Code", icon: <CodeIcon className="size-4" /> },
  { type: "resource", label: "Resource", icon: <PackageIcon className="size-4" /> },
  { type: "quiz", label: "Quiz", icon: <ClipboardListIcon className="size-4" /> },
  { type: "lab", label: "Lab", icon: <FlaskConicalIcon className="size-4" /> },
];

let uid = 0;
const nextId = () => `blk-${Date.now()}-${uid++}`;

export function LessonEditor({ lessonId }: { lessonId: number }) {
  const qc = useQueryClient();
  const { data: lesson, isLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => api<LessonNode>(`/api/admin/lessons/${lessonId}`),
  });

  const [meta, setMeta] = React.useState<{ title: string; durationMin: number } | null>(null);
  const [blocks, setBlocks] = React.useState<Block[]>([]);
  const [dirty, setDirty] = React.useState(false);

  if (lesson && meta === null) {
    setMeta({ title: lesson.title, durationMin: lesson.durationMin });
    setBlocks(JSON.parse(lesson.blocks || "[]"));
  }

  const save = useMutation({
    mutationFn: () =>
      api(`/api/admin/lessons/${lessonId}`, {
        method: "PATCH",
        body: JSON.stringify({ ...meta, blocks }),
      }),
    onSuccess: () => {
      toast.success("Chapter saved");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["lesson", lessonId] });
      qc.invalidateQueries({ queryKey: ["curriculum"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: (status: string) =>
      api(`/api/admin/lessons/${lessonId}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["lesson", lessonId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = blocks.findIndex((b) => b.id === active.id);
    const to = blocks.findIndex((b) => b.id === over.id);
    setBlocks(arrayMove(blocks, from, to));
    setDirty(true);
  };

  const updateBlock = (id: string, patch: Partial<Block>) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    setDirty(true);
  };

  if (isLoading || !meta)
    return <div className="max-w-3xl space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;

  return (
    <div className="flex max-w-3xl flex-col gap-4 pb-20">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={meta.title}
          onChange={(e) => { setMeta({ ...meta, title: e.target.value }); setDirty(true); }}
          className="h-10 max-w-md text-lg font-semibold"
        />
        <StatusBadge value={lesson!.status} />
        <div className="ml-auto flex items-center gap-2">
          {lesson!.status === "draft" ? (
            <Button variant="outline" size="sm" onClick={() => setStatus.mutate("published")}>Publish</Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setStatus.mutate("draft")}>Unpublish</Button>
          )}
          <Button size="sm" onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
            {save.isPending ? "Saving…" : dirty ? "Save" : "Saved"}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <Label className="shrink-0">Duration (min)</Label>
        <Input
          type="number" min={0} className="w-24"
          value={meta.durationMin}
          onChange={(e) => { setMeta({ ...meta, durationMin: Number(e.target.value) }); setDirty(true); }}
        />
        <span className="text-muted-foreground capitalize">Type: {lesson!.type}</span>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {blocks.map((b) => (
              <SortableBlock key={b.id} block={b} onChange={updateBlock} onDelete={() => { setBlocks(blocks.filter((x) => x.id !== b.id)); setDirty(true); }} />
            ))}
            {blocks.length === 0 && (
              <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                Empty chapter — add a content block below.
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex flex-wrap gap-1.5 rounded-lg border bg-muted/30 p-2">
        <span className="mr-1 self-center text-xs text-muted-foreground">Add block:</span>
        {BLOCK_TYPES.map((t) => (
          <Button
            key={t.type}
            variant="outline"
            size="xs"
            onClick={() => { setBlocks([...blocks, { id: nextId(), type: t.type }]); setDirty(true); }}
          >
            {t.icon} {t.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function SortableBlock({
  block, onChange, onDelete,
}: {
  block: Block;
  onChange: (id: string, patch: Partial<Block>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const meta = BLOCK_TYPES.find((t) => t.type === block.type);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("rounded-lg border bg-card", isDragging && "opacity-50")}
    >
      <div className="flex items-center gap-2 border-b px-2 py-1.5">
        <button {...attributes} {...listeners} className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Drag block">
          <GripVerticalIcon className="size-4" />
        </button>
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {meta?.icon} {meta?.label} block
        </span>
        <div className="ml-auto">
          <Button variant="ghost" size="icon-xs" onClick={onDelete} aria-label="Delete block">
            <Trash2Icon className="text-destructive" />
          </Button>
        </div>
      </div>
      <div className="p-3">
        <BlockBody block={block} onChange={onChange} />
      </div>
    </div>
  );
}

function BlockBody({ block, onChange }: { block: Block; onChange: (id: string, p: Partial<Block>) => void }) {
  switch (block.type) {
    case "text":
      return (
        <Textarea
          rows={4} placeholder="Write content…"
          value={block.text ?? ""}
          onChange={(e) => onChange(block.id, { text: e.target.value })}
        />
      );
    case "video":
    case "pdf":
    case "image":
    case "resource":
      return (
        <Input
          placeholder={`${block.type === "video" ? "Video" : block.type === "pdf" ? "PDF" : block.type === "image" ? "Image" : "Resource"} URL`}
          value={block.url ?? ""}
          onChange={(e) => onChange(block.id, { url: e.target.value })}
        />
      );
    case "link":
      return (
        <div className="flex flex-col gap-2">
          <Input placeholder="https://…" value={block.url ?? ""} onChange={(e) => onChange(block.id, { url: e.target.value })} />
          <Input placeholder="Link label" value={block.text ?? ""} onChange={(e) => onChange(block.id, { text: e.target.value })} />
        </div>
      );
    case "code":
      return (
        <div className="flex flex-col gap-2">
          <Select value={block.language ?? "typescript"} onValueChange={(v) => onChange(block.id, { language: String(v) })}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["typescript", "javascript", "python", "sql", "bash", "go", "rust"].map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            rows={5} placeholder="// code" className="font-mono text-xs"
            value={block.text ?? ""}
            onChange={(e) => onChange(block.id, { text: e.target.value })}
          />
        </div>
      );
    case "quiz":
      return (
        <AsyncCombobox
          resource="assessments"
          value={block.refId ? { id: block.refId, label: block.text ?? `Assessment #${block.refId}` } : null}
          onChange={(v) => { const o = v as OptionItem | null; onChange(block.id, { refId: o?.id, text: o?.label }); }}
          placeholder="Link a quiz/assessment…"
        />
      );
    case "lab":
      return (
        <AsyncCombobox
          resource="labs"
          value={block.refId ? { id: block.refId, label: block.text ?? `Lab #${block.refId}` } : null}
          onChange={(v) => { const o = v as OptionItem | null; onChange(block.id, { refId: o?.id, text: o?.label }); }}
          placeholder="Link a lab…"
        />
      );
    default:
      return null;
  }
}
