import { cookies } from "next/headers";
import { apiServerRaw, forwardClientHeaders, forwardSetCookies } from "@/lib/api-server";
import { ok } from "@/lib/api/helpers";
import { ROLE_COOKIE, SESSION_COOKIE } from "@/lib/session";

/** Sign-out — asks the API to revoke the session, then clears local cookies. */
export async function POST(req: Request) {
  const clearLocalCookies = async () => {
    const store = await cookies();
    store.delete(SESSION_COOKIE);
    store.delete(ROLE_COOKIE);
  };
  try {
    const res = await apiServerRaw("/api/auth/sign-out", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...forwardClientHeaders(req) },
      body: "{}",
    });
    const response = ok({ signedOut: true });
    if (res.ok) {
      // forward the API's cookie-clearing headers
      forwardSetCookies(res, response);
      const store = await cookies();
      store.delete(ROLE_COOKIE);
    } else {
      // Upstream rejected/revoked nothing — still drop what we own locally so
      // the user isn't bounced back by a live cookie. The server-side session
      // row may linger; that's a backend concern, not a reason to keep it here.
      console.warn(`sign-out upstream returned ${res.status} — clearing local cookies`);
      await clearLocalCookies();
    }
    return response;
  } catch {
    // API unreachable — clear what we own locally anyway
    await clearLocalCookies();
    return ok({ signedOut: true });
  }
}
