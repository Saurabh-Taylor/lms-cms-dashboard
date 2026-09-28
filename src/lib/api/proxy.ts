// Permanent BFF pass-through (ADR 0001 / #6). A flipped route declares only
// WHICH capability it exposes and WHERE it lands on the backend — proxy()
// owns gate → param substitution → verbatim forward. The backend's
// ZodValidationPipe is the only validator; this layer never parses the body
// and never touches the envelope — by construction there is no hook to.
import type { AppRouteHandlerRoutes } from "../../../.next/types/routes.js";
import { requirePermission, type SessionUser } from "@/lib/me";
import { fail } from "@/lib/api/helpers";
import { apiServerRaw, forwardClientHeaders, forwardSetCookies } from "@/lib/api-server";
import type { Perm } from "@/lib/permissions";

/** Capability gate — a Perm (all-of via requirePermission) or a persona gate fn like requireLearner. */
export type Gate = Perm | Perm[] | (() => Promise<SessionUser | Response>);

/** Hop-by-hop / encoding headers that must not survive a forwarded body. */
const DROP_RESPONSE_HEADERS = [
  "connection",
  "content-encoding",
  "content-length",
  "transfer-encoding",
];

/**
 * proxy("/api/v1/admin/categories/[id]", PERM.courseUpdate) — template segments
 * resolve from ctx.params; the query string and request body forward verbatim.
 */
export function proxy<P extends AppRouteHandlerRoutes>(
  target: string,
  gate: Gate,
): (req: Request, ctx: RouteContext<P>) => Promise<Response> {
  return async (req, ctx) => {
    const me =
      typeof gate === "function"
        ? await gate()
        : await requirePermission(...[gate].flat());
    if (me instanceof Response) return me;

    let path = target;
    const params = ((await ctx.params) ?? {}) as Record<string, string>;
    for (const [k, v] of Object.entries(params)) {
      if (v.includes("/") || v.includes("..")) return fail(400, `Invalid ${k}`);
      path = path.replaceAll(`[${k}]`, v);
    }

    // Buffer the body: req.body is a non-null *empty* stream for DELETE, and
    // Fastify 400s on `content-type: application/json` with no bytes. Admin
    // payloads are small JSON — large uploads bypass this proxy (tus→Vimeo).
    const body = ["GET", "HEAD"].includes(req.method) ? "" : await req.text();
    const contentType = body ? req.headers.get("content-type") : null;
    const res = await apiServerRaw(`${path}${new URL(req.url).search}`, {
      method: req.method,
      body: body || undefined,
      headers: {
        ...(contentType ? { "content-type": contentType } : {}),
        ...forwardClientHeaders(req),
      },
    });

    const headers = new Headers(res.headers);
    for (const h of DROP_RESPONSE_HEADERS) headers.delete(h);
    headers.delete("set-cookie");
    const out = new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
    return forwardSetCookies(res, out);
  };
}
