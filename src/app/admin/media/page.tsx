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
import { resolveMediaView } from "@/lib/media-view";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { usePermissions } from "@/hooks/use-me";
import { fmtBytes, fmtRelative } from "@/lib/format";
import {
  MEDIA_FILE_EXTS,
  MEDIA_OBJECT_MAX_UPLOAD_BYTES,
  MEDIA_VIDEO_EXTS,
  MEDIA_VIDEO_MAX_UPLOAD_BYTES,
  mediaTypeForExt,
} from "@microshala/contracts";
import { PERM } from "@/lib/permissions";
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

// Policy caps come from contracts; the quota endpoint still supplies them so
// future ops overrides surface without a frontend deploy.
const ACCEPT = [...MEDIA_VIDEO_EXTS, ...MEDIA_FILE_EXTS].map((e) => `.${e}`).join(",");

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
  const perms = usePermissions();
  const canUpload = perms.has(PERM.mediaUpload);
  const canDelete = perms.has(PERM.mediaDelete);
  const columns = React.useMemo(() => buildCols(canDelete), [canDelete]);

  const quota = useQuery({
    queryKey: ["media-quota"],
    queryFn: () =>
      api<{
        configured: boolean;
        percent?: number;
        warning?: boolean;
        maxUploadBytes?: number;
        maxObjectUploadBytes?: number;
      }>("/api/admin/media/quota"),
    staleTime: 60_000,
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Media Library"
        description="Video on Vimeo · documents, images &amp; resources on R2"
        actions={
          canUpload ? (
            <MediaActions
              maxBytes={quota.data?.maxUploadBytes ?? MEDIA_VIDEO_MAX_UPLOAD_BYTES}
              maxObjectBytes={quota.data?.maxObjectUploadBytes ?? MEDIA_OBJECT_MAX_UPLOAD_BYTES}
            />
          ) : undefined
        }
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

function MediaActions({ maxBytes, maxObjectBytes }: { maxBytes: number; maxObjectBytes: number }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><UploadIcon className="group-hover/button:translate-x-0.5" /> Upload media</Button>
      {open && <UploadDialog maxBytes={maxBytes} maxObjectBytes={maxObjectBytes} onClose={() => setOpen(false)} />}
    </>
  );
}

function MediaRowActions({ row, canDelete }: { row: MediaRow; canDelete: boolean }) {
  const [mode, setMode] = React.useState<"preview" | "delete" | null>(null);
  const del = useApiMutation({
    mutationFn: () => api(`/api/admin/media/${row.id}`, { method: "DELETE" }),
    invalidate: [["/api/admin/media"], ["media-quota"]],
    successToast: "Media deleted",
    onSuccess: () => setMode(null),
  });
  const previewable =
    row.status === "ready" &&
    ((row.source === "vimeo" && !!row.storageKey) ||
      row.source === "r2" ||
      (row.source === "external" && !!row.url));
  return (
    <>
      <RowActions items={[
        { label: "Preview", onClick: () => setMode("preview"), disabled: !previewable },
        ...(canDelete
          ? [{ label: "Delete", destructive: true, separatorAbove: true, onClick: () => setMode("delete") }]
          : []),
      ]} />
      {mode === "preview" && previewable && <PreviewDialog row={row} onClose={() => setMode(null)} />}
      {mode === "delete" && (
        <ConfirmDialog
          open
          onOpenChange={() => setMode(null)}
          title={`Delete "${row.name}"?`}
          description={
            row.source === "r2"
              ? "The object is deleted from R2 first, then the library row. This cannot be undone."
              : "The video is deleted from Vimeo first, then the library row. This cannot be undone."
          }
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
  // r2/external rows need a fresh signed/exposed URL — minted at open time.
  const url = useQuery({
    queryKey: ["media-url", row.id],
    queryFn: () => api<{ url: string }>(`/api/admin/media/${row.id}/url`),
    enabled: row.source !== "vimeo",
    staleTime: 30_000,
  });
  const isVimeo = row.source === "vimeo";
  // pending/error are fetch-states, not view kinds — the JSX arms run before
  // view is consulted. (vimeo's query stays disabled+pending forever, so the
  // embed resolution can't depend on it.)
  const view = resolveMediaView({
    embedUrl: row.embedUrl,
    url: url.data?.url,
    mime: row.mime,
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>{row.name}</DialogTitle></DialogHeader>
        {!isVimeo && url.isPending ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Preparing preview…</p>
        ) : !isVimeo && url.isError ? (
          <p className="py-8 text-center text-sm text-destructive">Could not load preview.</p>
        ) : view.kind === "embed" ? (
          <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
            <iframe
              src={view.url}
              className="block h-full w-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={row.name}
            />
          </div>
        ) : view.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={view.url} alt={row.name} className="max-h-[70vh] w-full rounded-md object-contain" />
        ) : view.kind === "pdf" ? (
          <iframe src={view.url} className="h-[70vh] w-full rounded-md border" title={row.name} />
        ) : (
          <div className="flex flex-col items-center gap-3 py-8">
            <FileTextIcon className="size-8 text-muted-foreground" />
            <a href={view.kind === "download" ? view.url : "#"} target="_blank" rel="noreferrer" className="text-sm underline">
              Open / download {row.name}
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** XHR PUT to a presigned R2 URL — fetch() has no upload progress events. */
function putWithProgress(
  url: string,
  file: File,
  mime: string,
  onProgress: (pct: number) => void,
  ref: React.MutableRefObject<XMLHttpRequest | null>,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    ref.current = xhr;
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", mime); // must match the signed header
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (HTTP ${xhr.status})`));
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });
}

/**
 * Pick a file → route by extension: video → tus ticket to Vimeo; docs/images/
 * archives → presigned PUT to R2 → complete verifies → row appears.
 */
function UploadDialog({
  maxBytes,
  maxObjectBytes,
  onClose,
}: {
  maxBytes: number;
  maxObjectBytes: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [file, setFile] = React.useState<File | null>(null);
  const [pct, setPct] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const tusRef = React.useRef<Upload | null>(null);
  const xhrRef = React.useRef<XMLHttpRequest | null>(null);

  const ext = file?.name.split(".").pop()?.toLowerCase() ?? "";
  const isVideo = MEDIA_VIDEO_EXTS.includes(ext as never);
  const isObject = !!mediaTypeForExt(ext);
  const cap = isVideo ? maxBytes : maxObjectBytes;
  const error = file
    ? !isVideo && !isObject
      ? "Unsupported file type"
      : file.size > cap
        ? `File exceeds the ${(cap / 1024 ** 2).toFixed(0)} MB limit`
        : null
    : null;

  async function start() {
    if (!file || error) return;
    setBusy(true);
    try {
      if (isVideo) {
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
          const up = new Upload(file, {
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
      } else {
        // 1) mint presigned PUT + media row in "uploading" (mime is bound into
        //    the signature — must be sent verbatim as the PUT Content-Type)
        const { asset, uploadUrl, mime } = await api<{
          asset: MediaRow;
          uploadUrl: string;
          mime: string;
        }>("/api/admin/media/object-uploads", {
          method: "POST",
          body: JSON.stringify({ name: file.name, sizeBytes: file.size }),
        });
        await putWithProgress(uploadUrl, file, mime, setPct, xhrRef);
        // 3) HEAD-verify the object landed → ready
        await api<MediaRow>(`/api/admin/media/${asset.id}/complete`, { method: "POST" });
        toast.success("File ready");
      }
      qc.invalidateQueries({ queryKey: ["/api/admin/media"] });
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  }

  function cancel() {
    tusRef.current?.abort();
    xhrRef.current?.abort();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v && busy) cancel(); else onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Upload media</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>File</Label>
            <Input
              type="file"
              accept={ACCEPT}
              disabled={busy}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-(length:--fs-meta) text-muted-foreground">
              Video → Vimeo · docs/images/archives → R2 · {isVideo ? `up to ${(cap / 1024 ** 3).toFixed(0)} GB` : `files up to ${(maxObjectBytes / 1024 ** 2).toFixed(0)} MB`}
            </p>
            {file && <p className="text-sm">{file.name} — {fmtBytes(Math.ceil(file.size / 1024))}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          {busy && (
            <div className="flex flex-col gap-1">
              <Progress value={pct} />
              <p className="text-(length:--fs-meta) text-muted-foreground">
                {pct}% — uploading straight to {isVideo ? "Vimeo" : "R2"}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button size="sm" type="button" variant="outline" onClick={cancel}>{busy ? "Cancel upload" : "Cancel"}</Button>
          <Button size="sm" onClick={start} disabled={!file || !!error || busy}>
            {busy ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
