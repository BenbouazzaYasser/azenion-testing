"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      data: {
        username: formData.get("username") as string,
        full_name: formData.get("full_name") as string,
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
  const supabase = await createClient();

  const identifier = (formData.get("identifier") as string)?.trim() ?? "";
  const password = formData.get("password") as string;

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

  const next = formData.get("next");
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && next !== "/login" && next !== "/join") {
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
  const safeNext =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/";
  const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
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
