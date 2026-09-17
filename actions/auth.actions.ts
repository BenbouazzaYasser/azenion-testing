"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { sanitizeNextPath, setAuthNextCookie } from "@/lib/auth-redirect";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

async function getClientIp(): Promise<string> {
  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return "unknown";
}

const signUpSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72),
  username: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid username"),
  full_name: z.string().trim().min(1).max(100),
});

const signInSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(72),
});

export async function signUp(formData: FormData) {
  // Rate limit sign-up: 5 attempts per IP per hour
  const ip = await getClientIp();
  const rl = await checkRateLimit("auth_signup", `ip:${ip}`, 5, 3600);
  if (!rl.allowed) {
    return { error: "Too many sign-up attempts. Please try again later." };
  }

  const supabase = await createClient();

  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    username: formData.get("username"),
    full_name: formData.get("full_name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data = {
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        username: parsed.data.username,
        full_name: parsed.data.full_name,
      },
    },
  };

  try {
    const { error } = await supabase.auth.signUp(data);

    if (error) {
      return { error: error.message };
    }
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? `Network error: ${err.message}`
          : "Network error: unable to reach the auth backend",
    };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function signIn(formData: FormData) {
  // Rate limit sign-in: 10 attempts per IP per 15 minutes
  const ip = await getClientIp();
  const rl = await checkRateLimit("auth_signin", `ip:${ip}`, 10, 900);
  if (!rl.allowed) {
    return { error: "Too many sign-in attempts. Please try again later." };
  }

  const supabase = await createClient();

  const parsed = signInSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const identifier = parsed.data.identifier;
  const password = parsed.data.password;

  let email = identifier;
  if (!email.includes("@")) {
    const admin = createAdminClient();
    const { data } = await admin.rpc("get_login_email_by_username", {
      p_username: identifier,
    });
    email = data ?? `__${identifier}__@invalid.invalid`;
  }

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { error: error.message };
    }
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? `Network error: ${err.message}`
          : "Network error: unable to reach the auth backend",
    };
  }

  revalidatePath("/", "layout");

  const nextRaw = formData.get("next");
  const next = sanitizeNextPath(typeof nextRaw === "string" ? nextRaw : null);
  if (next !== "/login" && next !== "/join") {
    redirect(next);
  }
  redirect("/");
}

/**
 * Starts a Google OAuth flow. Returns the provider authorization URL so the
 * client can redirect the browser to it; Supabase exchanges the resulting
 * `code` in /auth/callback.
 */
export async function signInWithGoogle(next?: string) {
  const supabase = await createClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await setAuthNextCookie(next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl}/auth/callback` },
  });

  if (error) {
    return { error: error.message };
  }
  return { url: data.url };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
