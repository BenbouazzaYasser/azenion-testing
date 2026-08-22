"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  requestTeamJoinSchema,
  reviewJoinRequestSchema,
  inviteTeamMemberSchema,
  respondToInvitationSchema,
} from "@/lib/validations/team-membership.schema";
import type {
  RequestTeamJoinInput,
  ReviewJoinRequestInput,
  InviteTeamMemberInput,
  RespondToInvitationInput,
} from "@/lib/validations/team-membership.schema";

export async function requestTeamJoin(input: RequestTeamJoinInput) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const parsed = requestTeamJoinSchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0];
    return { error: firstError ?? "Invalid input" };
  }

  const { error } = await supabase.rpc("request_team_join", {
    p_team_id: parsed.data.team_id,
    p_message: parsed.data.message || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/teams");
  return { success: true };
}

export async function reviewTeamJoinRequest(input: ReviewJoinRequestInput) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const parsed = reviewJoinRequestSchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0];
    return { error: firstError ?? "Invalid input" };
  }

  const { error } = await supabase.rpc("review_team_join_request", {
    p_request_id: parsed.data.request_id,
    p_accept: parsed.data.accept,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/teams");
  revalidatePath("/profile");
  return { success: true };
}

export async function inviteTeamMember(input: InviteTeamMemberInput) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const parsed = inviteTeamMemberSchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0];
    return { error: firstError ?? "Invalid input" };
  }

  const { error } = await supabase.rpc("invite_team_member", {
    p_team_id: parsed.data.team_id,
    p_username: parsed.data.username || null,
    p_email: parsed.data.email || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/teams");
  revalidatePath("/profile");
  return { success: true };
}

export async function respondToTeamInvitation(input: RespondToInvitationInput) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const parsed = respondToInvitationSchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0];
    return { error: firstError ?? "Invalid input" };
  }

  const { error } = await supabase.rpc("respond_to_invitation", {
    p_invitation_id: parsed.data.invitation_id,
    p_accept: parsed.data.accept,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/teams");
  return { success: true };
}
