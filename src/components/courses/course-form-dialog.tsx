"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import type { OptionItem } from "@/lib/types";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AsyncCombobox } from "@/components/async-combobox";

export function CourseFormDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (id: number) => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [difficulty, setDifficulty] = React.useState("beginner");
  const [categoryId, setCategoryId] = React.useState<number | null>(null);
  const [instructor, setInstructor] = React.useState<OptionItem | null>(null);
  const [categories, setCategories] = React.useState<OptionItem[]>([]);

  React.useEffect(() => {
    if (open) api<OptionItem[]>("/api/admin/options?resource=categories").then(setCategories).catch(() => {});
  }, [open]);

  const create = useMutation({
    mutationFn: () =>
      api<{ id: number }>("/api/admin/courses", {
        method: "POST",
        body: JSON.stringify({
          title, slug: slug || undefined, description: description || undefined,
          difficulty, categoryId, instructorId: instructor?.id ?? undefined,
        }),
      }),
    onSuccess: (r) => {
      toast.success("Course created");
      qc.invalidateQueries({ queryKey: ["/api/admin/courses"] });
      onOpenChange(false);
      setTitle(""); setSlug(""); setDescription("");
      onCreated?.(r.id);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create course</DialogTitle>
          <DialogDescription>Basic details — you can add sections and chapters after creating.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-title">Title</Label>
            <Input id="cf-title" value={title} onChange={(e) => {
              setTitle(e.target.value);
              if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
            }} required autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-slug">Slug</Label>
            <Input id="cf-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generated" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-desc">Description</Label>
            <Textarea id="cf-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select value={categoryId ? String(categoryId) : ""} onValueChange={(v) => setCategoryId(Number(v))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(String(v))}>
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!title || create.isPending}>
              {create.isPending ? "Creating…" : "Create course"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
