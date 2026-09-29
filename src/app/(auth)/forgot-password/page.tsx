import { redirect } from "next/navigation";
import { getCurrentUser, homeForRole } from "@/lib/me";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = { title: "Forgot password · LearnHub" };

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeForRole(user.role));
  return <ForgotPasswordForm />;
}
