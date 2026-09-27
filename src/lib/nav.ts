import {
  BookOpenIcon, ClipboardCheckIcon, ClipboardListIcon,
  FolderTreeIcon, GraduationCapIcon, ImagesIcon, LayoutDashboardIcon,
  AwardIcon, MailIcon, MegaphoneIcon, BellIcon, BarChart3Icon,
  ActivityIcon, FileTextIcon, ScrollTextIcon, SettingsIcon, UsersIcon,
  UserCogIcon, ShieldIcon, Users2Icon, RouteIcon,
  PlugIcon, type LucideIcon,
} from "lucide-react";
import { PERM, type Perm } from "@/lib/permissions";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** RBAC capability key (resource:action) — gated against the session's server-resolved permissions. */
  permission?: Perm;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    items: [
      { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboardIcon, permission: PERM.analyticsView },
    ],
  },
  {
    label: "Content",
    items: [
      { title: "Courses", href: "/admin/courses", icon: BookOpenIcon, permission: PERM.courseView },
      { title: "Categories", href: "/admin/categories", icon: FolderTreeIcon, permission: PERM.courseView },
      { title: "Learning Paths", href: "/admin/learning-paths", icon: RouteIcon, permission: PERM.courseView },
      { title: "Media Library", href: "/admin/media", icon: ImagesIcon, permission: PERM.courseView },
    ],
  },
  {
    label: "Users",
    items: [
      { title: "Learners", href: "/admin/learners", icon: GraduationCapIcon, permission: PERM.learnerView },
      { title: "Instructors", href: "/admin/instructors", icon: UserCogIcon, permission: PERM.learnerView },
      { title: "Administrators", href: "/admin/administrators", icon: ShieldIcon, permission: PERM.adminView },
      { title: "Groups / Cohorts", href: "/admin/groups", icon: Users2Icon, permission: PERM.learnerView },
    ],
  },
  {
    label: "Learning",
    items: [
      { title: "Enrollments", href: "/admin/enrollments", icon: UsersIcon, permission: PERM.enrollmentView },
      { title: "Assignments", href: "/admin/assignments", icon: ClipboardListIcon, permission: PERM.assessmentView },
      { title: "Assessments", href: "/admin/assessments", icon: ClipboardCheckIcon, permission: PERM.assessmentView },
      { title: "Certificates", href: "/admin/certificates", icon: AwardIcon, permission: PERM.certificateView },
    ],
  },
  {
    label: "Communication",
    items: [
      { title: "Announcements", href: "/admin/announcements", icon: MegaphoneIcon, permission: PERM.announcementView },
      { title: "Notifications", href: "/admin/notifications", icon: BellIcon, permission: PERM.announcementView },
      { title: "Email Templates", href: "/admin/email-templates", icon: MailIcon, permission: PERM.settingsView },
    ],
  },
  {
    label: "Insights",
    items: [
      { title: "Analytics", href: "/admin/analytics", icon: BarChart3Icon, permission: PERM.analyticsView },
      { title: "Learner Activity", href: "/admin/activity", icon: ActivityIcon, permission: PERM.activityView },
      { title: "Reports", href: "/admin/reports", icon: FileTextIcon, permission: PERM.analyticsView },
      { title: "Audit Logs", href: "/admin/audit-logs", icon: ScrollTextIcon, permission: PERM.auditView },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Integrations", href: "/admin/integrations", icon: PlugIcon, permission: PERM.settingsView },
      { title: "Settings", href: "/admin/settings", icon: SettingsIcon, permission: PERM.settingsView },
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
