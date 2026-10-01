import {
  AwardIcon, BellIcon, BookOpenIcon, ClipboardCheckIcon, ClipboardListIcon,
  CompassIcon, LayoutDashboardIcon, UserRoundIcon,
} from "lucide-react";
import type { NavGroup } from "@/lib/nav";

/** Learner portal navigation — learner-domain routes only, no admin concepts. */
export const LEARNER_NAV: NavGroup[] = [
  {
    items: [
      { title: "Dashboard", href: "/learner/dashboard", icon: LayoutDashboardIcon },
    ],
  },
  {
    label: "Learning",
    items: [
      { title: "My Learning", href: "/learner/my-learning", icon: BookOpenIcon },
      { title: "Catalog", href: "/learner/catalog", icon: CompassIcon },
    ],
  },
  {
    label: "Tasks",
    items: [
      { title: "Assignments", href: "/learner/assignments", icon: ClipboardListIcon },
      { title: "Assessments", href: "/learner/assessments", icon: ClipboardCheckIcon },
    ],
  },
  {
    label: "Progress",
    items: [
      { title: "Certificates", href: "/learner/certificates", icon: AwardIcon },
    ],
  },
  {
    label: "Updates",
    items: [
      { title: "Notifications", href: "/learner/announcements", icon: BellIcon },
    ],
  },
  {
    label: "Account",
    items: [
      { title: "Profile", href: "/learner/profile", icon: UserRoundIcon },
    ],
  },
];
