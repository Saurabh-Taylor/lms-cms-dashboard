"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { CopyIcon, KeyRoundIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import { useApiMutation } from "@/hooks/use-api-mutation";
import type { SsoProvider } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";


export function SsoProviders() {
  const { data, isLoading } = useQuery<{ providers: SsoProvider[] }>({
    queryKey: qk.ssoProviders,
    queryFn: () => api("/api/admin/sso-providers"),
  });
  const [addOpen, setAddOpen] = React.useState(false);
  const [setupTarget, setSetupTarget] = React.useState<SsoProvider | null>(null);
  const [editTarget, setEditTarget] = React.useState<SsoProvider | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<SsoProvider | null>(null);
  const providers = data?.providers ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Identity providers</CardTitle>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <PlusIcon className="size-4" /> Add provider
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <Skeleton className="m-4 h-32" />
        ) : providers.length === 0 ? (
          <p className="px-4 pb-5 text-(length:--fs-meta) leading-4 text-muted-foreground">
            No providers yet — learners at a registered domain can sign in through their company
            identity provider (Okta, Entra, Google…).
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-(length:--fs-meta) leading-4 text-muted-foreground">
                <th className="px-4 py-2 font-medium">Provider</th>
                <th className="px-4 py-2 font-medium">Domain</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Issuer</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.providerId} className="border-b last:border-0">
                  <td className="px-4 py-2 font-mono text-xs">{p.providerId}</td>
                  <td className="px-4 py-2">{p.domain}</td>
                  <td className="px-4 py-2">
                    <Badge variant="outline">{p.type.toUpperCase()}</Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{p.issuer}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setSetupTarget(p)} aria-label={`Setup URLs for ${p.providerId}`}>
                        <KeyRoundIcon className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditTarget(p)} aria-label={`Edit ${p.providerId}`}>
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(p)} aria-label={`Delete ${p.providerId}`}>
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>

      {addOpen && <AddProviderDialog onClose={() => setAddOpen(false)} />}
      {setupTarget && <SetupDialog provider={setupTarget} onClose={() => setSetupTarget(null)} />}
      {editTarget && <EditDialog provider={editTarget} onClose={() => setEditTarget(null)} />}
      <DeleteDialog provider={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </Card>
  );
}

