"use server";

import { resend } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Send the Azenion welcome email for a confirmed user.
 *
 * Invoked by the Supabase auth callback after `email_confirmed_at` is set.
 *
 * Correctness guarantees:
 *  - Only a user whose Supabase `email_confirmed_at` is actually set triggers
 *    the send; the check is made against auth.users via the admin client.
 *  - Idempotency is enforced by the `claim_welcome_email` RPC: exactly one
 *    request wins the claim, concurrent requests cannot both observe the slot
 *    as open, and repeated callback/login visits never resend.
 *  - The service-role client is used so the callback does not depend on the
 *    just-exchanged session cookies being visible to a fresh client.
 *  - A Resend failure never breaks authentication: it returns an error result
 *    and reopens the claim slot so the next visit can retry.
 *
 * `RESEND_API_KEY` is only ever read server-side via lib/email/resend.ts and
 * is never exposed to the client. No secrets or email credentials are logged.
 */
export async function sendWelcomeEmail(userId: string) {
  const admin = createAdminClient();

  // Verify the email is actually confirmed before doing anything else.
  const { data: authData, error: userError } =
    await admin.auth.admin.getUserById(userId);

  if (userError || !authData?.user) {
    return { error: "User not found", success: false };
  }

  if (!authData.user.email_confirmed_at) {
    return { error: "Email not confirmed", success: false };
  }

  const email = authData.user.email;
  if (!email) {
    return { error: "User has no email address", success: false };
  }

  // Atomically claim the welcome email slot.
  // Returns true only if this request won the claim (slot was open);
  // returns false if another request already claimed/sent it.
  const { data: claimed, error: claimError } = await admin.rpc(
    "claim_welcome_email",
    { p_user_id: userId },
  );

  if (claimError) {
    return { error: claimError.message, success: false };
  }

  if (claimed === false) {
    return { message: "Welcome email already sent", success: true };
  }

  // Attempt the send. On success the claim stays set, so the email is sent
  // exactly once. On failure the slot is reopened so a later visit can retry.
  try {
    await resend.emails.send({
      from: "Azenion <noreply@mail.azenion.com>",
      to: email,
      subject: "Welcome to Azenion — Let's build together!",
      html: welcomeEmailHtml(authData.user.user_metadata),
    });

    return { success: true };
  } catch (error) {
    try {
      await admin.rpc("reset_welcome_email_claim", {
        p_user_id: userId,
      });
    } catch (resetError) {
      console.error(
        "Failed to reset welcome_email_claim after Resend error",
        resetError,
      );
    }

    // Return failure but DO NOT throw — this must not break authentication.
    return {
      error: "Failed to send welcome email",
      success: false,
    };
  }
}

/**
 * Generate the HTML body for the Azenion welcome email.
 * Keeps email rendering separate from the sending/action logic so
 * future transactional emails can reuse the same structure.
 *
 * The metadata argument receives user.user_metadata from Supabase Auth,
 * which typically contains full_name and username set during sign-up.
 */
function welcomeEmailHtml(
  metadata: Record<string, unknown> | null | undefined,
): string {
  const fullName =
    typeof metadata?.full_name === "string" ? metadata.full_name : null;
  const username =
    typeof metadata?.username === "string" ? metadata.username : null;
  const name = fullName ?? username ?? "Builder";

  return `<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; color: #111;">
    <div
      style="
        background: linear-gradient(135deg, #6d6dff, #8b8bfd);
        color: #fff;
        padding: 2rem;
        text-align: center;
        border-radius: 8px 8px 0 0;
      "
    >
      <h1 style="margin: 0; font-size: 1.75rem;">Welcome to Azenion</h1>
      <p
        style="margin: 0.5rem 0 0; opacity: 0.9;"
      >
        The Limitless Network
      </p>
    </div>

    <div
      style="
        background: #fafafa;
        padding: 2rem;
        border: 1px solid #eaeaea;
        border-top: 0;
        border-radius: 0 0 8px 8px;
      "
    >
      <p style="font-size: 1.05rem; line-height: 1.6;">
        Hey <strong>${name}</strong>,
      </p>

      <p style="font-size: 1.05rem; line-height: 1.6;">
        Thank you for signing up! We're thrilled to have you join our community
        of builders, creators, and innovators.
      </p>

      <p style="font-size: 1.05rem; line-height: 1.6;">
        Azenion is your platform for shipping ideas, collaborating with teammates,
        and discovering what's possible when people build together. From your first
        project to your thousandth, we're here to support every step of the journey.
      </p>

      <div
        style="
          margin: 2rem 0;
          padding: 1.5rem;
          background: #f0f4ff;
          border: 1px solid #c2c8ff;
          border-radius: 6px;
        "
      >
        <p style="margin: 0; font-size: 0.95rem;">
          <strong>What's next?</strong><br />
          • Explore your dashboard and create your first project<br />
          • Connect with other builders in the community<br />
          • Check out tutorials and get started with templates
        </p>
      </div>

      <p style="font-size: 1.05rem; line-height: 1.6;">
        If you have any questions, simply reply to this email — we read every message.
      </p>

      <hr style="margin: 2rem 0; border: 0; border-top: 1px solid #eaeaea;" />

      <p
        style="font-size: 0.9rem; color: #666; text-align: center;"
      >
        © ${new Date().getFullYear()} Azenion. All rights reserved.
      </p>
    </div>
  </div>`;
}