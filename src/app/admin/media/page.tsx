"use client";

import * as React from "react";
import { Suspense } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload } from "tus-js-client";
import { PageHeader } from "@/components/shared/page-header";
import { ModuleTable } from "@/components/data-table/module-table";
import { RowActions } from "@/components/data-table/row-actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { fmtBytes, fmtRelative } from "@/lib/format";
import { MEDIA_VIDEO_EXTS, PERM } from "@learnhub/contracts";
import {
  FileTextIcon, FileArchiveIcon, VideoIcon, ImageIcon, LinkIcon, TriangleAlertIcon, UploadIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { MediaRow } from "@/lib/types";

const TYPE_ICONS = {
  image: <ImageIcon className="size-4 text-muted-foreground" />,
  video: <VideoIcon className="size-4 text-muted-foreground" />,
  document: <FileTextIcon className="size-4 text-muted-foreground" />,
  archive: <FileArchiveIcon className="size-4 text-muted-foreground" />,
};

/** Mirrors the backend's MEDIA_MAX_UPLOAD_BYTES default (5 GiB). */
const MAX_BYTES = 5 * 1024 ** 3;
const ACCEPT = MEDIA_VIDEO_EXTS.map((e) => `.${e}`).join(",");

function buildCols(canDelete: boolean): ColumnDef<MediaRow, unknown>[] {
  return [
    { id: "name", accessorKey: "name", header: "File", meta: { sortKey: "name" }, cell: ({ row }) => (
      <div className="flex items-center gap-2.5 min-w-0">
        {row.original.source === "external"
          ? <LinkIcon className="size-4 text-muted-foreground" />
          : TYPE_ICONS[row.original.type]}
        <span className="truncate font-medium">{row.original.name}</span>
      </div>
    ) },
    { id: "type", accessorKey: "type", header: "Type", cell: ({ getValue }) => <span className="text-sm capitalize">{getValue() as string}</span> },
    { id: "status", accessorKey: "status", header: "Status", meta: { sortKey: "status" }, cell: ({ getValue }) => <StatusBadge value={getValue() as string} /> },
    { id: "sizeKb", accessorKey: "sizeKb", header: "Size", meta: { sortKey: "sizeKb", className: "text-right", headerClassName: "text-right" }, cell: ({ getValue }) => <span className="tabular-nums text-sm">{fmtBytes(getValue() as number)}</span> },
    { id: "uploadedByName", accessorKey: "uploadedByName", header: "Uploaded by", cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) ?? "—"}</span> },
    { id: "createdAt", accessorKey: "createdAt", header: "Uploaded", meta: { sortKey: "createdAt" }, cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{fmtRelative(getValue() as number)}</span> },
    { id: "actions", enableSorting: false, meta: { className: "w-10" }, cell: ({ row }) => <MediaRowActions row={row.original} canDelete={canDelete} /> },
  ];
}

export default function MediaPage() {
  // Permissions drive which actions render — the proxy enforces them regardless.
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ permissions: string[] }>("/api/admin/me"),
    staleTime: 60_000,
  });
  const perms = new Set(me.data?.permissions ?? []);
  const canUpload = perms.has(PERM.mediaUpload);
  const canDelete = perms.has(PERM.mediaDelete);
  const columns = React.useMemo(() => buildCols(canDelete), [canDelete]);

  const quota = useQuery({
    queryKey: ["media-quota"],
    queryFn: () =>
      api<{ configured: boolean; percent?: number; warning?: boolean }>("/api/admin/media/quota"),
    staleTime: 60_000,
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Media Library"
        description="Video assets hosted on Vimeo"
        actions={canUpload ? <MediaActions /> : undefined}
      />
      {quota.data?.configured && quota.data.warning && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <TriangleAlertIcon className="size-4" />
          Vimeo storage at {quota.data.percent}% — free up space or upgrade plan.
        </div>
      )}
      <Suspense>
        <ModuleTable<MediaRow>
          endpoint="/api/admin/media"
          columns={columns}
          searchPlaceholder="Search files…"
          filters={[{ param: "type", placeholder: "Type", allLabel: "All types", options: [
            { value: "image", label: "Image" }, { value: "video", label: "Video" },
            { value: "document", label: "Document" }, { value: "archive", label: "Archive" },
          ], className: "w-36" }]}
          emptyTitle="Media library is empty"
          emptyDescription="Upload a video to get started."
        />
      </Suspense>
    </div>
  );
}

