import { asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { emailTemplates } from "@/lib/db/schema";
import { PageHeader } from "@/components/shared/page-header";
import { TemplatesClient } from "./templates-client";

export default async function EmailTemplatesPage() {
  const rows = await db.select().from(emailTemplates).orderBy(asc(emailTemplates.name));
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Email Templates" description="Transactional emails sent by the platform" />
      <TemplatesClient templates={rows} />
    </div>
  );
}
