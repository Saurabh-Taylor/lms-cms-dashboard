import { proxy } from "@/lib/api/proxy";
import { requireAdmin } from "@/lib/me";

// Delete a thread — cascades transcript, runs, interrupts, approvals (#93).
export const DELETE = proxy<"/api/ai/threads/[threadId]">(
  "/api/v1/ai/threads/[threadId]",
  requireAdmin,
);
