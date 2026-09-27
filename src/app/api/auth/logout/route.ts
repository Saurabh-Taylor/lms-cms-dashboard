import { cookies } from "next/headers";
import { apiServerRaw, forwardClientHeaders, forwardSetCookies } from "@/lib/api-server";
import { ok } from "@/lib/api/helpers";
import { ROLE_COOKIE, SESSION_COOKIE } from "@/lib/session";

/** Sign-out — asks the API to revoke the session, then clears local cookies. */
export async function POST(req: Request) {
  try {
    const res = await apiServerRaw("/api/auth/sign-out", {
      method: "POST",
      headers: forwardClientHeaders(req),
    });
    // forward the API's cookie-clearing headers
    const response = ok({ signedOut: true });
    forwardSetCookies(res, response);
    const store = await cookies();
    store.delete(ROLE_COOKIE);
    return response;
  } catch {
    // API unreachable — clear what we own locally anyway
    const store = await cookies();
    store.delete(SESSION_COOKIE);
    store.delete(ROLE_COOKIE);
    return ok({ signedOut: true });
  }
}
