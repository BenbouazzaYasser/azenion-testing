import { supabase } from "./supabase";
import { apiFetch } from "./api";
import { friendlyError } from "./errors";

export interface ChatAttachment {
  id: string;
  message_id: string;
  type: string;
  storage_path: string | null;
  filename: string | null;
  mime_type: string | null;
  provider: string | null;
  external_id: string | null;
  metadata: Record<string, unknown> | null;
  signedUrl?: string | null;
}

function uuid4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Attachments for a conversation (member RLS), with signed URLs minted on demand. */
export async function getAttachments(conversationId: string): Promise<ChatAttachment[]> {
  const { data, error } = await supabase
    .from("chat_message_attachments")
    .select("id, message_id, type, storage_path, filename, mime_type, provider, external_id, metadata")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) throw new Error(friendlyError(error.message));
  return (data ?? []) as ChatAttachment[];
}

/** Mint a signed URL through the Phase 0C boundary (never touches service-role client-side). */
export async function signAttachment(attachmentId: string): Promise<string | null> {
  const res = await apiFetch("/api/chat/media/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ attachmentId }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { signedUrl?: string };
  return body.signedUrl ?? null;
}

export interface SendImageArgs {
  conversationId: string;
  uri: string;
  filename: string;
  mimeType: string;
  fileSize?: number;
}

/**
 * Image send mirroring the web server action: create the message, upload the
 * object under chat/<conv>/<uuid>/<file>, insert the attachment row. All
 * writes run under the caller's JWT (storage + table RLS enforce
 * membership); on attachment failure the message is removed best-effort.
 */
export async function sendImage({ conversationId, uri, filename, mimeType, fileSize }: SendImageArgs): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data: msg, error: msgError } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, content: "" })
    .select("id")
    .single();
  if (msgError || !msg) throw new Error(friendlyError(msgError?.message ?? "Unable to create message."));
  const messageId = (msg as { id: string }).id;

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "image.jpg";
  const objectPath = `chat/${conversationId}/${uuid4()}/${safeName}`;

  try {
    const fetched = await fetch(uri);
    const blob = await fetched.blob();
    const { error: upError } = await supabase.storage.from("chat-media").upload(objectPath, blob, {
      contentType: mimeType,
      upsert: false,
    });
    if (upError) throw new Error(friendlyError(upError.message));

    const { error: attError } = await supabase.from("chat_message_attachments").insert({
      message_id: messageId,
      conversation_id: conversationId,
      uploader_id: user.id,
      type: "image",
      storage_path: objectPath,
      filename: safeName,
      mime_type: mimeType,
      file_size: fileSize ?? null,
    });
    if (attError) throw new Error(friendlyError(attError.message));
  } catch (e) {
    await supabase.from("messages").delete().eq("id", messageId).eq("sender_id", user.id);
    try {
      await supabase.storage.from("chat-media").remove([objectPath]);
    } catch {
      // Best effort.
    }
    throw e instanceof Error ? e : new Error("Unable to send image.");
  }

  return messageId;
}
