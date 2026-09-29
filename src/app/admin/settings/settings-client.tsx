"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckIcon, MinusIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { TypographyCard } from "@/components/shared/typography-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EmailForm } from "./email-form";

interface General {
  platformName: string; description: string; timezone: string;
  defaultLocale: string; supportEmail: string;
}
interface Rules {
  selfEnrollment: boolean; requireApproval: boolean;
  enrollmentExpirationDays: number; autoCertificate: boolean;
}

export function SettingsClient() {
  return (
    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="enrollment">Enrollment rules</TabsTrigger>
        <TabsTrigger value="email">Email</TabsTrigger>
        <TabsTrigger value="roles">Roles & permissions</TabsTrigger>
      </TabsList>
      <TabsContent value="general" className="mt-4 flex max-w-2xl flex-col gap-4">
        <GeneralForm />
        <TypographyCard description="Text sizing for your admin account only — other administrators keep their own preferences." />
      </TabsContent>
      <TabsContent value="enrollment" className="mt-4"><RulesForm /></TabsContent>
      <TabsContent value="email" className="mt-4"><EmailForm /></TabsContent>
      <TabsContent value="roles" className="mt-4"><RolesMatrix /></TabsContent>
    </Tabs>
  );
}

function useSettings() {
  return useQuery<Record<string, unknown>>({
    queryKey: ["/api/admin/settings"],
    queryFn: () => api("/api/admin/settings"),
  });
}

function GeneralForm() {
  const q = useSettings();
  // Mount the form only once data arrives — useState initializers must see the
  // persisted values, not a loading-time snapshot.
  if (q.isLoading) return <Skeleton className="h-80 max-w-2xl" />;
  return <GeneralFormFields saved={(q.data?.general ?? {}) as Partial<General>} />;
}

function GeneralFormFields({ saved }: { saved: Partial<General> }) {
  const defaults: General = {
    platformName: "Acme LMS", description: "", timezone: "UTC",
    defaultLocale: "en", supportEmail: "",
    ...saved,
  };
  const [f, setF] = React.useState<General>(defaults);
  const dirty = JSON.stringify(f) !== JSON.stringify(defaults);

  const save = useApiMutation({
    mutationFn: () => api("/api/admin/settings", { method: "PUT", body: JSON.stringify({ general: f }) }),
    invalidate: [["/api/admin/settings"]],
    successToast: "Settings saved",
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-medium">Platform</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Platform name</Label>
          <Input value={f.platformName} onChange={(e) => setF({ ...f, platformName: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Description</Label>
          <Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Timezone</Label>
            <Select value={f.timezone} onValueChange={(v) => setF({ ...f, timezone: String(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Asia/Kolkata"].map((z) => (
                  <SelectItem key={z} value={z}>{z}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Default language</Label>
            <Select value={f.defaultLocale} onValueChange={(v) => setF({ ...f, defaultLocale: String(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="hi">Hindi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Support email</Label>
          <Input type="email" value={f.supportEmail} onChange={(e) => setF({ ...f, supportEmail: e.target.value })} />
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RulesForm() {
  const q = useSettings();
  if (q.isLoading) return <Skeleton className="h-64 max-w-2xl" />;
  return <RulesFormFields saved={(q.data?.enrollmentRules ?? {}) as Partial<Rules>} />;
}

function RulesFormFields({ saved }: { saved: Partial<Rules> }) {
  const [f, setF] = React.useState<Rules>({
    selfEnrollment: true, requireApproval: false,
    enrollmentExpirationDays: 0, autoCertificate: true,
    ...saved,
  });
  const save = useApiMutation({
    mutationFn: () => api("/api/admin/settings", { method: "PUT", body: JSON.stringify({ enrollmentRules: f }) }),
    invalidate: [["/api/admin/settings"]],
    successToast: "Rules saved",
  });

  const rows: { key: keyof Rules; label: string; desc: string; kind: "switch" | "number" }[] = [
    { key: "selfEnrollment", label: "Self enrollment", desc: "Learners can enroll into published courses themselves", kind: "switch" },
    { key: "requireApproval", label: "Require approval", desc: "Enrollment requests must be approved by an admin", kind: "switch" },
    { key: "autoCertificate", label: "Auto-issue certificates", desc: "Issue a certificate automatically on course completion", kind: "switch" },
    { key: "enrollmentExpirationDays", label: "Enrollment expiration (days)", desc: "0 = enrollments never expire", kind: "number" },
  ];
  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle className="text-sm font-medium">Enrollment defaults</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-1">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-6 border-b py-3 last:border-0">
            <div>
              <p className="text-sm font-medium">{r.label}</p>
              <p className="text-(length:--fs-meta) leading-4 text-muted-foreground">{r.desc}</p>
            </div>
            {r.kind === "switch" ? (
              <Switch checked={f[r.key] as boolean} onCheckedChange={(v) => setF({ ...f, [r.key]: v })} />
            ) : (
              <Input type="number" min={0} className="w-24" value={f.enrollmentExpirationDays}
                onChange={(e) => setF({ ...f, enrollmentExpirationDays: Number(e.target.value) })} />
            )}
          </div>
        ))}
        <div className="flex justify-end pt-3">
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save rules"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface RbacRole { key: string; label: string; permissions: string[] }

function RolesMatrix() {
  // The matrix is served from the backend's enforced RBAC tables — never a local copy.
  const { data, isLoading } = useQuery<{ roles: RbacRole[] }>({
    queryKey: ["/api/admin/rbac"],
    queryFn: () => api("/api/admin/rbac"),
  });
  const roles = React.useMemo(() => data?.roles ?? [], [data]);
  const grouped = React.useMemo(() => {
    const m = new Map<string, string[]>();
    for (const p of [...new Set(roles.flatMap((r) => r.permissions))].sort()) {
      const [res] = p.split(":");
      m.set(res, [...(m.get(res) ?? []), p]);
    }
    return [...m.entries()];
  }, [roles]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-medium">Permission matrix</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-(length:--fs-meta) leading-4 text-muted-foreground">
              <th className="px-4 py-2 font-medium">Permission</th>
              {roles.map((r) => <th key={r.key} className="px-4 py-2 text-center font-medium">{r.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {grouped.map(([res, perms]) => (
              <React.Fragment key={res}>
                <tr className="bg-muted/50">
                  <td colSpan={roles.length + 1} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{res}</td>
                </tr>
                {perms.map((p) => (
                  <tr key={p} className="border-b last:border-0">
                    <td className="px-4 py-2 pl-8 font-mono text-xs">{p}</td>
                    {roles.map((r) => (
                      <td key={r.key} className="px-4 py-2 text-center">
                        {r.permissions.includes(p)
                          ? <CheckIcon className="mx-auto size-4 text-emerald-600" />
                          : <MinusIcon className="mx-auto size-4 text-muted-foreground/30" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
