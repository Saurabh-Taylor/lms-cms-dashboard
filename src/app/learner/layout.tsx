import { redirect } from "next/navigation";
import { getCurrentLearner, getCurrentUser, homeForRole } from "@/lib/me";
import { LearnerShell } from "@/components/layout/learner-shell";
import { PreviewBanner } from "@/components/learner/preview-banner";

export default async function LearnerLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentLearner();
  if (!me) {
    // a valid admin session belongs to the CMS, not the portal
    const u = await getCurrentUser();
    redirect(u ? homeForRole(u.role) : "/login");
  }
  return (
    <>
      {me.previewing && <PreviewBanner persona={me.previewing} />}
      <LearnerShell key={me.email} me={me}>{children}</LearnerShell>
    </>
  );
}
