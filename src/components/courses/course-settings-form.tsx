"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";
import type { CourseRow, OptionItem } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AsyncCombobox } from "@/components/async-combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { XIcon } from "lucide-react";

export function CourseSettingsForm({ courseId }: { courseId: number }) {
  const router = useRouter();
  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => api<CourseRow>(`/api/admin/courses/${courseId}`),
  });

  const [form, setForm] = React.useState<null | {
    title: string; slug: string; description: string;
    categoryId: number | null; difficulty: string; visibility: string;
    estimatedMinutes: number; tags: string[]; certificateEnabled: boolean;
  }>(null);
  const [instructor, setInstructor] = React.useState<OptionItem | null>(null);
  const [categories, setCategories] = React.useState<OptionItem[]>([]);
  const [tagInput, setTagInput] = React.useState("");
  const qc = useQueryClient();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [thumbProgress, setThumbProgress] = React.useState<number | null>(null);

  if (course && form === null) {
    setForm({
      title: course.title, slug: course.slug, description: course.description ?? "",
      categoryId: course.categoryId, difficulty: course.difficulty,
      visibility: course.visibility, estimatedMinutes: course.estimatedMinutes,
      tags: course.tags ?? [], certificateEnabled: course.certificateEnabled,
    });
    if (course.instructorId)
      setInstructor({ id: course.instructorId, label: course.instructorName ?? "" });
  }

  React.useEffect(() => {
    api<OptionItem[]>("/api/admin/options?resource=categories").then(setCategories).catch(() => {});
  }, []);

  const save = useApiMutation({
    mutationFn: () =>
      api(`/api/admin/courses/${courseId}`, {
        method: "PATCH",
        body: JSON.stringify({ ...form, instructorId: instructor?.id ?? null }),
      }),
    invalidate: [["course", courseId], ["/api/admin/courses"]],
    successToast: "Settings saved",
    onSuccess: () => router.refresh(),
  });

  const removeThumb = useApiMutation({
    mutationFn: () =>
      api(`/api/admin/courses/${courseId}/thumbnail`, { method: "DELETE" }),
    invalidate: [["course", courseId], ["/api/admin/courses"]],
    successToast: "Thumbnail removed",
  });

  /** Presign → browser PUTs straight to R2 → complete verifies + swaps the key. */
  async function uploadThumbnail(file: File) {
    setThumbProgress(0);
    try {
      const ticket = await api<{ uploadUrl: string; key: string; contentType: string }>(
        `/api/admin/courses/${courseId}/thumbnail-upload`,
        { method: "POST", body: JSON.stringify({ name: file.name, sizeBytes: file.size }) },
      );
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", ticket.uploadUrl);
        xhr.setRequestHeader("Content-Type", ticket.contentType);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            setThumbProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () =>
          xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(file);
      });
      await api(`/api/admin/courses/${courseId}/thumbnail/complete`, {
        method: "POST",
        body: JSON.stringify({ key: ticket.key }),
      });
      toast.success("Thumbnail updated");
      qc.invalidateQueries({ queryKey: ["course", courseId] });
      qc.invalidateQueries({ queryKey: ["/api/admin/courses"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setThumbProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (isLoading || !form)
    return <div className="max-w-2xl space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full" />)}</div>;

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm({ ...form, [k]: v });

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">General</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Slug</Label>
            <Input value={form.slug} onChange={(e) => set("slug", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select
                value={form.categoryId ? String(form.categoryId) : ""}
                onValueChange={(v) => set("categoryId", Number(v))}
                items={Object.fromEntries(categories.map((c) => [String(c.id), c.label]))}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Difficulty</Label>
              <Select value={form.difficulty} onValueChange={(v) => set("difficulty", String(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Instructor</Label>
            <AsyncCombobox resource="instructors" value={instructor} onChange={(v) => setInstructor(v as OptionItem | null)} placeholder="Assign instructor…" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Course thumbnail</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            {course.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- presigned URL, not optimizable
              <img
                src={course.thumbnailUrl}
                alt="Course thumbnail"
                className="h-20 w-36 rounded-md border object-cover"
              />
            ) : (
              <div
                className="h-20 w-36 rounded-md border"
                style={{ background: course.thumbnailColor }}
                aria-hidden
              />
            )}
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadThumbnail(f);
                }}
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  disabled={thumbProgress !== null}
                >
                  {course.thumbnailUrl ? "Replace image" : "Upload image"}
                </Button>
                {course.thumbnailUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeThumb.mutate()}
                    disabled={removeThumb.isPending}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, JPG or WebP up to 10 MB — 1200×675 or larger recommended.
              </p>
            </div>
          </div>
          {thumbProgress !== null && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${thumbProgress}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Enrollment & access</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Visibility</Label>
              <Select value={form.visibility} onValueChange={(v) => set("visibility", String(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public — anyone can enroll</SelectItem>
                  <SelectItem value="unlisted">Unlisted — link only</SelectItem>
                  <SelectItem value="private">Private — assignment only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Estimated duration (min)</Label>
              <Input
                type="number" min={0}
                value={form.estimatedMinutes}
                onChange={(e) => set("estimatedMinutes", Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Certificate on completion</p>
              <p className="text-(length:--fs-meta) leading-4 text-muted-foreground">Issue a certificate when a learner finishes this course</p>
            </div>
            <Switch checked={form.certificateEnabled} onCheckedChange={(v) => set("certificateEnabled", !!v)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Tags</Label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5">
              {form.tags.map((t) => (
                <Badge key={t} variant="secondary" className="gap-1">
                  {t}
                  <button onClick={() => set("tags", form.tags.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
                    <XIcon className="size-3" />
                  </button>
                </Badge>
              ))}
              <input
                className="min-w-24 flex-1 bg-transparent text-sm outline-none"
                placeholder="Add tag…"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && tagInput.trim()) {
                    e.preventDefault();
                    if (!form.tags.includes(tagInput.trim()))
                      set("tags", [...form.tags, tagInput.trim()]);
                    setTagInput("");
                  }
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => router.refresh()}>Discard</Button>
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
