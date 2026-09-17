import { cookies } from "next/headers";

export const AUTH_NEXT_COOKIE = "az_auth_next";

export function sanitizeNextPath(next: string | null | undefined): string {
  if (
    !next ||
    next.length > 500 ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(next)
  )
    return "/";
  return next;
}

export async function setAuthNextCookie(next: string | null | undefined): Promise<string> {
  const safe = sanitizeNextPath(next);
  const store = await cookies();
  store.set(AUTH_NEXT_COOKIE, safe, {
    path: "/",
    maxAge: 600,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return safe;
}

export async function getAuthNextCookie(): Promise<string> {
  const store = await cookies();
  return sanitizeNextPath(store.get(AUTH_NEXT_COOKIE)?.value);
}