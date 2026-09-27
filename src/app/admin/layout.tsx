import { redirect } from "next/navigation";
import { getCurrentAdmin, getCurrentUser, homeForRole } from "@/lib/me";
import { AdminShell } from "@/components/layout/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentAdmin();
  if (!me) {
    // a valid non-admin session belongs to the learner portal, not /login
    const u = await getCurrentUser();
    redirect(u ? homeForRole(u.role) : "/login");
  }
  return (
    <AdminShell key={me.email} me={me}>
      {children}
    </AdminShell>
  );
}
