import { proxy } from "@/lib/api/proxy";
import { requireLearner } from "@/lib/me";

/** Mark a lesson complete (idempotent) — the backend engine owns all derived consequences. */
export const POST = proxy<"/api/learner/lessons/[id]/complete">(
  "/api/v1/learner/lessons/[id]/complete",
  requireLearner,
);

/** Unmark a lesson (redo) — drops progress back honestly. */
export const DELETE = proxy<"/api/learner/lessons/[id]/complete">(
  "/api/v1/learner/lessons/[id]/complete",
  requireLearner,
);
