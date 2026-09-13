import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const protectedRoutes = ["/profile", "/teams/create", "/projects/create"];

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
    return NextResponse.next({ request });
  }

  const { supabase, response } = updateSession(request);

  if (!isProtected) return response;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
