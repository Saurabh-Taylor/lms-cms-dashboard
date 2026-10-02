import { proxy } from "@/lib/api/proxy";
import { requireAdmin } from "@/lib/me";

const handler = proxy<"/api/ai/chat">("/api/v1/ai/chat", requireAdmin);

// TEMP #86 trace — thin wrapper logging proxy in/out around the one-liner.
export async function POST(req: Request, ctx: Parameters<typeof handler>[1]) {
  console.log("[niyamak] → proxy POST /api/v1/ai/chat");
  const res = await handler(req, ctx);
  console.log(`[niyamak] ← upstream ${res.status} ${res.headers.get("content-type")}`);
  return res;
}
