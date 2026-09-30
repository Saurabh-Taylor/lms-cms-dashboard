import { NextResponse, type NextRequest } from "next/server";

/**
 * CSRF guard for the API surface — mutating requests must be same-origin.
 * Browser cross-site posts are rejected via `sec-fetch-site: cross-site`;
 * when an Origin header is present it must match the request's Host header.
 * Non-browser clients carry no fetch metadata and are unaffected — this
 * defends the browser trust boundary only.
 */
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const forbidden = () =>
  NextResponse.json({ error: { message: "Forbidden" } }, { status: 403 });

export function proxy(req: NextRequest) {
  if (!MUTATING.has(req.method)) return NextResponse.next();

  if (req.headers.get("sec-fetch-site") === "cross-site") return forbidden();

  // nextUrl.host is the server's canonical name, not the request host — in
  // prod the public Host is the domain while the container sees its own name.
  const host = req.headers.get("host") ?? req.nextUrl.host;
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== host) return forbidden();
    } catch {
      return forbidden();
    }
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
