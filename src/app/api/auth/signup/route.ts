import { publicAuthForward } from "@/lib/api-server";
import { fail } from "@/lib/api/helpers";

/**
 * Access request, not self-registration — thin public forward to the backend's
 * requested-status endpoint. The response is identical whether the account
 * exists or not (no account-existence disclosure); backend zod owns validation.
 */
export async function POST(req: Request) {
  try {
    return await publicAuthForward("/api/v1/auth/signup", req);
  } catch {
    return fail(503, "Request service unavailable");
  }
}
