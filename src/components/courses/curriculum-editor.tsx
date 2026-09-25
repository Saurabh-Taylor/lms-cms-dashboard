"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext, DragOverlay, PointerSensor, closestCenter,
  useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import {
  CheckIcon, ChevronRightIcon, CopyIcon, GripVerticalIcon,
  PencilIcon, PlusIcon, Trash2Icon, FileTextIcon, VideoIcon, LinkIcon,
  CodeIcon, ClipboardListIcon, FlaskConicalIcon, FileIcon, FolderIcon,
} from "lucide-react";
import { api } from "@/lib/api-client";
import type { CourseRow, LessonNode, SectionNode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { cn } from "@/lib/utils";

const LESSON_ICONS: Record<string, React.ReactNode> = {
  text: <FileTextIcon className="size-3.5" />,
  video: <VideoIcon className="size-3.5" />,
  pdf: <FileIcon className="size-3.5" />,
  link: <LinkIcon className="size-3.5" />,
  code: <CodeIcon className="size-3.5" />,
  quiz: <ClipboardListIcon className="size-3.5" />,
  lab: <FlaskConicalIcon className="size-3.5" />,
  assignment: <ClipboardListIcon className="size-3.5" />,
};

const LESSON_TYPES = ["text", "video", "pdf", "link", "code", "quiz", "lab", "assignment"];

interface Curriculum { course: CourseRow; sections: SectionNode[] }

const secId = (id: number) => `sec-${id}`;
const lesId = (id: number) => `les-${id}`;

export function CurriculumEditor({ courseId }: { courseId: number }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [tree, setTree] = React.useState<SectionNode[] | null>(null);
  const [collapsed, setCollapsed] = React.useState<Record<number, boolean>>({});
  const [activeDrag, setActiveDrag] = React.useState<{ type: string; title: string } | null>(null);
  const [newSection, setNewSection] = React.useState(false);
  const [newLessonFor, setNewLessonFor] = React.useState<number | null>(null);
  const [deleteSection, setDeleteSection] = React.useState<SectionNode | null>(null);
  const [deleteLesson, setDeleteLesson] = React.useState<LessonNode | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["curriculum", courseId],
    queryFn: () => api<Curriculum>(`/api/admin/courses/${courseId}/curriculum`),
  });

  if (data && tree === null) setTree(data.sections);

  const persist = useMutation({
    mutationFn: (sections: SectionNode[]) =>
      api(`/api/admin/courses/${courseId}/curriculum`, {
        method: "PUT",
        body: JSON.stringify({
          sections: sections.map((s, i) => ({
            id: s.id, position: i,
            lessons: s.lessons.map((l, j) => ({ id: l.id, position: j })),
          })),
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["curriculum", courseId] }),
    onError: (e) => toast.error(`Failed to save order: ${e.message}`),
  });

  const sectionMut = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) =>
      api(`/api/admin/sections/${id}`, { method: "PATCH", body: JSON.stringify({ title }) }),
    onSuccess: () => toast.success("Section renamed"),
    onError: (e) => toast.error(e.message),
  });

  const refresh = () => {
    setTree(null);
    qc.invalidateQueries({ queryKey: ["curriculum", courseId] });
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragStart = (e: DragStartEvent) => {
    const d = e.active.data.current as { kind: string; title: string } | undefined;
    if (d) setActiveDrag({ type: d.kind, title: d.title });
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = e;
    if (!over || !tree || active.id === over.id) return;

    const a = active.data.current as { kind: "section" | "lesson"; id: number; sectionId?: number };
    const o = over.data.current as { kind: "section" | "lesson"; id: number; sectionId?: number };
    if (!a || !o) return;

    let next = tree.map((s) => ({ ...s, lessons: [...s.lessons] }));

    if (a.kind === "section" && o.kind === "section") {
      const from = next.findIndex((s) => s.id === a.id);
      const to = next.findIndex((s) => s.id === o.id);
      next = arrayMove(next, from, to);
    } else if (a.kind === "lesson") {
      const fromSec = next.find((s) => s.id === a.sectionId);
      const toSec = o.kind === "section" ? next.find((s) => s.id === o.id) : next.find((s) => s.id === o.sectionId);
      if (!fromSec || !toSec) return;
      const fromIdx = fromSec.lessons.findIndex((l) => l.id === a.id);
      const [moved] = fromSec.lessons.splice(fromIdx, 1);
      moved.sectionId = toSec.id;
      const toIdx = o.kind === "lesson" ? toSec.lessons.findIndex((l) => l.id === o.id) : toSec.lessons.length;
      toSec.lessons.splice(Math.max(0, toIdx), 0, moved);
    } else return;

    setTree(next);
    persist.mutate(next);
  };

  const moveLesson = (lesson: LessonNode, toSectionId: number) => {
    if (!tree) return;
    const next = tree.map((s) => ({ ...s, lessons: [...s.lessons] }));
    const fromSec = next.find((s) => s.lessons.some((l) => l.id === lesson.id));
    const toSec = next.find((s) => s.id === toSectionId);
    if (!fromSec || !toSec || fromSec.id === toSec.id) return;
    const idx = fromSec.lessons.findIndex((l) => l.id === lesson.id);
    const [m] = fromSec.lessons.splice(idx, 1);
    m.sectionId = toSec.id;
    toSec.lessons.push(m);
    setTree(next);
    persist.mutate(next);
    toast.success(`Moved to “${toSec.title}”`);
  };

  if (isLoading || tree === null)
    return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  return (
    <div className="flex flex-col gap-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <SortableContext items={tree.map((s) => secId(s.id))} strategy={verticalListSortingStrategy}>
          {tree.map((sec, si) => (
            <SortableSection
              key={sec.id}
              sec={sec}
              index={si}
              collapsed={!!collapsed[sec.id]}
              onToggle={() => setCollapsed((c) => ({ ...c, [sec.id]: !c[sec.id] }))}
              onRename={(t) => {
                setTree(tree.map((s) => (s.id === sec.id ? { ...s, title: t } : s)));
                sectionMut.mutate({ id: sec.id, title: t });
              }}
              onAddLesson={() => setNewLessonFor(sec.id)}
              onDelete={() => setDeleteSection(sec)}
              onOpenLesson={(l) => router.push(`/admin/courses/${courseId}/lessons/${l.id}` as never)}
              onDeleteLesson={setDeleteLesson}
              onMoveLesson={moveLesson}
              allSections={tree}
              onLessonDuplicated={refresh}
            />
          ))}
        </SortableContext>
        <DragOverlay>
          {activeDrag && (
            <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm shadow-lg">
              <GripVerticalIcon className="size-4 text-muted-foreground" />
              {activeDrag.title}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {newSection ? (
        <InlineCreate
          placeholder="Section title"
          onCancel={() => setNewSection(false)}
          onSubmit={async (title) => {
            await api(`/api/admin/courses/${courseId}/sections`, { method: "POST", body: JSON.stringify({ title }) });
            toast.success("Section added");
            setNewSection(false);
            refresh();
          }}
        />
      ) : (
        <Button variant="outline" className="w-full border-dashed" onClick={() => setNewSection(true)}>
          <PlusIcon /> Add section
        </Button>
      )}

      <NewLessonDialog
        key={newLessonFor}
        sectionId={newLessonFor}
        onClose={() => setNewLessonFor(null)}
        onCreated={() => { setNewLessonFor(null); refresh(); }}
      />
      <ConfirmDialog
        open={!!deleteSection}
        onOpenChange={(v) => !v && setDeleteSection(null)}
        title={`Delete section “${deleteSection?.title}”?`}
        description={`This removes the section and its ${deleteSection?.lessons.length ?? 0} chapters.`}
        confirmLabel="Delete section"
        destructive
        onConfirm={async () => {
          if (!deleteSection) return;
          await api(`/api/admin/sections/${deleteSection.id}`, { method: "DELETE" });
          toast.success("Section deleted");
          setDeleteSection(null);
          refresh();
        }}
      />
      <ConfirmDialog
        open={!!deleteLesson}
        onOpenChange={(v) => !v && setDeleteLesson(null)}
        title={`Delete “${deleteLesson?.title}”?`}
        description="This chapter and its content will be permanently removed."
        confirmLabel="Delete chapter"
        destructive
        onConfirm={async () => {
          if (!deleteLesson) return;
          await api(`/api/admin/lessons/${deleteLesson.id}`, { method: "DELETE" });
          toast.success("Chapter deleted");
          setDeleteLesson(null);
          refresh();
        }}
      />
    </div>
  );
}

function SortableSection(props: {
  sec: SectionNode;
  index: number;
  collapsed: boolean;
  onToggle: () => void;
  onRename: (t: string) => void;
  onAddLesson: () => void;
  onDelete: () => void;
  onOpenLesson: (l: LessonNode) => void;
  onDeleteLesson: (l: LessonNode) => void;
  onMoveLesson: (l: LessonNode, toSectionId: number) => void;
  allSections: SectionNode[];
  onLessonDuplicated: () => void;
}) {
  const { sec, collapsed, onToggle, onRename, onAddLesson, onDelete } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: secId(sec.id),
    data: { kind: "section", id: sec.id, title: sec.title },
  });
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(sec.title);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("rounded-lg border bg-card", isDragging && "opacity-50")}
    >
      <div className="flex items-center gap-1 border-b px-2 py-2">
        <button {...attributes} {...listeners} className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Drag section">
          <GripVerticalIcon className="size-4" />
        </button>
        <button onClick={onToggle} className="rounded p-1 text-muted-foreground transition-colors duration-(--duration-fast) hover:bg-muted" aria-label="Toggle section">
          <ChevronRightIcon className={cn("size-4 transition-transform duration-(--duration-fast)", !collapsed && "rotate-90")} />
        </button>
        {editing ? (
          <form
            className="flex flex-1 items-center gap-1"
            onSubmit={(e) => { e.preventDefault(); if (title.trim()) { onRename(title.trim()); setEditing(false); } }}
          >
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-7" autoFocus />
            <Button size="icon-xs" type="submit"><CheckIcon /></Button>
          </form>
        ) : (
          <span className="flex-1 truncate px-1 text-sm font-medium">
            {sec.title}
            <span className="ml-2 text-xs font-normal text-muted-foreground">{sec.lessons.length} chapters</span>
          </span>
        )}
        <Button variant="ghost" size="icon-xs" onClick={() => setEditing(true)} aria-label="Rename">
          <PencilIcon />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" />}>
            <EllipsisIconSmall />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onAddLesson}><PlusIcon /> Add chapter</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditing(true)}><PencilIcon /> Rename</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}><Trash2Icon /> Delete section</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!collapsed && (
        <SortableContext items={sec.lessons.map((l) => lesId(l.id))} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col p-1.5">
            {sec.lessons.map((l) => (
              <SortableLesson
                key={l.id}
                lesson={l}
                sectionId={sec.id}
                allSections={props.allSections}
                onOpen={() => props.onOpenLesson(l)}
                onDelete={() => props.onDeleteLesson(l)}
                onMove={props.onMoveLesson}
                onDuplicated={props.onLessonDuplicated}
              />
            ))}
            {sec.lessons.length === 0 && (
              <li className="px-3 py-3 text-center text-xs text-muted-foreground">
                No chapters — drag one here or{" "}
                <button className="underline" onClick={onAddLesson}>add a chapter</button>
              </li>
            )}
          </ul>
        </SortableContext>
      )}
    </div>
  );
}

