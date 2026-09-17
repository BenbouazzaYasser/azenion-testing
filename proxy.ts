import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { applySecurityHeaders } from "@/lib/security-headers";

// Edge session gate (defense in depth — every page also checks the session
// server-side). Fail-closed: unknown session state redirects to /login.
const protectedRoutes = [
  "/profile",
  "/teams/create",
  "/projects/create",
  "/settings",
  "/admin",
  "/chat",
  "/servers/create",
];

const AUTH_TOKEN_COOKIE_RE = /^sb-.+-auth-token$/;

export async function proxy(request: NextRequest) {
  const isProtected = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  // Skip building the Supabase client entirely for anonymous requests —
  // there are no session cookies to refresh.
  const hasSessionCookie = request.cookies
    .getAll()
    .some(({ name }) => AUTH_TOKEN_COOKIE_RE.test(name));
  if (!isProtected && !hasSessionCookie) {
    return applySecurityHeaders(NextResponse.next({ request }));
  }

  const { supabase, response } = updateSession(request);
  applySecurityHeaders(response);

  if (!isProtected) return response;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
