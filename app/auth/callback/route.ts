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
  const next = sanitizeNextPath(queryNext ?? (await getAuthNextCookie()));

  const loginUrl = new URL("/login", origin);

  if (code) {
    const supabase = await createClient();

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        const response = NextResponse.redirect(`${origin}${next}`);
        response.cookies.set(AUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
        return response;
      }

      console.error("Auth callback exchange failed:", error.message);
      loginUrl.searchParams.set("error", "auth_callback_error");
    } catch (err) {
      console.error("Auth callback exception:", err instanceof Error ? err.message : err);
      loginUrl.searchParams.set("error", "auth_callback_error");
    }

    return NextResponse.redirect(loginUrl);
  }

  const errorDescription = searchParams.get("error_description");
  const errorParam = searchParams.get("error");
  if (errorDescription || errorParam) {
    console.error("OAuth provider callback error:", errorParam ?? errorDescription);
    loginUrl.searchParams.set("error", "auth_callback_error");
    return NextResponse.redirect(loginUrl);
  }

  loginUrl.searchParams.set("error", "auth_callback_error");
  return NextResponse.redirect(loginUrl);
}
