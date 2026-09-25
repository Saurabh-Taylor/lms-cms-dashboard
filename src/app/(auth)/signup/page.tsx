import { redirect } from "next/navigation";
import { getCurrentUser, homeForRole } from "@/lib/me";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata = { title: "Create account · LearnHub" };

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeForRole(user.role));
  return <SignupForm />;
}
