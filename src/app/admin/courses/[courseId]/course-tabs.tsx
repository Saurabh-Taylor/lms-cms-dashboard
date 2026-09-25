"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function CourseTabs({ courseId }: { courseId: number }) {
  const pathname = usePathname();
  const base = `/admin/courses/${courseId}`;
  const tabs = [
    { label: "Overview", href: base },
    { label: "Content", href: `${base}/content` },
    { label: "Learners", href: `${base}/learners` },
    { label: "Settings", href: `${base}/settings` },
  ];
  return (
    <div className="flex gap-1 border-b">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href as never}
            className={cn(
              "-mb-px border-b-2 border-transparent px-3 pb-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              active && "border-primary text-foreground"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
