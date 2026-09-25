"use client";

import * as React from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const INTEGRATIONS = [
  { name: "Slack", desc: "Post enrollment and completion events to a channel.", tag: "Communication" },
  { name: "Zapier", desc: "Trigger zaps on enrollments, completions, certificates.", tag: "Automation" },
  { name: "SCORM import", desc: "Import SCORM 1.2/2004 packages as lessons.", tag: "Content" },
  { name: "LTI 1.3", desc: "Embed courses in external LMS platforms.", tag: "Content" },
  { name: "Webhooks", desc: "Outbound HTTPS callbacks for key events.", tag: "Developer" },
  { name: "SSO / SAML", desc: "Enterprise single sign-on for learners.", tag: "Auth" },
];

export default function IntegrationsPage() {
  const [on, setOn] = React.useState<Record<string, boolean>>({});
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Integrations" description="Connect the LMS with external services" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {INTEGRATIONS.map((i) => (
          <Card key={i.name}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">{i.name}</CardTitle>
              <Badge variant="secondary">{i.tag}</Badge>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{i.desc}</p>
              <Switch
                checked={!!on[i.name]}
                onCheckedChange={(v) => {
                  setOn((s) => ({ ...s, [i.name]: v }));
                  toast(v ? `${i.name} enabled` : `${i.name} disabled`, { description: "Configuration is required before this takes effect." });
                }}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
