import { proxy } from "@/lib/api/proxy";
import { requireAdmin } from "@/lib/me";

// Persona floor only — the backend enforces the per-resource capability.
export const GET = proxy<"/api/admin/export">(
  "/api/v1/admin/export",
  requireAdmin,
);
