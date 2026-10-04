import { proxy } from "@/lib/api/proxy";
import { requireLearner } from "@/lib/me";

/**
 * Package file serving — the ?lt= launch token is the real authorization
 * (backend verifies it per file). The learner gate is defense-in-depth so
 * anonymous hits die here; relative URLs inside SCO HTML depend on the
 * catch-all path reaching the backend verbatim.
 */
export const GET = proxy<"/api/scorm/packages/[id]/content/[...path]">(
  "/api/v1/scorm/packages/[id]/content/[...path]",
  requireLearner,
);
