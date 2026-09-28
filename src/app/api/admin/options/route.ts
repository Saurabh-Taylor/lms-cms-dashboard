import { proxy } from "@/lib/api/proxy";
import { requireAdmin } from "@/lib/me";

export const GET = proxy<"/api/admin/options">("/api/v1/admin/options", requireAdmin);
