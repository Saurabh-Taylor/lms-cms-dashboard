import { proxy } from "@/lib/api/proxy";
import { requireAdmin } from "@/lib/me";

export const GET = proxy<"/api/admin/search">("/api/v1/admin/search", requireAdmin);
