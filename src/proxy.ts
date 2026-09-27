import { NextResponse, type NextRequest } from "next/server";

/**
 * CSRF guard for the API surface — mutating requests must be same-origin.
 * Browser cross-site posts are rejected via `sec-fetch-site: cross-site`;
 * when an Origin header is present it must match the request host.
 * Non-browser clients carry no fetch metadata and are unaffected — this
 * defends the browser trust boundary only.
 */
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const forbidden = () =>
  NextResponse.json({ error: { message: "Forbidden" } }, { status: 403 });

export function proxy(req: NextRequest) {
  if (!MUTATING.has(req.method)) return NextResponse.next();

  if (req.headers.get("sec-fetch-site") === "cross-site") return forbidden();

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== req.nextUrl.host) return forbidden();
    } catch {
      return forbidden();
    }
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