function CopyableUrl({ label, url }: { label: string; url?: string }) {
  if (!url) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-(length:--fs-meta) leading-4 text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-sm bg-muted px-2 py-1 font-mono text-xs">{url}</code>
        <Button
          size="icon" variant="ghost" className="size-7 shrink-0"
          aria-label={`Copy ${label}`}
          onClick={() => void navigator.clipboard.writeText(url)}
        >
          <CopyIcon className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function IdpUrlBlock({ provider }: { provider: SsoProvider }) {
  return (
    <div className="rounded-md border border-dashed p-3">
      <p className="mb-2 text-(length:--fs-meta) leading-4 font-medium text-muted-foreground">
        Give these to the customer&apos;s IdP admin
      </p>
      <div className="flex flex-col gap-2">
        {provider.type === "saml" ? (
          <>
            <CopyableUrl label="ACS URL" url={provider.acsUrl} />
            <CopyableUrl label="SP metadata" url={provider.spMetadataUrl} />
          </>
        ) : (
          <CopyableUrl label="Redirect URI" url={provider.oidcCallbackUrl} />
        )}
      </div>
    </div>
  );
}

function AddProviderDialog({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = React.useState<"oidc" | "saml">("oidc");
  const [providerId, setProviderId] = React.useState("");
  const [domain, setDomain] = React.useState("");
  const [issuer, setIssuer] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [clientSecret, setClientSecret] = React.useState("");
  const [idpEntityId, setIdpEntityId] = React.useState("");
  const [entryPoint, setEntryPoint] = React.useState("");
  const [cert, setCert] = React.useState("");

  const valid =
    providerId.trim() !== "" &&
    domain.trim() !== "" &&
    (kind === "oidc"
      ? issuer.trim() !== "" && clientId.trim() !== "" && clientSecret !== ""
      : idpEntityId.trim() !== "" && entryPoint.trim() !== "" && cert.trim() !== "");

  const save = useApiMutation({
    mutationFn: () =>
      api("/api/admin/sso-providers", {
        method: "POST",
        body: JSON.stringify(
          kind === "oidc"
            ? { providerId, domain, issuer, oidcConfig: { clientId, clientSecret } }
            : {
                providerId,
                domain,
                // Top-level `issuer` is omitted — the backend derives the SP
                // entityID from our SP metadata URL. The IdP entity ID goes
                // inside samlConfig.idpMetadata (required by the plugin).
                samlConfig: { entryPoint, cert, idpMetadata: { entityID: idpEntityId } },
              },
        ),
      }),
    invalidate: [qk.ssoProviders],
    successToast: "Provider registered",
    onSuccess: onClose,
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add identity provider</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-4">
          <Tabs value={kind} onValueChange={(v) => setKind(v as "oidc" | "saml")}>
            <TabsList>
              <TabsTrigger value="oidc">OIDC</TabsTrigger>
              <TabsTrigger value="saml">SAML 2.0</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Provider ID</Label>
              <Input value={providerId} onChange={(e) => setProviderId(e.target.value)} placeholder="acme-okta" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Email domain</Label>
              <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="acme.com" />
            </div>
          </div>
          {kind === "oidc" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Issuer URL</Label>
                <Input value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="https://acme.okta.com" />
                <p className="text-(length:--fs-meta) leading-4 text-muted-foreground">
                  Endpoints are filled automatically from the IdP&apos;s discovery document.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Client ID</Label>
                  <Input value={clientId} onChange={(e) => setClientId(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Client secret</Label>
                  <Input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>IdP entity ID</Label>
                <Input value={idpEntityId} onChange={(e) => setIdpEntityId(e.target.value)} placeholder="http://www.okta.com/exk…" />
                <p className="text-(length:--fs-meta) leading-4 text-muted-foreground">
                  From the IdP&apos;s metadata — Okta/Entra issue these as URLs.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>IdP SSO URL (entry point)</Label>
                <Input value={entryPoint} onChange={(e) => setEntryPoint(e.target.value)} placeholder="https://idp.acme.com/sso" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>IdP signing certificate (PEM)</Label>
                <Textarea rows={4} value={cert} onChange={(e) => setCert(e.target.value)} placeholder="-----BEGIN CERTIFICATE-----" />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button size="sm" onClick={() => save.mutate()} disabled={!valid || save.isPending}>
            {save.isPending ? "Registering…" : "Register provider"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SetupDialog({ provider, onClose }: { provider: SsoProvider; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{provider.providerId} — IdP setup</DialogTitle></DialogHeader>
        <IdpUrlBlock provider={provider} />
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ provider, onClose }: { provider: SsoProvider; onClose: () => void }) {
  const [domain, setDomain] = React.useState(provider.domain);
  const [issuer, setIssuer] = React.useState(provider.issuer);

  const save = useApiMutation({
    mutationFn: () =>
      api(`/api/admin/sso-providers/${provider.providerId}`, {
        method: "PATCH",
        body: JSON.stringify({ domain, issuer }),
      }),
    invalidate: [qk.ssoProviders],
    successToast: "Provider updated",
    onSuccess: onClose,
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit {provider.providerId}</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Email domain</Label>
            <Input value={domain} onChange={(e) => setDomain(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Issuer</Label>
            <Input value={issuer} onChange={(e) => setIssuer(e.target.value)} />
          </div>
          <IdpUrlBlock provider={provider} />
        </div>
        <DialogFooter>
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ provider, onClose }: { provider: SsoProvider | null; onClose: () => void }) {
  const del = useApiMutation({
    mutationFn: () => api(`/api/admin/sso-providers/${provider?.providerId}`, { method: "DELETE" }),
    invalidate: [qk.ssoProviders],
    successToast: "Provider deleted",
    onSuccess: onClose,
  });
  return (
    <ConfirmDialog
      open={!!provider}
      onOpenChange={(v) => !v && onClose()}
      title={`Delete ${provider?.providerId}?`}
      description="Users at this domain can no longer sign in via SSO — existing sessions stay valid until expiry. This cannot be undone."
      confirmLabel="Delete provider"
      destructive
      loading={del.isPending}
      onConfirm={() => del.mutate()}
    />
  );
}
