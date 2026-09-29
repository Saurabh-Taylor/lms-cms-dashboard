import { publicAuthForward } from "@/lib/api-server";
import { fail } from "@/lib/api/helpers";

/**
 * Public forgot-password / invite flow trigger — thin forward to Better Auth
 * on the backend. The response is identical whether the account exists or not
 * (no account-existence disclosure); backend zod owns validation.
 */
export async function POST(req: Request) {
  try {
    return await publicAuthForward("/api/auth/request-password-reset", req);
  } catch {
    return fail(503, "Authentication service unavailable");
  }
}
