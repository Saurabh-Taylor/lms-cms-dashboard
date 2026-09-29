"use client";

import * as React from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending || !email.trim()) return;
    setError(null);
    setPending(true);
    try {
      await api("/api/auth/request-password-reset", {
        method: "POST",
        // callbackURL the backend bounces the emailed link to (?token=…)
        body: JSON.stringify({
          email: email.trim(),
          redirectTo: `${window.location.origin}/reset-password`,
        }),
      });
      setDone(true);
    } catch (err) {
      setError((err as Error).message || "Something went wrong.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <h1 className="text-(length:--fs-page-title) leading-7 font-semibold tracking-tight">
        Forgot password
      </h1>
      {done ? (
        <p className="mt-4 text-(length:--fs-page-desc) text-muted-foreground">
          If an account exists for {email}, a reset link is on its way. Check
          your inbox — the link expires in an hour.
        </p>
      ) : (
        <>
          <p className="mt-1 text-(length:--fs-page-desc) text-muted-foreground">
            Enter your email and we&apos;ll send a reset link.
          </p>
          <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email" name="email" type="email" autoComplete="email" autoFocus required
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            {error && (
              <p role="alert" className="text-(length:--fs-meta) leading-4 text-destructive animate-in fade-in duration-(--duration-fast)">
                {error}
              </p>
            )}
            <Button type="submit" className="mt-1 w-full" disabled={pending}>
              {pending ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        </>
      )}
      <p className="mt-6 text-center text-(length:--fs-meta) leading-4 text-muted-foreground">
        Remembered it?{" "}
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
