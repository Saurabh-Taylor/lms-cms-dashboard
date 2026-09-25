"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    if (!identifier.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const res = await api<{ role: string; redirectTo: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      // honor ?next= only when it targets the signed-in role's own portal
      const portal = res.redirectTo?.split("/")[1];
      router.push(next && portal && next.startsWith(`/${portal}`) ? next : (res.redirectTo ?? "/"));
      router.refresh();
    } catch (err) {
      setError((err as Error).message || "Invalid username or password.");
      setPassword("");
      setPending(false);
      passwordRef.current?.focus();
    }
  };

  return (
    <div>
      <h1 className="text-(length:--fs-page-title) leading-7 font-semibold tracking-tight">
        Welcome back
      </h1>
      <p className="mt-1 text-(length:--fs-page-desc) text-muted-foreground">
        Sign in to continue to LearnHub CMS.
      </p>

      <form onSubmit={submit} className="mt-7 flex flex-col gap-4" noValidate={false}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="identifier">Email or username</Label>
          <Input
            id="identifier"
            name="username"
            autoComplete="username"
            autoFocus
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="admin"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              ref={passwordRef}
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="pr-9"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors duration-(--duration-fast) outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-(length:--fs-meta) leading-4 text-destructive animate-in fade-in duration-(--duration-fast)">
            {error}
          </p>
        )}

        <Button type="submit" className="mt-1 w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-(length:--fs-meta) leading-4 text-muted-foreground">
        Don&apos;t have access?{" "}
        <Link
          href="/signup"
          className="font-medium text-foreground underline-offset-4 transition-colors duration-(--duration-fast) hover:text-primary hover:underline"
        >
          Request an account
        </Link>
      </p>
    </div>
  );
}