const EllipsisIconSmall = () => (
  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" />
  </svg>
);

function SortableLesson({
  lesson, sectionId, allSections, onOpen, onDelete, onMove, onDuplicated,
}: {
  lesson: LessonNode;
  sectionId: number;
  allSections: SectionNode[];
  onOpen: () => void;
  onDelete: () => void;
  onMove: (l: LessonNode, toSectionId: number) => void;
  onDuplicated: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesId(lesson.id),
    data: { kind: "lesson", id: lesson.id, sectionId, title: lesson.title },
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-sm hover:bg-muted/60",
        isDragging && "opacity-40"
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab touch-none rounded p-1 text-muted-foreground/60 hover:bg-muted hover:text-muted-foreground" aria-label="Drag chapter">
        <GripVerticalIcon className="size-3.5" />
      </button>
      <span className="text-muted-foreground">{LESSON_ICONS[lesson.type] ?? <FileTextIcon className="size-3.5" />}</span>
      <button className="min-w-0 flex-1 truncate text-left hover:underline" onClick={onOpen}>
        {lesson.title}
      </button>
      {lesson.status === "draft" && <Badge variant="outline" className="text-[10px]">draft</Badge>}
      <span className="text-xs text-muted-foreground tabular-nums">{lesson.durationMin}m</span>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" className="opacity-0 group-hover:opacity-100" />}>
          <EllipsisIconSmall />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onOpen}><PencilIcon /> Edit</DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              await api(`/api/admin/lessons/${lesson.id}/duplicate`, { method: "POST" });
              toast.success("Chapter duplicated");
              onDuplicated();
            }}
          >
            <CopyIcon /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger><FolderIcon /> Move to…</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuGroup>
                <DropdownMenuLabel>Sections</DropdownMenuLabel>
                {allSections.filter((s) => s.id !== sectionId).map((s) => (
                  <DropdownMenuItem key={s.id} onClick={() => onMove(lesson, s.id)}>
                    {s.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onDelete}><Trash2Icon /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

function InlineCreate({
  placeholder, onSubmit, onCancel,
}: {
  placeholder: string;
  onSubmit: (v: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [v, setV] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  return (
    <form
      className="flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!v.trim()) return;
        setBusy(true);
        await onSubmit(v.trim());
        setBusy(false);
      }}
    >
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} autoFocus />
      <Button type="submit" disabled={busy || !v.trim()}>{busy ? "Adding…" : "Add"}</Button>
      <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
    </form>
  );
}

function NewLessonDialog({
  sectionId, onClose, onCreated,
}: {
  sectionId: number | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState("text");
  const [busy, setBusy] = React.useState(false);

  if (sectionId === null) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-sm rounded-lg border bg-card p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 font-medium">New chapter</h3>
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim()) return;
            setBusy(true);
            await api(`/api/admin/sections/${sectionId}/lessons`, {
              method: "POST", body: JSON.stringify({ title: title.trim(), type }),
            });
            setBusy(false);
            toast.success("Chapter created");
            onCreated();
          }}
        >
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chapter title" autoFocus />
          <Select value={type} onValueChange={(v) => setType(String(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LESSON_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy || !title.trim()}>{busy ? "Creating…" : "Create"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
