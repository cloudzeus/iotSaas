import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/api/auth", "/api/health", "/api/cron", "/api/milesight/webhook", "/api/viva/webhook"];

/**
 * Build a URL rooted at the *public* origin, not the internal Node origin.
 * Coolify's Traefik forwards as http://localhost:3000 internally, so
 * `new URL(path, req.url)` would redirect users there. We reconstruct from
 * X-Forwarded-Host / X-Forwarded-Proto, falling back to NEXTAUTH_URL.
 */
function publicURL(req: NextRequest, path: string): URL {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? req.headers.get("host");
  const proto = forwardedProto ?? (host?.startsWith("localhost") ? "http" : "https");
  const base = host
    ? `${proto}://${host}`
    : (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin);
  return new URL(path, base);
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (publicPaths.some((p) => pathname.startsWith(p))) return;

  if (!req.auth) {
    const loginUrl = publicURL(req, "/login");
    const currentPath = pathname + (req.nextUrl.search || "");
    loginUrl.searchParams.set("callbackUrl", currentPath);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin")) {
    const role = req.auth.user.role;
    if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
      return NextResponse.redirect(publicURL(req, "/dashboard"));
    }
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next|_vercel|.*\\..*).*)"],
};
