import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, ROLE_COOKIE } from "@/lib/session";

/**
 * Edge gate — cookie-presence for pages (layouts do the real validation), plus
 * a role cookie check for APIs so a valid learner session can't reach admin
 * data. The role cookie is unsigned (demo seam); routes still verify the
 * session against the DB where it matters.
 */
export function middleware(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get(ADMIN_COOKIE)?.value);
  const role = req.cookies.get(ROLE_COOKIE)?.value;
  const { pathname } = req.nextUrl;

  const isApi = pathname.startsWith("/api/");
  const wantsAdmin = pathname.startsWith("/api/admin") || pathname.startsWith("/admin");
  const wantsLearner = pathname.startsWith("/api/learner") || pathname.startsWith("/learner");
  if (!wantsAdmin && !wantsLearner) return NextResponse.next();

  if (!hasSession) {
    if (isApi)
      return Response.json({ error: { message: "Unauthorized" } }, { status: 401 });
    const url = new URL("/login", req.url);
    const portal = wantsAdmin ? "/admin" : "/learner";
    if (pathname !== portal) url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // role mismatch → APIs get 403, pages redirect to the right portal home.
  // (missing/legacy role cookie falls through: page layouts re-validate anyway)
  const wrongForAdmin = wantsAdmin && role && role !== "admin";
  const wrongForLearner = wantsLearner && role === "admin";
  if (wrongForAdmin || wrongForLearner) {
    if (isApi)
      return Response.json({ error: { message: "Forbidden" } }, { status: 403 });
    const url = new URL(role === "admin" ? "/admin/dashboard" : "/learner/dashboard", req.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/learner/:path*", "/api/learner/:path*"],
};
