import { apiServerRaw, forwardClientHeaders, forwardSetCookies } from "@/lib/api-server";
import { fail } from "@/lib/api/helpers";

/**
 * Public set/reset-password submit — thin forward to Better Auth on the
 * backend. Forwards any cookies the API issues so invite-claim can sign in
 * directly if the backend chooses to.
 */
export async function POST(req: Request) {
  try {
    const res = await apiServerRaw("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...forwardClientHeaders(req),
      },
      body: req.body,
      // undici requires duplex for streamed request bodies
      ...{ duplex: "half" },
    } as RequestInit);
    const out = new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
    return forwardSetCookies(res, out);
  } catch {
    return fail(503, "Authentication service unavailable");
  }
}
