import { PageHeader } from "@/components/shared/page-header";
import { SettingsClient } from "./settings-client";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Settings" description="Platform configuration and role permissions" />
      <SettingsClient />
    </div>
  );
}
