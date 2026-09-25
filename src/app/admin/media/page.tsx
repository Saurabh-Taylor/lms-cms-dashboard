"use client";

import { Suspense } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/page-header";
import { ModuleTable } from "@/components/data-table/module-table";
import { fmtBytes, fmtRelative } from "@/lib/format";
import { FileTextIcon, FileArchiveIcon, VideoIcon, ImageIcon } from "lucide-react";
import type { MediaRow } from "@/lib/types";

const TYPE_ICONS = {
  image: <ImageIcon className="size-4 text-muted-foreground" />,
  video: <VideoIcon className="size-4 text-muted-foreground" />,
  document: <FileTextIcon className="size-4 text-muted-foreground" />,
  archive: <FileArchiveIcon className="size-4 text-muted-foreground" />,
};

const cols: ColumnDef<MediaRow, unknown>[] = [
  { id: "name", accessorKey: "name", header: "File", meta: { sortKey: "name" }, cell: ({ row }) => (
    <div className="flex items-center gap-2.5 min-w-0">
      {TYPE_ICONS[row.original.type]}
      <span className="truncate font-medium">{row.original.name}</span>
    </div>
  ) },
  { id: "type", accessorKey: "type", header: "Type", cell: ({ getValue }) => <span className="text-sm capitalize">{getValue() as string}</span> },
  { id: "sizeKb", accessorKey: "sizeKb", header: "Size", meta: { sortKey: "sizeKb", className: "text-right", headerClassName: "text-right" }, cell: ({ getValue }) => <span className="tabular-nums text-sm">{fmtBytes(getValue() as number)}</span> },
  { id: "uploadedByName", accessorKey: "uploadedByName", header: "Uploaded by", cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) ?? "—"}</span> },
  { id: "createdAt", accessorKey: "createdAt", header: "Uploaded", meta: { sortKey: "createdAt" }, cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{fmtRelative(getValue() as number)}</span> },
];

export default function MediaPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Media Library" description="Uploaded assets used across courses" />
      <Suspense>
        <ModuleTable<MediaRow>
          endpoint="/api/admin/media"
          columns={cols}
          searchPlaceholder="Search files…"
          filters={[{ param: "type", placeholder: "Type", allLabel: "All types", options: [
            { value: "image", label: "Image" }, { value: "video", label: "Video" },
            { value: "document", label: "Document" }, { value: "archive", label: "Archive" },
          ], className: "w-36" }]}
          emptyTitle="Media library is empty"
          emptyDescription="Uploaded course assets will appear here."
        />
      </Suspense>
    </div>
  );
}
