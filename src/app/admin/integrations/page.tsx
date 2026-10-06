"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const INTEGRATIONS = [
  { key: "slack", name: "Slack", desc: "Post enrollment and completion events to a channel.", tag: "Communication" },
  { key: "zapier", name: "Zapier", desc: "Trigger zaps on enrollments, completions, certificates.", tag: "Automation" },
  { key: "scorm", name: "SCORM import", desc: "Import SCORM 1.2/2004 packages as lessons.", tag: "Content" },
  { key: "lti", name: "LTI 1.3", desc: "Embed courses in external LMS platforms.", tag: "Content" },
  { key: "webhooks", name: "Webhooks", desc: "Outbound HTTPS callbacks for key events.", tag: "Developer" },
  { key: "sso", name: "SSO / SAML", desc: "Enterprise single sign-on for learners.", tag: "Auth" },
];

export default function IntegrationsPage() {
  const q = useQuery<Record<string, unknown>>({
    queryKey: qk.settings,
    queryFn: () => api("/api/admin/settings"),
  });
  // Flag map lives in the settings bag under `integrations` — toggles persist.
  const saved = (q.data?.integrations ?? {}) as Record<string, boolean>;

  const save = useApiMutation({
    mutationFn: (next: Record<string, boolean>) =>
      api("/api/admin/settings", { method: "PUT", body: JSON.stringify({ integrations: next }) }),
    invalidate: [qk.settings],
    // No successToast — the switch itself is the confirmation; errors still toast.
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Integrations" description="Connect the LMS with external services" />
      {q.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {INTEGRATIONS.map((i) => <Skeleton key={i.key} className="h-28" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {INTEGRATIONS.map((i) => (
            <Card key={i.key}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">{i.name}</CardTitle>
                <Badge variant="secondary">{i.tag}</Badge>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{i.desc}</p>
                <Switch
                  checked={!!saved[i.key]}
                  disabled={save.isPending}
                  onCheckedChange={(v) => save.mutate({ ...saved, [i.key]: v })}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
