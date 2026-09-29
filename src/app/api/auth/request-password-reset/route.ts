import { apiServerRaw, forwardClientHeaders } from "@/lib/api-server";
import { fail } from "@/lib/api/helpers";

/**
 * Public forgot-password / invite flow trigger — thin forward to Better Auth
 * on the backend. The response is identical whether the account exists or not
 * (no account-existence disclosure); backend zod owns validation.
 */
export async function POST(req: Request) {
  try {
    return await apiServerRaw("/api/auth/request-password-reset", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...forwardClientHeaders(req),
      },
      body: req.body,
      // undici requires duplex for streamed request bodies
      ...{ duplex: "half" },
    } as RequestInit);
  } catch {
    return fail(503, "Authentication service unavailable");
  }
}
