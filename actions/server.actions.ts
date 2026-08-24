"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function createUserServer(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const rawSlug = (formData.get("slug") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() || null;

  if (name.length < 2 || name.length > 60) {
    return { error: "Server name must be between 2 and 60 characters." };
  }

  const slug = slugify(rawSlug || name);
  if (!SLUG_RE.test(slug)) {
    return { error: "Slug must contain lowercase letters, numbers or dashes." };
  }

  const { data: existing } = await supabase
    .from("servers")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    return { error: "A server with this slug already exists." };
  }

  const { data: serverId, error } = await supabase.rpc("create_user_server", {
    p_name: name,
    p_slug: slug,
    p_description: description,
  });

  if (error) {
    if (error.message.includes("duplicate key") || error.message.includes("unique")) {
      return { error: "A server with this slug already exists." };
    }
    return { error: error.message };
  }

  revalidatePath("/servers");
  redirect(`/servers/${slug}`);
}

export async function createServerChannel(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const serverId = formData.get("server_id") as string;
  const serverSlug = formData.get("server_slug") as string;
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const rawSlug = (formData.get("slug") as string | null)?.trim() ?? "";

  if (!serverId) return { error: "Missing server" };
  if (!name) return { error: "Channel name is required" };

  const slug = slugify(rawSlug || name);
  if (!SLUG_RE.test(slug)) {
    return { error: "Slug must contain lowercase letters, numbers or dashes." };
  }

  const { data: channelId, error } = await supabase.rpc("create_server_channel", {
    p_server_id: serverId,
    p_name: name,
    p_slug: slug,
  });

  if (error) {
    if (error.message.includes("duplicate key") || error.message.includes("unique")) {
      return { error: "A channel with this slug already exists." };
    }
    return { error: error.message };
  }

  revalidatePath(`/servers/${serverSlug}`);
  return { success: true, channelId };
}

export async function leaveUserServer(serverId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase.rpc("leave_user_server", {
    p_server_id: serverId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/servers");
  return { success: true };
}

export async function editChannelMessage(messageId: string, content: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!content.trim()) {
    return { error: "Message cannot be empty" };
  }

  const { error } = await supabase
    .from("channel_messages")
    .update({ content: content.trim(), edited_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("sender_id", user.id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function deleteChannelMessage(messageId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("channel_messages")
    .delete()
    .eq("id", messageId)
    .eq("sender_id", user.id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function sendChannelMessage(channelId: string, content: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!content.trim()) {
    return { error: "Message cannot be empty" };
  }

  // RLS enforces channel access; this gives a clean error message instead.
  const { data, error } = await supabase
    .from("channel_messages")
    .insert({
      channel_id: channelId,
      sender_id: user.id,
      content: content.trim(),
    })
    .select("id, created_at")
    .single();

  if (error) {
    return { error: "You can't post in this channel." };
  }

  return { success: true, id: data.id, created_at: data.created_at };
}
