import { apiServer } from "@/lib/api-server";
import { PageHeader } from "@/components/shared/page-header";
import type { EmailTemplateRow } from "@/lib/types";
import { TemplatesClient } from "./templates-client";

export default async function EmailTemplatesPage() {
  const { data: rows } = await apiServer<{ data: EmailTemplateRow[] }>("/api/v1/admin/email-templates");
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Email Templates" description="Transactional emails sent by the platform" />
      <TemplatesClient templates={rows} />
    </div>
  );
}
