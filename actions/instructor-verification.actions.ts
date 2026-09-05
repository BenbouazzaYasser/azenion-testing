"use server";

import { createClient } from "@/lib/supabase/server";
import { instructorVerificationSchema, type EducationEntry, type CertificationEntry } from "@/lib/validations/instructor-verification.schema";

export interface InstructorVerificationRequest {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected" | "needs_info";
  full_name: string;
  bio: string;
  expertise_areas: string[];
  teaching_experience: string | null;
  education: EducationEntry[];
  certifications: CertificationEntry[];
  portfolio_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminVerificationRequest {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  status: "pending" | "approved" | "rejected" | "needs_info";
  expertise_areas: string[];
  education: EducationEntry[];
  certifications: CertificationEntry[];
  created_at: string;
  updated_at: string;
}

export type SubmitVerificationResult =
  | { error: string; request_id?: undefined }
  | { error?: undefined; request_id: string };

export type GetMyVerificationResult =
  | { error: string; request?: undefined }
  | { error?: undefined; request: InstructorVerificationRequest | null };

export type AdminGetRequestsResult =
  | { error: string; requests?: undefined; total?: undefined }
  | { error?: undefined; requests: AdminVerificationRequest[]; total: number };

export type AdminReviewResult =
  | { error: string; success?: undefined }
  | { error?: undefined; success: true };

/**
 * Submit an instructor verification request
 */
export async function submitInstructorVerification(
  input: Omit<InstructorVerificationRequest, "id" | "user_id" | "status" | "reviewed_by" | "reviewed_at" | "review_notes" | "created_at" | "updated_at">
): Promise<SubmitVerificationResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const parsed = instructorVerificationSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0];
    return { error: firstError ?? "Invalid input" };
  }

  const { data: requestId, error } = await supabase.rpc(
    "submit_instructor_verification",
    {
      p_full_name: parsed.data.full_name,
      p_bio: parsed.data.bio,
      p_expertise_areas: parsed.data.expertise_areas,
      p_teaching_experience: parsed.data.teaching_experience || null,
      p_portfolio_url: parsed.data.portfolio_url || null,
      p_linkedin_url: parsed.data.linkedin_url || null,
      p_github_url: parsed.data.github_url || null,
      p_education: JSON.stringify(parsed.data.education ?? []),
      p_certifications: JSON.stringify(parsed.data.certifications ?? []),
    }
  );

  if (error) {
    return { error: error.message };
  }

  return { request_id: requestId };
}

/**
 * Get the current user's instructor verification request (if any)
 */
export async function getMyInstructorVerification(): Promise<GetMyVerificationResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase.rpc("get_my_instructor_verification");

  if (error) {
    return { error: error.message };
  }

  if (!data || data.length === 0) {
    return { request: null };
  }

  const row = data[0];
  return {
    request: {
      id: row.id,
      user_id: user.id,
      status: row.status,
      full_name: row.full_name,
      bio: row.bio,
      expertise_areas: row.expertise_areas,
      teaching_experience: row.teaching_experience,
      education: parseJsonField<EducationEntry>(row.education),
      certifications: parseJsonField<CertificationEntry>(row.certifications),
      portfolio_url: row.portfolio_url,
      linkedin_url: row.linkedin_url,
      github_url: row.github_url,
      reviewed_by: row.reviewed_by,
      reviewed_at: row.reviewed_at,
      review_notes: row.review_notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
  };
}

/**
 * Admin: Get paginated list of verification requests
 */
export async function adminGetVerificationRequests(input: {
  status?: "pending" | "approved" | "rejected" | "needs_info" | null;
  limit?: number;
  offset?: number;
}): Promise<AdminGetRequestsResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc(
    "is_platform_admin"
  );

  if (rpcError || !isPlatformAdmin) {
    return { error: "Not authorized - platform admin only" };
  }

  const limit = Math.min(input.limit ?? 50, 100);
  const offset = input.offset ?? 0;

  const { data, error, count } = await supabase.rpc("admin_get_verification_requests", {
    p_status: input.status || null,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    return { error: error.message };
  }

  const totalResult = await supabase.rpc("admin_get_verification_requests", {
    p_status: input.status || null,
    p_limit: 999999,
    p_offset: 0,
  });

  const total = totalResult.data?.length ?? 0;

  return {
    requests: (data ?? []).map((row: Record<string, unknown>) => ({
      ...row,
      education: parseJsonField<EducationEntry>(row.education),
      certifications: parseJsonField<CertificationEntry>(row.certifications),
    })) as AdminVerificationRequest[],
    total,
  };
}

/**
 * Admin: Review (approve, reject, or request more info) on a verification request
 */
export async function adminReviewInstructorVerification(input: {
  request_id: string;
  action: "approve" | "reject" | "needs_info";
  review_notes?: string;
}): Promise<AdminReviewResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc(
    "is_platform_admin"
  );

  if (rpcError || !isPlatformAdmin) {
    return { error: "Not authorized - platform admin only" };
  }

  if (!["approve", "reject", "needs_info"].includes(input.action)) {
    return { error: "Invalid action. Must be 'approve', 'reject', or 'needs_info'" };
  }

  const { error } = await supabase.rpc("admin_review_instructor_verification", {
    p_request_id: input.request_id,
    p_action: input.action,
    p_review_notes: input.review_notes || null,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Check if the current user is a verified instructor
 */
export async function amIVerifiedInstructor(): Promise<{
  is_instructor: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { is_instructor: false, error: "Not authenticated" };
  }

  const { data, error } = await supabase.rpc("has_platform_role", {
    p_role_name: "instructor",
  });

  if (error) {
    return { is_instructor: false, error: error.message };
  }

  return { is_instructor: !!data };
}

function parseJsonField<T = unknown>(value: unknown): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}