function MediaActions() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><UploadIcon className="group-hover/button:translate-x-0.5" /> Upload video</Button>
      {open && <UploadDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function MediaRowActions({ row, canDelete }: { row: MediaRow; canDelete: boolean }) {
  const [mode, setMode] = React.useState<"preview" | "delete" | null>(null);
  const del = useApiMutation({
    mutationFn: () => api(`/api/admin/media/${row.id}`, { method: "DELETE" }),
    invalidate: [["/api/admin/media"], ["media-quota"]],
    successToast: "Video deleted",
    onSuccess: () => setMode(null),
  });
  const playable = row.source === "vimeo" && row.status === "ready" && !!row.storageKey;
  return (
    <>
      <RowActions items={[
        { label: "Preview", onClick: () => setMode("preview"), disabled: !playable },
        ...(canDelete
          ? [{ label: "Delete", destructive: true, separatorAbove: true, onClick: () => setMode("delete") }]
          : []),
      ]} />
      {mode === "preview" && playable && <PreviewDialog row={row} onClose={() => setMode(null)} />}
      {mode === "delete" && (
        <ConfirmDialog
          open
          onOpenChange={() => setMode(null)}
          title={`Delete "${row.name}"?`}
          description="The video is deleted from Vimeo first, then the library row. This cannot be undone."
          confirmLabel="Delete"
          destructive
          loading={del.isPending}
          onConfirm={() => del.mutate()}
        />
      )}
    </>
  );
}

function PreviewDialog({ row, onClose }: { row: MediaRow; onClose: () => void }) {
  const videoId = row.storageKey?.split("/").pop();
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>{row.name}</DialogTitle></DialogHeader>
        <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
          <iframe
            src={`https://player.vimeo.com/video/${videoId}`}
            className="h-full w-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={row.name}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Pick a video → mint ticket → tus direct-to-Vimeo → complete → row appears. */
function UploadDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [file, setFile] = React.useState<File | null>(null);
  const [pct, setPct] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const tusRef = React.useRef<Upload | null>(null);

  const error = file
    ? !MEDIA_VIDEO_EXTS.includes(file.name.split(".").pop()?.toLowerCase() as never)
      ? "Unsupported file type — video files only"
      : file.size > MAX_BYTES
        ? `File exceeds the ${(MAX_BYTES / 1024 ** 3).toFixed(0)} GB limit`
        : null
    : null;

  async function start() {
    if (!file || error) return;
    setBusy(true);
    try {
      // 1) backend mints the ticket (+ media row in "uploading")
      const { asset, uploadLink } = await api<{
        asset: MediaRow;
        uploadLink: string;
      }>("/api/admin/media/uploads", {
        method: "POST",
        body: JSON.stringify({ name: file.name, sizeBytes: file.size }),
      });

      // 2) browser PATCHes bytes straight to Vimeo — resumable tus protocol
      await new Promise<void>((resolve, reject) => {
        const up = new Upload(file!, {
          uploadUrl: uploadLink,
          onProgress: (sent, total) => setPct(Math.round((sent / total) * 100)),
          onSuccess: () => resolve(),
          onError: (e) => reject(e),
        });
        tusRef.current = up;
        up.start();
      });

      // 3) verify + advance the row's status
      const done = await api<MediaRow>(`/api/admin/media/${asset.id}/complete`, { method: "POST" });
      toast.success(
        done.status === "ready" ? "Video ready" : "Uploaded — Vimeo is transcoding it",
      );
      qc.invalidateQueries({ queryKey: ["/api/admin/media"] });
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  }

  function cancel() {
    tusRef.current?.abort();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v && busy) cancel(); else onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Upload video</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Video file</Label>
            <Input
              type="file"
              accept={ACCEPT}
              disabled={busy}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-(length:--fs-meta) text-muted-foreground">
              {MEDIA_VIDEO_EXTS.slice(0, 6).join(", ")}… · up to {(MAX_BYTES / 1024 ** 3).toFixed(0)} GB
            </p>
            {file && <p className="text-sm">{file.name} — {fmtBytes(Math.ceil(file.size / 1024))}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          {busy && (
            <div className="flex flex-col gap-1">
              <Progress value={pct} />
              <p className="text-(length:--fs-meta) text-muted-foreground">{pct}% — uploading straight to Vimeo</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={cancel}>{busy ? "Cancel upload" : "Cancel"}</Button>
          <Button onClick={start} disabled={!file || !!error || busy}>
            {busy ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
