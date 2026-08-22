import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { updateSession } from "@/lib/supabase/middleware";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  isLocale,
  localeFromAcceptLanguage,
} from "@/i18n/config";

const protectedRoutes = ["/profile", "/teams/create", "/projects/create"];

export async function middleware(request: NextRequest) {
  const isProtected = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  const response = await updateSession(request);

  // ── i18n: seed the locale cookie when absent ────────────────────────────
  // Priority: persisted user preference (user_settings.language) for
  // authenticated users, then the browser/device language. The cookie is
  // written immediately so automatic detection never overwrites an explicit
  // choice made later. Skipped for API routes to avoid pointless work.
  const pathname = request.nextUrl.pathname;
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const needsLocaleSeed =
    !pathname.startsWith("/api/") && !isLocale(cookieLocale);

  if (needsLocaleSeed) {
    let locale = localeFromAcceptLanguage(request.headers.get("accept-language"));

    // Authenticated session present? Their stored preference wins.
    const hasAuthCookie = request.cookies
      .getAll()
      .some(({ name }) => name.startsWith("sb-"));
    if (hasAuthCookie) {
      try {
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll() {
                return request.cookies.getAll();
              },
              setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) =>
                  request.cookies.set(name, value),
                );
              },
            },
          },
        );
        // RLS scopes user_settings to the caller, so this reads own row only.
        const { data } = await supabase
          .from("user_settings")
          .select("language")
          .maybeSingle();
        if (data && isLocale(data.language)) {
          locale = data.language;
        }
      } catch {
        // Fall back to browser-language detection on any failure.
      }
    }

    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  }

  if (!isProtected) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          const newResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            newResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = new URL("/login", request.url);
    const next = request.nextUrl.pathname + request.nextUrl.search;
    if (next && next !== "/") {
      url.searchParams.set("next", next);
    }
    const redirectResponse = NextResponse.redirect(url);
    // Preserve a freshly seeded locale cookie across the redirect.
    if (needsLocaleSeed) {
      redirectResponse.cookies.set(LOCALE_COOKIE, response.cookies.get(LOCALE_COOKIE)?.value ?? "en", {
        path: "/",
        maxAge: LOCALE_COOKIE_MAX_AGE,
        sameSite: "lax",
      });
    }
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
