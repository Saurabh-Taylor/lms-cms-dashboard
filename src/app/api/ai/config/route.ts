import { proxy } from "@/lib/api/proxy";
import { requireAdmin } from "@/lib/me";

export const GET = proxy<"/api/ai/config">("/api/v1/ai/config", requireAdmin);
