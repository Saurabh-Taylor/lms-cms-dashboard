import {
  BookOpenIcon, ClipboardCheckIcon, ClipboardListIcon,
  FolderTreeIcon, GraduationCapIcon, ImagesIcon, LayoutDashboardIcon,
  AwardIcon, MailIcon, MegaphoneIcon, BellIcon, BarChart3Icon,
  ActivityIcon, FileTextIcon, ScrollTextIcon, SettingsIcon, UsersIcon,
  UserCogIcon, ShieldIcon, Users2Icon, RouteIcon,
  PlugIcon, type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    items: [
      { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboardIcon, permission: "analytics:view" },
    ],
  },
  {
    label: "Content",
    items: [
      { title: "Courses", href: "/admin/courses", icon: BookOpenIcon, permission: "course:view" },
      { title: "Categories", href: "/admin/categories", icon: FolderTreeIcon, permission: "course:view" },
      { title: "Learning Paths", href: "/admin/learning-paths", icon: RouteIcon, permission: "course:view" },
      { title: "Media Library", href: "/admin/media", icon: ImagesIcon, permission: "course:view" },
    ],
  },
  {
    label: "Users",
    items: [
      { title: "Learners", href: "/admin/learners", icon: GraduationCapIcon, permission: "learner:view" },
      { title: "Instructors", href: "/admin/instructors", icon: UserCogIcon, permission: "learner:view" },
      { title: "Administrators", href: "/admin/administrators", icon: ShieldIcon, permission: "admin:view" },
      { title: "Groups / Cohorts", href: "/admin/groups", icon: Users2Icon, permission: "learner:view" },
    ],
  },
  {
    label: "Learning",
    items: [
      { title: "Enrollments", href: "/admin/enrollments", icon: UsersIcon, permission: "enrollment:view" },
      { title: "Assignments", href: "/admin/assignments", icon: ClipboardListIcon, permission: "assessment:view" },
      { title: "Assessments", href: "/admin/assessments", icon: ClipboardCheckIcon, permission: "assessment:view" },
      { title: "Certificates", href: "/admin/certificates", icon: AwardIcon, permission: "certificate:view" },
    ],
  },
  {
    label: "Communication",
    items: [
      { title: "Announcements", href: "/admin/announcements", icon: MegaphoneIcon, permission: "announcement:view" },
      { title: "Notifications", href: "/admin/notifications", icon: BellIcon, permission: "announcement:view" },
      { title: "Email Templates", href: "/admin/email-templates", icon: MailIcon, permission: "settings:view" },
    ],
  },
  {
    label: "Insights",
    items: [
      { title: "Analytics", href: "/admin/analytics", icon: BarChart3Icon, permission: "analytics:view" },
      { title: "Learner Activity", href: "/admin/activity", icon: ActivityIcon, permission: "activity:view" },
      { title: "Reports", href: "/admin/reports", icon: FileTextIcon, permission: "analytics:view" },
      { title: "Audit Logs", href: "/admin/audit-logs", icon: ScrollTextIcon, permission: "audit:view" },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Integrations", href: "/admin/integrations", icon: PlugIcon, permission: "settings:view" },
      { title: "Settings", href: "/admin/settings", icon: SettingsIcon, permission: "settings:view" },
    ],
  },
];

/** Matches a pathname to a nav item (longest prefix wins). */
export function activeNavItem(pathname: string) {
  let best: NavItem | null = null;
  for (const g of NAV)
    for (const item of g.items)
      if (pathname === item.href || pathname.startsWith(item.href + "/"))
        if (!best || item.href.length > best.href.length) best = item;
  return best;
}
