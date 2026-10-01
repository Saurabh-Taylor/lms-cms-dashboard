import { z } from "zod";
import { apiServerRaw, forwardClientHeaders, forwardSetCookies } from "@/lib/api-server";
import { fail, ok } from "@/lib/api/helpers";

/**
 * SSO entry — proxies Better Auth's /sign-in/sso. The backend resolves the
 * email's domain to a registered provider and returns the IdP authorization
 * URL; the browser navigates there and lands back on `next` post-login.
 * Set-Cookie is forwarded — the OIDC flow may set state/nonce cookies here.
 */
export async function POST(req: Request) {
  const parsed = z
    .object({
      email: z.string().email().min(1),
      next: z.string().optional(),
    })
    .safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Enter your work email");

  const { email, next } = parsed.data;
  const callbackURL = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  let res: Response;
  try {
    res = await apiServerRaw("/api/auth/sign-in/sso", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...forwardClientHeaders(req) },
      body: JSON.stringify({ email: email.trim().toLowerCase(), callbackURL }),
    });
  } catch {
    return fail(503, "Authentication service unavailable");
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    return fail(res.status >= 500 ? 502 : res.status, body?.error?.message ?? "SSO sign-in failed");
  }
  const url = typeof body?.url === "string" ? body.url : null;
  if (!url) return fail(502, "Identity provider did not return a redirect");
  return forwardSetCookies(res, ok({ url }));
}
