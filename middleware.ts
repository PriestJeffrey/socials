import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = process.env.COOKIE_NAME ?? "pulseboard_session";

const PROTECTED = [
  "/overview",
  "/settings",
  "/analytics",
  "/create",
  "/calendar",
  "/competitors",
  "/approvals",
  "/x",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(COOKIE_NAME)?.value);

  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  // Cookie presence only — real session validation happens in app/(app)/layout.
  // Do NOT redirect /login|/signup based on cookie alone (expired/forged → loop).
  if (isProtected && !hasSessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/overview/:path*",
    "/settings/:path*",
    "/analytics/:path*",
    "/create/:path*",
    "/calendar/:path*",
    "/competitors/:path*",
    "/approvals/:path*",
    "/x/:path*",
    "/login",
    "/signup",
  ],
};
