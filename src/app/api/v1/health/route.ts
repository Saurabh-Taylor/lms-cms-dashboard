import { apiServerRaw } from "@/lib/api-server";
import { fail } from "@/lib/api/helpers";

/**
 * Public health check — lets https://<domain>/api/v1/health reach the API's
 * readiness probe through the BFF (the API itself has no public surface).
 * Readiness verifies the DB too, so this proves the whole chain.
 */
export async function GET() {
  try {
    const res = await apiServerRaw("/health/ready");
    return new Response(res.body, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return fail(503, "Service unavailable");
  }
}
