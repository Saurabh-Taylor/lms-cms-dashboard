import { proxy } from "@/lib/api/proxy";
import { requireLearner } from "@/lib/me";

export const POST = proxy<"/api/learner/assessments/[id]/attempts">(
  "/api/v1/learner/assessments/[id]/attempts",
  requireLearner,
);
