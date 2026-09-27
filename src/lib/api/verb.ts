// The route seam for the write path. A route declares only WHICH capability
// it exposes — `verb(gate, op)` owns gate → params → parse → call → envelope
// → error mapping. Ops are {schema?, run(me, params, body)}; run owns the tx,
// policy, refresh ordering, and audit (see src/lib/admin/*).
import type { z } from "zod";
import type { AppRouteHandlerRoutes } from "../../../.next/types/routes.js";
import { requirePermission, type SessionUser } from "@/lib/me";
import { domainFail, fail, ok } from "@/lib/api/helpers";
import type { Perm } from "@/lib/permissions";

export type Gate = Perm | Perm[] | (() => Promise<SessionUser | Response>);

/** An operation as the route consumes it: parsed body + params go IN, a JSON-able
 *  result comes OUT. `body: never` keeps it contravariant — op fns declare their
 *  concrete input type (LessonPatch etc.) and still satisfy this shape. */
export interface Op<P> {
  schema?: z.ZodType;
  run: (me: SessionUser, params: P, body: never) => unknown | Promise<unknown>;
}

/** Route params coerced to integers — every dynamic segment today is a numeric id. */
type ParamsOf<P extends AppRouteHandlerRoutes> = {
  [K in keyof Awaited<RouteContext<P>["params"]>]: number;
};

export function verb<P extends AppRouteHandlerRoutes>(
  gate: Gate,
  op: Op<ParamsOf<P>>,
  opts?: { status?: number }
): (req: Request, ctx: RouteContext<P>) => Promise<Response> {
  return async (req, ctx) => {
    const me =
      typeof gate === "function"
        ? await gate()
        : await requirePermission(...[gate].flat());
    if (me instanceof Response) return me;

    // collection routes have no dynamic segment — params resolve to undefined
    const raw = ((await ctx.params) ?? {}) as Record<string, string>;
    const params: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) {
      const n = Number(v);
      if (!Number.isInteger(n)) return fail(400, `Invalid ${k}`);
      params[k] = n;
    }

    let body: unknown;
    if (op.schema) {
      const parsed = op.schema.safeParse(await req.json().catch(() => ({})));
      if (!parsed.success)
        return fail(400, parsed.error.issues[0]?.message ?? "Invalid payload");
      body = parsed.data;
    }

    try {
      const result = await op.run(me, params as ParamsOf<P>, body as never);
      return ok(result, { status: opts?.status ?? (req.method === "POST" ? 201 : 200) });
    } catch (e) {
      return domainFail(e);
    }
  };
}
