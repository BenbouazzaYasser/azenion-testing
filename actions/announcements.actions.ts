"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from "@/lib/validations/announcement.schema";

async function isAuthorizedToManage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, authorized: false };
  }

  const { data: authorized } = await supabase.rpc("can_manage_announcements");
  return { user, authorized: !!authorized };
}

function firstZodError(parsed: { error: { flatten: () => { fieldErrors: Record<string, unknown[]> } } }) {
  const fieldErrors = parsed.error.flatten().fieldErrors;
  const firstError = Object.values(fieldErrors).flat()[0];
  return (firstError as string) ?? "Invalid input";
}

function parseDetails(raw: string | null): string[] | null {
  if (!raw || raw.trim() === "") return null;
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function createAnnouncement(formData: FormData) {
  const { user, authorized } = await isAuthorizedToManage();

  if (!user) {
    return { error: "Not authenticated" };
  }
  if (!authorized) {
    return { error: "Only platform admins can create announcements" };
  }

  const raw = {
    emoji: (formData.get("emoji") as string)?.trim() || "📢",
    title: (formData.get("title") as string) ?? "",
    category: (formData.get("category") as string)?.trim() || "Platform",
    description: (formData.get("description") as string) ?? "",
    badge: (formData.get("badge") as string)?.trim() || null,
    details: parseDetails(formData.get("details") as string | null),
  };

  const parsed = createAnnouncementSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: firstZodError(parsed) };
  }

  const { error } = await (await createClient()).rpc("create_platform_announcement", {
    p_emoji: parsed.data.emoji,
    p_title: parsed.data.title,
    p_category: parsed.data.category,
    p_description: parsed.data.description,
    p_badge: parsed.data.badge ?? null,
    p_details: parsed.data.details ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/announcements");
  return { success: true };
}

export async function updateAnnouncement(formData: FormData) {
  const { user, authorized } = await isAuthorizedToManage();

  if (!user) {
    return { error: "Not authenticated" };
  }
  if (!authorized) {
    return { error: "Only platform admins can edit announcements" };
  }

  const raw = {
    id: (formData.get("id") as string) ?? "",
    emoji: (formData.get("emoji") as string)?.trim() || "📢",
    title: (formData.get("title") as string) ?? "",
    category: (formData.get("category") as string)?.trim() || "Platform",
    description: (formData.get("description") as string) ?? "",
    badge: (formData.get("badge") as string)?.trim() || null,
    details: parseDetails(formData.get("details") as string | null),
  };

  const parsed = updateAnnouncementSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: firstZodError(parsed) };
  }

  const { error } = await (await createClient()).rpc("update_platform_announcement", {
    p_id: parsed.data.id,
    p_emoji: parsed.data.emoji,
    p_title: parsed.data.title,
    p_category: parsed.data.category,
    p_description: parsed.data.description,
    p_badge: parsed.data.badge ?? null,
    p_details: parsed.data.details ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/announcements");
  return { success: true };
}

export async function deleteAnnouncement(formData: FormData) {
  const { user, authorized } = await isAuthorizedToManage();

  if (!user) {
    return { error: "Not authenticated" };
  }
  if (!authorized) {
    return { error: "Only platform admins can delete announcements" };
  }

  const id = (formData.get("id") as string) ?? "";

  if (!id) {
    return { error: "Missing announcement id" };
  }

  const { error } = await (await createClient()).rpc("delete_platform_announcement", {
    p_id: id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/announcements");
  return { success: true };
}
