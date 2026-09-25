"use client";

import * as React from "react";
import Link from "next/link";
import { CircleCheckIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    if (!name.trim() || !email.trim()) {
      setError("Enter your name and work email.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      await api("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      setDone(true);
    } catch (err) {
      setError((err as Error).message || "Couldn't submit your request. Try again.");
    } finally {
      setPending(false);
    }
  };

  if (done) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-1 duration-(--duration-normal)">
        <span className="grid size-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CircleCheckIcon className="size-5" />
        </span>
        <h1 className="mt-4 text-(length:--fs-page-title) leading-7 font-semibold tracking-tight">
          Request received
        </h1>
        <p className="mt-1.5 text-(length:--fs-page-desc) text-muted-foreground">
          CMS access is provisioned by an administrator. You&apos;ll be able to sign
          in once your account is granted access.
        </p>
        <Button variant="outline" className="mt-6 w-full" nativeButton={false} render={<Link href="/login" />}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-(length:--fs-page-title) leading-7 font-semibold tracking-tight">
        Create your account
      </h1>
      <p className="mt-1 text-(length:--fs-page-desc) text-muted-foreground">
        Request access to LearnHub CMS — an administrator enables sign-in.
      </p>

      <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Lovelace"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>

        {error && (
          <p role="alert" className="text-(length:--fs-meta) leading-4 text-destructive animate-in fade-in duration-(--duration-fast)">
            {error}
          </p>
        )}

        <Button type="submit" className="mt-1 w-full" disabled={pending}>
          {pending ? "Requesting…" : "Request access"}
        </Button>
      </form>

      <p className="mt-6 text-center text-(length:--fs-meta) leading-4 text-muted-foreground">
        Already have access?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 transition-colors duration-(--duration-fast) hover:text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
