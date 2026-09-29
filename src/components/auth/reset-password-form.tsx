"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ newPassword: password, token }),
      });
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setError((err as Error).message || "This link is invalid or has expired.");
      setPending(false);
    }
  };

  return (
    <div>
      <h1 className="text-(length:--fs-page-title) leading-7 font-semibold tracking-tight">
        Set your password
      </h1>
      {!token ? (
        <p className="mt-4 text-(length:--fs-page-desc) text-muted-foreground">
          This link is missing its token.{" "}
          <Link href="/forgot-password" className="font-medium text-foreground underline">
            Request a new one
          </Link>
          .
        </p>
      ) : done ? (
        <p className="mt-4 text-(length:--fs-page-desc) text-muted-foreground">
          Password set — taking you to sign in…
        </p>
      ) : (
        <>
          <p className="mt-1 text-(length:--fs-page-desc) text-muted-foreground">
            Choose a password for your account.
          </p>
          <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password" name="password" type="password" autoComplete="new-password"
                autoFocus required minLength={8}
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm" name="confirm" type="password" autoComplete="new-password" required
                value={confirm} onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-(length:--fs-meta) leading-4 text-destructive animate-in fade-in duration-(--duration-fast)">
                {error}
              </p>
            )}
            <Button type="submit" className="mt-1 w-full" disabled={pending}>
              {pending ? "Saving…" : "Set password"}
            </Button>
          </form>
          <p className="mt-4 text-center text-(length:--fs-meta) leading-4 text-muted-foreground">
            Link expired?{" "}
            <Link href="/forgot-password" className="font-medium text-foreground underline-offset-4 hover:underline">
              Request a new one
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
