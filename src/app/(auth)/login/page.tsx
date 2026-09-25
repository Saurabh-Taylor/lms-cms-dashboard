import { redirect } from "next/navigation";
import { getCurrentUser, homeForRole } from "@/lib/me";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Sign in · LearnHub" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // real validation (not just cookie presence) — a stale/forged cookie must
  // render this page so it can be overwritten, not redirect-loop
  const user = await getCurrentUser();
  if (user) redirect(homeForRole(user.role));
  const { next } = await searchParams;
  return <LoginForm next={next?.startsWith("/") && !next.startsWith("//") ? next : undefined} />;
}
