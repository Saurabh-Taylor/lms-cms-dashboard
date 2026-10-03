import { proxy } from "@/lib/api/proxy";
import { requireAdmin } from "@/lib/me";

// Thread rail index (#93) — server-authoritative list.
export const GET = proxy<"/api/ai/threads">("/api/v1/ai/threads", requireAdmin);
