import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "demo_auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always skip API routes, static assets, and the gate page — before any env check
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/gate"
  ) {
    return NextResponse.next();
  }

  // Read at invocation time, not module-load time, to avoid build-time inlining
  const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "";

  // Skip if no password configured
  if (!DEMO_PASSWORD) return NextResponse.next();

  // Check auth cookie
  const cookie = request.cookies.get(COOKIE_NAME);
  if (cookie?.value === DEMO_PASSWORD) {
    return NextResponse.next();
  }

  // Redirect to gate
  const url = request.nextUrl.clone();
  url.pathname = "/gate";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
