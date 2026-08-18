import { NextResponse } from "next/server";

import { sendWelcomeEmail } from "@/actions/email-welcome.actions";
import { createClient } from "@/lib/supabase/server";
import { sanitizeNextPath } from "@/lib/auth-redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNextPath(searchParams.get("next")) ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.session?.user) {
      // Post-confirmation: send the welcome email as a non-blocking side
      // effect. It does not delay the redirect and any failure does not
      // break authentication. sendWelcomeEmail() verifies email_confirmed_at,
      // claims the slot atomically, and self-resets on failure, so repeated
      // callback visits never produce duplicate emails.
      void sendWelcomeEmail(data.session.user.id).catch((sendError) => {
        console.error(
          "Welcome email background send failed",
          sendError,
        );
      });

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}