"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createSessionRequestSchema,
  updateSessionRequestStatusSchema,
} from "@/lib/validations/session-request.schema";
import type {
  AdminSessionRequestRow,
  SessionRequestRow,
} from "@/lib/validations/session-request.schema";

const SESSION_REQUESTS_PATH = "/academy/live-sessions";

function firstZodError(parsed: { error: { flatten: () => { fieldErrors: Record<string, unknown[]> } } }) {
  const fieldErrors = parsed.error.flatten().fieldErrors;
  const firstError = Object.values(fieldErrors).flat()[0];
  return (firstError as string) ?? "Invalid input";
}

export async function createSessionRequest(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const raw = {
    title: (formData.get("title") as string) ?? "",
    description: (formData.get("description") as string) ?? "",
    preferred_format: (formData.get("preferred_format") as string) ?? "EITHER",
    preferred_branch_id: (formData.get("preferred_branch_id") as string)?.trim() || null,
  };

  const parsed = createSessionRequestSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: firstZodError(parsed) };
  }

  const { data: id, error } = await supabase.rpc("create_session_request", {
    p_title: parsed.data.title,
    p_description: parsed.data.description,
    p_preferred_format: parsed.data.preferred_format,
    p_preferred_branch_id: parsed.data.preferred_branch_id ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(SESSION_REQUESTS_PATH);
  return { success: true, id: id as string };
}

export async function getMySessionRequests() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase.rpc("get_my_session_requests");

  if (error) {
    return { error: error.message };
  }

  return { data: data as unknown as SessionRequestRow[] };
}

export async function getAllSessionRequests() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase.rpc("get_all_session_requests");

  if (error) {
    return { error: error.message };
  }

  return { data: data as unknown as AdminSessionRequestRow[] };
}

export async function updateSessionRequestStatus(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: isAdmin } = await supabase.rpc("can_manage_session_requests");
  if (!isAdmin) {
    return { error: "Only platform admins can update session request status" };
  }

  const raw = {
    id: (formData.get("id") as string) ?? "",
    status: (formData.get("status") as string) ?? "",
    admin_notes: (formData.get("admin_notes") as string)?.trim() || null,
  };

  const parsed = updateSessionRequestStatusSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: firstZodError(parsed) };
  }

  const { error } = await supabase.rpc("update_session_request_status", {
    p_id: parsed.data.id,
    p_status: parsed.data.status,
    p_admin_notes: parsed.data.admin_notes ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(SESSION_REQUESTS_PATH);
  return { success: true };
}
