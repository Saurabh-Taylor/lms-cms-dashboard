import { z } from "zod";
import { cookies } from "next/headers";
import { apiServerRaw, forwardClientHeaders, forwardSetCookies } from "@/lib/api-server";
import { fail, ok } from "@/lib/api/helpers";
import { ROLE_COOKIE, homeForRole, portalRole } from "@/lib/session";

interface SignInUser {
  name: string;
  email: string;
  appRole: string;
  status: string;
}

/**
 * Sign-in — proxies Better Auth on the NestJS API. The session cookie is
 * forwarded from the API response onto this origin (same-site, HttpOnly), so
 * the browser only ever holds the microshala.session_token cookie here.
 */
export async function POST(req: Request) {
  const parsed = z
    .object({ email: z.string().email().min(1), password: z.string().min(1) })
    .safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Email and password are required");

  const { email, password } = parsed.data;
  let res: Response;
  try {
    res = await apiServerRaw("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...forwardClientHeaders(req) },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
  } catch {
    return fail(503, "Authentication service unavailable");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    // generic message — no account-existence disclosure
    return fail(401, body?.error?.message ?? "Invalid email or password");
  }

  const body = (await res.json().catch(() => null)) as { user?: SignInUser } | null;
  const user = body?.user;
  if (!user) return fail(502, "Malformed authentication response");
  if (user.status !== "active") return fail(401, "Invalid email or password");

  // forward every auth cookie the API issued (session token, cookie-cache, …)
  const role = portalRole(user.appRole);
  const response = ok({ signedIn: true, name: user.name, role, redirectTo: homeForRole(role) });
  forwardSetCookies(res, response);

  const store = await cookies();
  store.set(ROLE_COOKIE, role, { path: "/", httpOnly: true, sameSite: "lax" });
  return response;
}
