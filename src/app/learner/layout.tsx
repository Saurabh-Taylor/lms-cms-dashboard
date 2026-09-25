import { redirect } from "next/navigation";
import { getCurrentLearner, getCurrentUser, homeForRole } from "@/lib/me";
import { LearnerShell } from "@/components/layout/learner-shell";

export default async function LearnerLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentLearner();
  if (!me) {
    // a valid admin session belongs to the CMS, not the portal
    const u = await getCurrentUser();
    redirect(u ? homeForRole(u.role) : "/login");
  }
  return <LearnerShell key={me.id} me={me}>{children}</LearnerShell>;
}
