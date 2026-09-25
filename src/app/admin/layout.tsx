import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getCurrentAdmin, getCurrentUser, homeForRole } from "@/lib/me";
import { AdminShell } from "@/components/layout/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentAdmin();
  if (!me) {
    // a valid non-admin session belongs to the learner portal, not /login
    const u = await getCurrentUser();
    redirect(u ? homeForRole(u.role) : "/login");
  }
  // demo switcher list — stands in for an admin directory while there's no auth
  const admins = db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.role, "admin"))
    .orderBy(asc(users.id))
    .all()
    .slice(0, 8);

  return (
    <AdminShell key={me.id} me={me} admins={admins}>
      {children}
    </AdminShell>
  );
}
