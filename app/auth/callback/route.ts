import { NextResponse } from "next/server";

import {
  AUTH_NEXT_COOKIE,
  getAuthNextCookie,
  sanitizeNextPath,
} from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const queryNext = searchParams.get("next");
  const next = sanitizeNextPath(queryNext ?? getAuthNextCookie());

  const loginUrl = new URL("/login", origin);

  if (code) {
    const supabase = createClient();

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        const response = NextResponse.redirect(`${origin}${next}`);
        response.cookies.set(AUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
        return response;
      }

      loginUrl.searchParams.set("error", error.message);
    } catch (err) {
      loginUrl.searchParams.set(
        "error",
        err instanceof Error
          ? err.message
          : "Unable to complete Google sign in",
      );
    }

    return NextResponse.redirect(loginUrl);
  }

  const errorDescription = searchParams.get("error_description");
  const errorParam = searchParams.get("error");
  if (errorDescription || errorParam) {
    loginUrl.searchParams.set(
      "error",
      errorDescription ?? errorParam ?? "OAuth callback error",
    );
    return NextResponse.redirect(loginUrl);
  }

  loginUrl.searchParams.set("error", "auth_callback_error");
  return NextResponse.redirect(loginUrl);
}
