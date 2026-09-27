import { apiServer } from "@/lib/api-server";
import { fail } from "@/lib/api/helpers";
import { requirePermission } from "@/lib/me";
import { PERM } from "@/lib/permissions";

/** Live role→permission matrix, proxied from the backend's enforced RBAC tables. */
export async function GET() {
  const me = await requirePermission(PERM.adminView);
  if (me instanceof Response) return me;
  try {
    return Response.json(await apiServer("/api/v1/admin/rbac"));
  } catch (e) {
    return fail(502, e instanceof Error ? e.message : "Backend unavailable");
  }
}
