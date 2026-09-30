import { apiServerRaw, forwardClientHeaders, forwardSetCookies } from "@/lib/api-server";
import { fail } from "@/lib/api/helpers";

/**
 * Password-reset / invite link landing — Better Auth emails point at
 * {BETTER_AUTH_URL}/api/auth/reset-password/<token>?callbackURL=..., i.e. the
 * frontend domain, so this route forwards the GET to the API verbatim. The
 * API validates the token and 302s to the callback (the /reset-password
 * form); redirect:"manual" keeps the 302 + Location + Set-Cookie intact for
 * the browser instead of following it server-side.
 */
export async function GET(
  req: Request,
  ctx: RouteContext<"/api/auth/reset-password/[token]">,
) {
  const { token } = await ctx.params;
  const { search } = new URL(req.url);
  try {
    // Next decodes %2F/%2E%2E into params — re-encode so a crafted token
    // can't traverse into other /api/auth/* paths upstream.
    const res = await apiServerRaw(
      `/api/auth/reset-password/${encodeURIComponent(token)}${search}`,
      { method: "GET", headers: forwardClientHeaders(req), redirect: "manual" },
    );
    const location = res.headers.get("location");
    const out = new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: {
        "content-type": res.headers.get("content-type") ?? "text/plain",
        ...(location ? { location } : {}),
      },
    });
    return forwardSetCookies(res, out);
  } catch {
    return fail(503, "Authentication service unavailable");
  }
}
