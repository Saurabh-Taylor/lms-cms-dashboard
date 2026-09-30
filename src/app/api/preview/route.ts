import { proxy } from "@/lib/api/proxy";
import { fail } from "@/lib/api/helpers";
import { getCurrentUser, type SessionUser } from "@/lib/me";

// While previewing, the session's effective persona is learner/instructor —
// the exit call still has to pass, so the gate admits admins OR a session
// already carrying the previewing marker. Backend enforces the real rule.
async function requireAdminOrPreviewing(): Promise<SessionUser | Response> {
  const me = await getCurrentUser();
  if (!me) return fail(401, "Not signed in");
  if (me.role === "admin" || me.previewing) return me;
  return fail(403, "Forbidden");
}

export const POST = proxy<"/api/preview">("/api/v1/preview", requireAdminOrPreviewing);
export const DELETE = proxy<"/api/preview">("/api/v1/preview", requireAdminOrPreviewing);
