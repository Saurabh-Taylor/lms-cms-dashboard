import { redirect } from "next/navigation";
import { getCurrentUser, homeForRole } from "@/lib/me";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = { title: "Set password · Microshala" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(homeForRole(user.role));
  const { token } = await searchParams;
  return <ResetPasswordForm token={token ?? ""} />;
}
