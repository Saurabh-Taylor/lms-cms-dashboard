import { publicAuthForward } from "@/lib/api-server";
import { fail } from "@/lib/api/helpers";

/**
 * Public set/reset-password submit — thin forward to Better Auth on the
 * backend. Forwards any cookies the API issues so invite-claim can sign in
 * directly if the backend chooses to.
 */
export async function POST(req: Request) {
  try {
    return await publicAuthForward("/api/auth/reset-password", req);
  } catch {
    return fail(503, "Authentication service unavailable");
  }
}
