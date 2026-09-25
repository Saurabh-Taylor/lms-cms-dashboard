import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DownloadIcon, ArrowRightIcon } from "lucide-react";

const EXPORTS = [
  { title: "Learner roster", desc: "All learners with status, enrollments, and progress", resource: "learners" },
  { title: "Enrollments", desc: "Full enrollment history with learner and course names", resource: "enrollments" },
  { title: "Course catalog", desc: "Courses with enrollment and completion metrics", resource: "courses" },
];

const LINKS = [
  { title: "Analytics", desc: "Live dashboards for learners, courses, and assessments", href: "/admin/analytics" },
  { title: "Learner activity", desc: "Event-level learner timelines with filters", href: "/admin/activity" },
  { title: "Audit logs", desc: "Every administrative action, searchable", href: "/admin/audit-logs" },
];

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Reports" description="CSV exports and deep-dive reports" />

      <div className="grid gap-4 md:grid-cols-3">
        {EXPORTS.map((r) => (
          <Card key={r.resource}>
            <CardHeader><CardTitle className="text-sm font-medium">{r.title}</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">{r.desc}</p>
              <Button variant="outline" size="sm" className="w-fit" nativeButton={false} render={<a href={`/api/admin/export?resource=${r.resource}`} download />}>
                <DownloadIcon /> Export CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {LINKS.map((r) => (
          <Card key={r.href}>
            <CardHeader><CardTitle className="text-sm font-medium">{r.title}</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">{r.desc}</p>
              <Button variant="ghost" size="sm" className="w-fit -ml-2" nativeButton={false} render={<Link href={r.href as never} />}>
                Open <ArrowRightIcon />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
