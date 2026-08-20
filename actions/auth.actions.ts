"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sanitizeNextPath } from "@/lib/auth-redirect";

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

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    return { error: error.message };
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

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");

  // The server writes the session cookie, but the browser-side supabase-js
  // context is not notified of the new session. The `refresh_auth` flag tells
  // AuthProvider to re-read the session from cookies on the redirected page so
  // the UI reflects the login immediately instead of after a stale state.
  const rawNext = formData.get("next");
  const next = typeof rawNext === "string" ? sanitizeNextPath(rawNext) : null;
  if (next && next !== "/login" && next !== "/join") {
    const sep = next.includes("?") ? "&" : "?";
    redirect(`${next}${sep}refresh_auth=1`);
  }
  redirect("/?refresh_auth=1");
}

export async function signInWithGoogle(next?: string) {
  const supabase = await createClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://azenion.com";
  const safeNext = sanitizeNextPath(next) ?? "/";
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
  redirect("/?refresh_auth=1");
}
