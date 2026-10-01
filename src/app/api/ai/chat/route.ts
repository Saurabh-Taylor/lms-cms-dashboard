import { proxy } from "@/lib/api/proxy";
import { requireAdmin } from "@/lib/me";

export const POST = proxy<"/api/ai/chat">("/api/v1/ai/chat", requireAdmin);
