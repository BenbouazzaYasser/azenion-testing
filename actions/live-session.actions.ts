"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createLiveSessionSchema,
  updateLiveSessionSchema,
} from "@/lib/validations/live-session.schema";

const LIVE_SESSIONS_PATH = "/academy/live-sessions";

function firstZodError(parsed: { error: { flatten: () => { fieldErrors: Record<string, unknown[]> } } }) {
  const fieldErrors = parsed.error.flatten().fieldErrors;
  const firstError = Object.values(fieldErrors).flat()[0];
  return (firstError as string) ?? "Invalid input";
}

function parseTopics(raw: FormDataEntryValue | null): string[] | null {
  if (raw === null) return null;
  const topics = String(raw)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return topics;
}

function parseNumber(raw: FormDataEntryValue | null): number | null {
  if (raw === null) return null;
  const value = String(raw).trim();
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalText(raw: FormDataEntryValue | null): string | null {
  if (raw === null) return null;
  const value = String(raw).trim();
  return value === "" ? null : value;
}

export async function createLiveSession(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const raw = {
    title: (formData.get("title") as string) ?? "",
    description: (formData.get("description") as string) ?? "",
    host_type: (formData.get("host_type") as string) ?? "",
    host_id: (formData.get("host_id") as string) ?? "",
    instructor: (formData.get("instructor") as string) ?? "",
    starts_at: (formData.get("starts_at") as string) ?? "",
    ends_at: parseOptionalText(formData.get("ends_at")),
    location: parseOptionalText(formData.get("location")),
    meeting_url: parseOptionalText(formData.get("meeting_url")),
    format: (formData.get("format") as string) ?? "ONLINE",
    capacity: parseNumber(formData.get("capacity")),
    topics: parseTopics(formData.get("topics")),
  };

  const parsed = createLiveSessionSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: firstZodError(parsed) };
  }

  const startsAt = new Date(parsed.data.starts_at);
  if (Number.isNaN(startsAt.getTime())) {
    return { error: "Please provide a valid start time" };
  }

  const endsAt = parsed.data.ends_at ? new Date(parsed.data.ends_at) : null;
  if (endsAt && (Number.isNaN(endsAt.getTime()) || endsAt <= startsAt)) {
    return { error: "End time must be after the start time" };
  }

  const { error } = await supabase.rpc("create_live_session", {
    p_title: parsed.data.title,
    p_description: parsed.data.description,
    p_host_type: parsed.data.host_type,
    p_host_id: parsed.data.host_id,
    p_instructor: parsed.data.instructor,
    p_starts_at: startsAt.toISOString(),
    p_ends_at: endsAt ? endsAt.toISOString() : null,
    p_location: parsed.data.location ?? null,
    p_meeting_url: parsed.data.meeting_url ?? null,
    p_format: parsed.data.format,
    p_capacity: parsed.data.capacity ?? null,
    p_topics: parsed.data.topics,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(LIVE_SESSIONS_PATH);
  return { success: true };
}

export async function updateLiveSession(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const raw = {
    id: (formData.get("id") as string) ?? "",
    title: (formData.get("title") as string) ?? "",
    description: (formData.get("description") as string) ?? "",
    host_type: (formData.get("host_type") as string) ?? "",
    host_id: (formData.get("host_id") as string) ?? "",
    instructor: (formData.get("instructor") as string) ?? "",
    starts_at: (formData.get("starts_at") as string) ?? "",
    ends_at: parseOptionalText(formData.get("ends_at")),
    location: parseOptionalText(formData.get("location")),
    meeting_url: parseOptionalText(formData.get("meeting_url")),
    format: (formData.get("format") as string) ?? "ONLINE",
    capacity: parseNumber(formData.get("capacity")),
    topics: parseTopics(formData.get("topics")),
  };

  const parsed = updateLiveSessionSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: firstZodError(parsed) };
  }

  const startsAt = new Date(parsed.data.starts_at);
  if (Number.isNaN(startsAt.getTime())) {
    return { error: "Please provide a valid start time" };
  }

  const endsAt = parsed.data.ends_at ? new Date(parsed.data.ends_at) : null;
  if (endsAt && (Number.isNaN(endsAt.getTime()) || endsAt <= startsAt)) {
    return { error: "End time must be after the start time" };
  }

  const { error } = await supabase.rpc("update_live_session", {
    p_id: parsed.data.id,
    p_title: parsed.data.title,
    p_description: parsed.data.description,
    p_host_type: parsed.data.host_type,
    p_host_id: parsed.data.host_id,
    p_instructor: parsed.data.instructor,
    p_starts_at: startsAt.toISOString(),
    p_ends_at: endsAt ? endsAt.toISOString() : null,
    p_location: parsed.data.location ?? null,
    p_meeting_url: parsed.data.meeting_url ?? null,
    p_format: parsed.data.format,
    p_capacity: parsed.data.capacity ?? null,
    p_topics: parsed.data.topics,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(LIVE_SESSIONS_PATH);
  return { success: true };
}

export async function joinLiveSession(sessionId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase.rpc("join_live_session", {
    p_session_id: sessionId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(LIVE_SESSIONS_PATH);
  return { success: true, ...((data?.[0] as Record<string, unknown>) ?? {}) };
}

export async function leaveLiveSession(sessionId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase.rpc("leave_live_session", {
    p_session_id: sessionId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(LIVE_SESSIONS_PATH);
  return { success: true };
}

export async function deleteLiveSession(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const id = (formData.get("id") as string) ?? "";

  if (!id) {
    return { error: "Missing session id" };
  }

  const { error } = await supabase.rpc("delete_live_session", {
    p_id: id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(LIVE_SESSIONS_PATH);
  return { success: true };
}
