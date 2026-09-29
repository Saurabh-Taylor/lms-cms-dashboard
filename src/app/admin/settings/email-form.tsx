"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

interface SmtpConfig {
  host: string; port: number; username: string; encryption: "ssl" | "starttls" | "none";
  fromAddress: string; fromName: string; enabled: boolean; passwordSet: boolean;
}

function useSmtp() {
  return useQuery<SmtpConfig | null>({
    queryKey: ["/api/admin/settings/smtp"],
    queryFn: () => api("/api/admin/settings/smtp"),
  });
}

export function EmailForm() {
  const q = useSmtp();
  // Mount the form only once data arrives — useState initializers must see the
  // persisted values, not a loading-time snapshot.
  if (q.isLoading) return <Skeleton className="h-80 max-w-2xl" />;
  return <EmailFormFields saved={q.data ?? null} />;
}

function EmailFormFields({ saved }: { saved: SmtpConfig | null }) {
  const defaults = {
    host: saved?.host ?? "", port: saved?.port ?? 465,
    username: saved?.username ?? "", encryption: saved?.encryption ?? "ssl" as const,
    fromAddress: saved?.fromAddress ?? "", fromName: saved?.fromName ?? "",
    enabled: saved?.enabled ?? false,
  };
  const [f, setF] = React.useState(defaults);
  const [password, setPassword] = React.useState("");
  const [passwordSet, setPasswordSet] = React.useState(saved?.passwordSet ?? false);
  const [testTo, setTestTo] = React.useState("");
  const [testResult, setTestResult] = React.useState<{ ok: boolean; msg: string } | null>(null);
  const dirty = JSON.stringify(f) !== JSON.stringify(defaults) || password !== "";

  const save = useApiMutation({
    mutationFn: () =>
      api<SmtpConfig>("/api/admin/settings/smtp", {
        method: "PUT",
        body: JSON.stringify({ ...f, ...(password ? { password } : {}) }),
      }),
    invalidate: [["/api/admin/settings/smtp"]],
    successToast: "Email settings saved",
    onSuccess: (r) => { setPasswordSet(r.passwordSet); setPassword(""); },
  });

  const test = useApiMutation({
    mutationFn: () =>
      api("/api/admin/settings/smtp/test", { method: "POST", body: JSON.stringify({ to: testTo }) }),
    errorToast: false,
    onSuccess: () => setTestResult({ ok: true, msg: `Test email sent to ${testTo}` }),
    onError: (e) => setTestResult({ ok: false, msg: (e as Error).message }),
  });

  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle className="text-sm font-medium">SMTP delivery</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>SMTP host</Label>
            <Input value={f.host} onChange={(e) => setF({ ...f, host: e.target.value })} placeholder="smtp.hostinger.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Port</Label>
            <Input type="number" min={1} max={65535} value={f.port} onChange={(e) => setF({ ...f, port: Number(e.target.value) })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Encryption</Label>
            <Select
              value={f.encryption}
              onValueChange={(v) => setF({ ...f, encryption: v as SmtpConfig["encryption"] })}
              items={{ ssl: "SSL/TLS", starttls: "STARTTLS", none: "None (dev only)" }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ssl">SSL/TLS</SelectItem>
                <SelectItem value="starttls">STARTTLS</SelectItem>
                <SelectItem value="none">None (dev only)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Username</Label>
            <Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} placeholder="no-reply@yourdomain.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Password</Label>
            <Input
              type="password" autoComplete="new-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={passwordSet ? "••••••• — leave blank to keep" : "Not set"}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>From address</Label>
            <Input type="email" value={f.fromAddress} onChange={(e) => setF({ ...f, fromAddress: e.target.value })} placeholder="no-reply@yourdomain.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>From name</Label>
            <Input value={f.fromName} onChange={(e) => setF({ ...f, fromName: e.target.value })} placeholder="Microshala" />
          </div>
        </div>
        <div className="flex items-center justify-between border-t pt-3">
          <div>
            <p className="text-sm font-medium">Enable sending</p>
            <p className="text-(length:--fs-meta) leading-4 text-muted-foreground">Off = sends are skipped and logged</p>
          </div>
          <Switch checked={f.enabled} onCheckedChange={(v) => setF({ ...f, enabled: v })} />
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
        <div className="flex items-end gap-2 border-t pt-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label>Send a test email</Label>
            <Input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" />
          </div>
          <Button size="sm" variant="outline" onClick={() => { setTestResult(null); test.mutate(); }} disabled={!testTo.trim() || test.isPending}>
            {test.isPending ? "Sending…" : "Send test"}
          </Button>
        </div>
        {testResult && (
          <p role="alert" className={`text-(length:--fs-meta) leading-4 ${testResult.ok ? "text-emerald-600" : "text-destructive"}`}>
            {testResult.msg}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
