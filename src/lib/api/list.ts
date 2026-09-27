import { and, count, like, or, type Column, type SQL, type SQLWrapper } from "drizzle-orm";
import type { SelectedFields, SQLiteTable } from "drizzle-orm/sqlite-core";

import { db } from "@/lib/db/client";
import { likePattern, listOk, listQuery, orderBy, type ListQuery } from "@/lib/api/helpers";

/**
 * The admin list pipeline as a spec: filters, search, select shape, joins,
 * sort whitelist. Callers declare the variable parts; the invariant parts —
 * listQuery parsing, AND-ed conditions, matched rows+count queries, page
 * slicing, and the {data,total,page,pageSize} contract — live here.
 *
 * The same `join` is applied to BOTH the rows and count queries, so a filter
 * or search column on a joined table can never diverge the two (a bug class
 * several hand-rolled routes were one filter away from).
 */
export interface AdminListSpec {
  /** Source table the list reads from. */
  from: SQLiteTable;
  /** Resource filters — push SQL conditions onto conds. */
  filters?: (conds: SQL[], lq: ListQuery) => void;
  /** Columns matched by ?q= via escaped LIKE, OR'd together. */
  search?: Column[];
  /** Explicit select shape; omit for a full-row select(). */
  select?: SelectedFields;
  /**
   * Join chain applied identically to rows and count queries. `any` because
   * drizzle's fluent select returns a different generic per chained call —
   * the spec treats it as an opaque pipeline.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  join?: (q: any) => any;
  /** Whitelisted sort keys → columns/expressions (orderBy falls back). */
  sortMap: Record<string, SQLWrapper>;
  defaultSort: string;
  /** Optional per-row post-processing before listOk. */
  map?: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    row: any,
  ) => unknown;
}

export function adminList(req: Request, spec: AdminListSpec) {
  const lq = listQuery(req);
  const conds: SQL[] = [];
  spec.filters?.(conds, lq);
  if (lq.q && spec.search?.length) {
    const p = likePattern(lq.q);
    conds.push(or(...spec.search.map((c) => like(c, p)))!);
  }
  const where = and(...conds);

  type Q = Parameters<NonNullable<AdminListSpec["join"]>>[0];
  const join = (q: Q) => (spec.join ? spec.join(q) : q);

  const rowsQ = join(
    (spec.select ? db.select(spec.select) : db.select()).from(spec.from),
  )
    .where(where)
    .orderBy(orderBy(spec.sortMap, lq.sort, lq.order, spec.defaultSort))
    .limit(lq.pageSize)
    .offset(lq.offset);

  const totalQ = join(db.select({ total: count() }).from(spec.from)).where(where);

  return Promise.all([
    rowsQ as Promise<unknown[]>,
    totalQ as Promise<[{ total: number }]>,
  ]).then(([rows, [{ total }]]) =>
    listOk(spec.map ? rows.map(spec.map) : rows, total, lq),
  );
}
