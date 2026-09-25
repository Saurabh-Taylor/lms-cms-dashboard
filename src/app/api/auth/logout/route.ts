import { cookies } from "next/headers";
import { ok } from "@/lib/api/helpers";
import { ADMIN_COOKIE, ROLE_COOKIE } from "@/lib/session";

export async function POST() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  store.delete(ROLE_COOKIE);
  return ok({ signedOut: true });
}
