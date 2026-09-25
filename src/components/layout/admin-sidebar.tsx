"use client";

import { AppSidebar } from "@/components/shared/app-shell/app-sidebar";
import { NAV } from "@/lib/nav";
import { can, CURRENT_ROLE } from "@/lib/permissions";

/** Admin nav — permissions filtered at the wrapper, shell stays generic. */
export function AdminSidebar() {
  const nav = NAV.map((group) => ({
    ...group,
    items: group.items.filter(
      (i) => !i.permission || can(CURRENT_ROLE, i.permission)
    ),
  })).filter((g) => g.items.length > 0);

  return <AppSidebar nav={nav} brand={{ title: "LearnHub CMS", href: "/admin/dashboard" }} />;
}
