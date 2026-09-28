import { proxy } from "@/lib/api/proxy";
import { requireLearner } from "@/lib/me";

export const POST = proxy<"/api/learner/assessments/[id]/attempts/[attemptId]/submit">(
  "/api/v1/learner/assessments/[id]/attempts/[attemptId]/submit",
  requireLearner,
);
