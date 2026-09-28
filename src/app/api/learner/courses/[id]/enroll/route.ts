import { proxy } from "@/lib/api/proxy";
import { requireLearner } from "@/lib/me";

/** Self-enroll in a published public course (repeats → 409). */
export const POST = proxy<"/api/learner/courses/[id]/enroll">(
  "/api/v1/learner/courses/[id]/enroll",
  requireLearner,
);
