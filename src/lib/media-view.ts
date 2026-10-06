/**
 * Media-view resolver — owns the source×status → representation policy shared
 * by the learner MediaBlock and the admin PreviewDialog. Ordering matters:
 * embed beats url; a deleted asset beats a stale url that may still sit on the
 * block; mime picks the representation.
 */

export interface MediaViewInput {
  /** vimeo embed — always wins */
  embedUrl?: string | null;
  /** presigned r2 / external link */
  url?: string | null;
  mime?: string | null;
  /** linked asset gone (block: mediaStatus null) or row not previewable */
  unavailable?: boolean;
  /** uploading/processing — pending state */
  processing?: boolean;
  /** embed aspect e.g. "16 / 9" — only meaningful on the embed arm */
  aspect?: string;
}

export type MediaView =
  | { kind: "embed"; url: string; aspect?: string }
  | { kind: "image"; url: string }
  | { kind: "pdf"; url: string }
  | { kind: "download"; url: string }
  | { kind: "processing" }
  | { kind: "unavailable" }
  | { kind: "none" };

export function resolveMediaView(input: MediaViewInput): MediaView {
  if (input.embedUrl) return { kind: "embed", url: input.embedUrl, aspect: input.aspect };
  if (input.unavailable) return { kind: "unavailable" };
  if (input.url) {
    if (input.mime?.startsWith("image/")) return { kind: "image", url: input.url };
    if (input.mime === "application/pdf") return { kind: "pdf", url: input.url };
    return { kind: "download", url: input.url };
  }
  if (input.processing) return { kind: "processing" };
  return { kind: "none" };
}

/** The two media statuses that mean "not ready yet". */
export function isPendingStatus(status: string | null | undefined): boolean {
  return status === "uploading" || status === "processing";
}
