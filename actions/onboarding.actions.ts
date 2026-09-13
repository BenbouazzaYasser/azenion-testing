"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loadOnboardingData } from "@/lib/onboarding-data";

const STEPS = ["welcome", "profile", "branch", "team", "project", "done"];

function isKnownStep(step: string): step is (typeof STEPS)[number] {
  return STEPS.includes(step);
}

/**
 * Persists the onboarding progress step so a partly-completed flow can resume
 * on the next visit. `null` clears progress (used for restart).
 */
export async function persistOnboardingStep(step: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  if (step !== null && !isKnownStep(step)) return { error: "Invalid step" };

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_step: step })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

/** Marks onboarding complete (sets the completion timestamp, clears the step). */
export async function completeOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({
      onboarding_step: null,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

/** Clears completion and step so the flow can be walked through again. */
export async function restartOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({
      onboarding_step: "welcome",
      onboarding_completed_at: null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  revalidatePath("/profile");
  return { success: true };
}

/**
 * Lightweight profile update used by the onboarding PROFILE step. Only the
 * optional fields are touched (bio + institution) so onboarding never forces
 * the user to fill username / full name.
 */
export async function saveOnboardingProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const bioRaw = (formData.get("bio") as string) ?? "";
  const institutionRaw = (formData.get("institution") as string) ?? "";
  const fullNameRaw = (formData.get("full_name") as string) ?? "";

  const bio = bioRaw.trim().slice(0, 500) || null;
  const institution = institutionRaw.trim().slice(0, 100) || null;
  const full_name = fullNameRaw.trim().slice(0, 100) || null;

  const patch: { bio: string | null; institution: string | null; full_name?: string } = {
    bio,
    institution,
  };
  if (full_name) patch.full_name = full_name;

  const { error } = await supabase
    .from("profiles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { error: error.message };

  return { success: true };
}

/** One-click join (request) for the team step — uses the existing membership flow. */
export async function requestTeamJoin(teamId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.rpc("request_team_join", {
    p_team_id: teamId,
    p_message: null,
  });

  if (error) {
    if (error.message.includes("already a member")) {
      return { success: true, already: true };
    }
    if (error.message.includes("already requested")) {
      return { success: true, already: true };
    }
    return { error: error.message };
  }

  return { success: true };
}

export async function joinOnboardingBranch(branchId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.rpc("join_branch", {
    p_branch_id: branchId,
  });

  if (error) return { error: error.message };

  return { success: true, branchId };
}

/** Client-facing loader: returns onboarding state + recommendations. */
export async function getOnboardingData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return loadOnboardingData(user.id);
}