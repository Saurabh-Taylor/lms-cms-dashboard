import { toast } from "sonner";

/** Wire shape every bulk endpoint shares: per-target outcome + optional reason. */
export interface BulkResult {
  ok: boolean;
  reason?: string | null;
}

export interface BulkPartition<T extends BulkResult> {
  /** ok, no reason — the op actually did something */
  fresh: T[];
  /** ok + reason — informational ("Already assigned"), not a failure */
  skipped: T[];
  /** !ok — real failures */
  failed: T[];
}

export function partitionBulk<T extends BulkResult>(results: T[]): BulkPartition<T> {
  const fresh: T[] = [],
    skipped: T[] = [],
    failed: T[] = [];
  for (const r of results) (r.ok ? (r.reason ? skipped : fresh) : failed).push(r);
  return { fresh, skipped, failed };
}

export interface BulkToastOpts {
  /** Past-tense verb for the fresh count — "assigned", "suspended". */
  verb: string;
  /** Label for skipped items — "already assigned". Default "skipped". */
  skippedLabel?: string;
  /** Extra detail appended to the success arm (e.g. enrollment count). */
  detail?: string;
  /** Copy for the all-skipped arm. Default "Nothing to do". */
  nothingMessage?: string;
  /** Fallback failure reason. Default "unknown". */
  fallbackReason?: string;
}

/**
 * One summary toast for a bulk outcome: warning with deduped reasons when
 * anything failed, info when everything was skipped, success otherwise.
 * Skipped is reported as a note, never counted as fresh.
 */
export function bulkToast(results: BulkResult[], opts: BulkToastOpts): void {
  const { fresh, skipped, failed } = partitionBulk(results);
  const skippedNote = skipped.length
    ? ` · ${skipped.length} ${opts.skippedLabel ?? "skipped"}`
    : "";
  if (!failed.length) {
    if (!fresh.length) toast.info(opts.nothingMessage ?? "Nothing to do");
    else
      toast.success(
        `${fresh.length} ${opts.verb}${opts.detail ? ` — ${opts.detail}` : ""}${skippedNote}`
      );
    return;
  }
  const reasons = [
    ...new Set(failed.map((f) => f.reason ?? opts.fallbackReason ?? "unknown")),
  ].join("; ");
  const done = fresh.length ? `${fresh.length} ${opts.verb}${skippedNote} · ` : "";
  toast.warning(`${done}${failed.length} failed (${reasons})`);
}

/**
 * Single-target reporting through the same partition: failure → warning with
 * reason, skipped → info with reason, fresh → the caller's success copy.
 * Returns the partition so callers can branch (e.g. close only on success).
 */
export function singleToast<T extends BulkResult>(
  results: T[],
  opts: { success: string; fallbackReason?: string }
): BulkPartition<T> {
  const p = partitionBulk(results);
  if (p.failed.length) toast.warning(p.failed[0].reason ?? opts.fallbackReason ?? "Failed");
  else if (p.skipped.length) toast.info(p.skipped[0].reason ?? "Skipped");
  else toast.success(opts.success);
  return p;
}

/**
 * Retry-merge: `next` results overwrite `prev` entries with the same key;
 * `prev` entries absent from `next` survive untouched. `keyOf` names the
 * identity (e.g. `${userId}:${courseId}`).
 */
export function mergeResults<T extends BulkResult>(
  prev: T[],
  next: T[],
  keyOf: (t: T) => string
): T[] {
  const nextKeys = new Set(next.map(keyOf));
  const byKey = new Map<string, T>();
  for (const p of prev) {
    const k = keyOf(p);
    if (!nextKeys.has(k)) byKey.set(k, p);
  }
  for (const n of next) byKey.set(keyOf(n), n);
  return [...byKey.values()];
}
