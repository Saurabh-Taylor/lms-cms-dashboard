import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { AnnouncementsTable, AnnouncementActions } from "./announcements-table";

export default function AnnouncementsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Announcements" description="Broadcast messages to learners and staff" actions={<AnnouncementActions />} />
      <Suspense><AnnouncementsTable /></Suspense>
    </div>
  );
}
