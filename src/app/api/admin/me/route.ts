import { proxy } from "@/lib/api/proxy";
import { requireAdmin } from "@/lib/me";

export const GET = proxy<"/api/admin/me">("/api/v1/admin/me", requireAdmin);
export const PATCH = proxy<"/api/admin/me">("/api/v1/admin/me", requireAdmin);
