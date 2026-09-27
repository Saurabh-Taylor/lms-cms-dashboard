import { cookies } from "next/headers";
import { ApiError } from "@/lib/api-client";

/**
 * Centralized server-side client for the NestJS API. The browser never talks
 * to the backend directly — route handlers and RSC go through this so cookie
 * forwarding, origin/CSRF headers, and error normalization live in one place.
 *
 * Env: API_URL (backend origin), APP_ORIGIN (this app's public origin, sent as
 * `origin` so Better Auth CSRF checks pass on server-to-server calls).
 */
const API_URL = process.env.API_URL ?? "http://localhost:4000";
const APP_ORIGIN = process.env.APP_ORIGIN ?? "http://localhost:3000";

async function serverHeaders(extra?: HeadersInit): Promise<Headers> {
  const headers = new Headers(extra);
  const store = await cookies();
  const cookie = store.toString();
  if (cookie && !headers.has("cookie")) headers.set("cookie", cookie);
  if (!headers.has("origin")) headers.set("origin", APP_ORIGIN);
  if (!headers.has("x-request-id")) headers.set("x-request-id", crypto.randomUUID());
  return headers;
}

/** Raw passthrough — for auth calls whose Set-Cookie must reach the browser. */
export async function apiServerRaw(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: await serverHeaders(init?.headers),
    cache: "no-store",
  });
}

/** Typed JSON call — throws ApiError with the backend's { error.message }. */
export async function apiServer<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiServerRaw(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error?.message ?? res.statusText);
  }
  return res.json();
}

/**
 * Headers that preserve the real client identity on proxied auth calls —
 * Better Auth rate-limits sign-in by IP and records the user agent in the
 * session, so without these every user would share the Next server's identity.
 */
export function forwardClientHeaders(req: Request): HeadersInit {
  return {
    "x-forwarded-for": req.headers.get("x-forwarded-for") ?? "",
    "user-agent": req.headers.get("user-agent") ?? "",
  };
}

/** Appends every Set-Cookie from an API response onto a Next response. */
export function forwardSetCookies(from: Response, to: Response): Response {
  for (const c of from.headers.getSetCookie()) to.headers.append("set-cookie", c);
  return to;
}
