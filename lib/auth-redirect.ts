import { cookies } from "next/headers";

export const AUTH_NEXT_COOKIE = "az_auth_next";

export function sanitizeNextPath(next: string | null | undefined): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/";
}

export function setAuthNextCookie(next: string | null | undefined): string {
  const safe = sanitizeNextPath(next);
  cookies().set(AUTH_NEXT_COOKIE, safe, {
    path: "/",
    maxAge: 600,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return safe;
}

export function getAuthNextCookie(): string {
  return sanitizeNextPath(cookies().get(AUTH_NEXT_COOKIE)?.value);
}