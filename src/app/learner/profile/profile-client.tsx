"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { TypographyCard } from "@/components/shared/typography-card";
import { initials } from "@/lib/format";

export function ProfileClient({
  me,
}: {
  me: { name: string; email: string; role: string };
}) {
  const router = useRouter();
  const [name, setName] = React.useState(me.name);
  const dirty = name.trim() !== me.name;

  const save = useMutation({
    mutationFn: () => api("/api/learner/me", { method: "PATCH", body: JSON.stringify({ name: name.trim() }) }),
    onSuccess: () => {
      toast.success("Profile updated");
      router.refresh();
    },
    onError: (e) => toast.error("Couldn't save profile", { description: e.message }),
  });

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <PageHeader title="Profile" description="Your account and personal preferences" />

      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Account</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarFallback>{initials(me.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium">{me.name}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">{me.role}</Badge>
                <span className="text-(length:--fs-meta) leading-4 text-muted-foreground">{me.email}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={me.email} disabled />
            <p className="text-(length:--fs-meta) leading-4 text-muted-foreground">
              Email is managed by your administrator.
            </p>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => save.mutate()} disabled={!dirty || !name.trim() || save.isPending}>
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <TypographyCard description="Text sizing for your account only — other learners keep their own preferences." />
    </div>
  );
}
