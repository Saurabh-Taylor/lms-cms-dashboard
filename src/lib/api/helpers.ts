import { asc, desc, type SQL, type SQLWrapper } from "drizzle-orm";

export interface ListQuery {
  sp: URLSearchParams;
  page: number;
  pageSize: number;
  offset: number;
  q: string;
  sort?: string;
  order: "asc" | "desc";
}

export function listQuery(req: Request): ListQuery {
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(sp.get("pageSize")) || 20));
  return {
    sp,
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    q: (sp.get("q") ?? "").trim(),
    sort: sp.get("sort") ?? undefined,
    order: sp.get("order") === "asc" ? "asc" : "desc",
  };
}

/** Maps a client sort key to a whitelisted column/expression; falls back to the default. */
export function orderBy(
  map: Record<string, SQLWrapper>,
  sort: string | undefined,
  order: "asc" | "desc",
  fallback: string
): SQL {
  const col = map[sort ?? ""] ?? map[fallback];
  return order === "asc" ? asc(col) : desc(col);
}

export const slugify = (t: string) =>
  t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json(data, init);
}

export function fail(status: number, message: string) {
  return Response.json({ error: { message } }, { status });
}

export function listOk<T>(
  data: T[],
  total: number,
  q: { page: number; pageSize: number }
) {
  return ok({ data, total, page: q.page, pageSize: q.pageSize });
}

/** Escape LIKE wildcards from user search input. */
export function likePattern(q: string) {
  return `%${q.replace(/[%_\\]/g, "")}%`;
}
