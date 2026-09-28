import { apiServerRaw, forwardClientHeaders } from "@/lib/api-server";
import { fail } from "@/lib/api/helpers";

/**
 * Access request, not self-registration — thin public forward to the backend's
 * invited-request endpoint. The response is identical whether the account
 * exists or not (no account-existence disclosure); backend zod owns validation.
 */
export async function POST(req: Request) {
  try {
    return await apiServerRaw("/api/v1/auth/signup", {
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
    return fail(503, "Request service unavailable");
  }
}
