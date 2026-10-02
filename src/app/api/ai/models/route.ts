import { proxy } from "@/lib/api/proxy";
import { requireAdmin } from "@/lib/me";

export const GET = proxy<"/api/ai/models">("/api/v1/ai/models", requireAdmin);
