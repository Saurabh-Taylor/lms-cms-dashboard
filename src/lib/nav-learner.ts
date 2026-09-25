import {
  AwardIcon, BookOpenIcon, ClipboardCheckIcon, ClipboardListIcon,
  LayoutDashboardIcon, MegaphoneIcon, UserRoundIcon,
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
      { title: "Announcements", href: "/learner/announcements", icon: MegaphoneIcon },
    ],
  },
  {
    label: "Account",
    items: [
      { title: "Profile", href: "/learner/profile", icon: UserRoundIcon },
    ],
  },
];
