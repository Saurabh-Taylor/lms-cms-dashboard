"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useMe } from "@/hooks/use-me";
import type { SessionUser } from "@/lib/me";
import { initials } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export function ProfileCard() {
  const router = useRouter();
  const { data: me } = useMe();

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-medium">Profile</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!me ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <ProfileFields key={me.name} me={me} onSaved={() => router.refresh()} />
        )}
      </CardContent>
    </Card>
  );
}

function ProfileFields({ me, onSaved }: { me: SessionUser; onSaved: () => void }) {
  const [name, setName] = React.useState(me.name);
  const dirty = name.trim() !== me.name;

  const save = useApiMutation({
    mutationFn: () =>
      api("/api/admin/me", { method: "PATCH", body: JSON.stringify({ name: name.trim() }) }),
    successToast: "Profile updated",
    invalidate: [qk.me],
    onSuccess: onSaved,
    errorToast: false,
    onError: (e) => toast.error("Couldn't save profile", { description: e.message }),
  });

  return (
    <>
      <div className="flex items-center gap-3">
        <Avatar className="size-10">
          <AvatarFallback>{initials(me.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium">{me.name}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">{me.appRole.replace("_", " ")}</Badge>
            <span className="text-(length:--fs-meta) leading-4 text-muted-foreground">{me.email}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="admin-name">Display name</Label>
        <Input id="admin-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="admin-email">Email</Label>
        <Input id="admin-email" value={me.email} disabled />
        <p className="text-(length:--fs-meta) leading-4 text-muted-foreground">
          Email is managed by your administrator.
        </p>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => save.mutate()} disabled={!dirty || !name.trim() || save.isPending}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </>
  );
}
