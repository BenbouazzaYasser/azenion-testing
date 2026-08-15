import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface EndCallBody {
  conversationId: string;
  callId: string;
  type: "offer" | "answer" | "ice" | "cancel" | "decline" | "busy" | "end";
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

/**
 * Fallback signaling endpoint used when a page unloads mid-call
 * (navigator.sendBeacon / fetch keepalive can't carry a long-lived await).
 * It only ever inserts a terminal event for the authenticated caller, and is
 * subject to the same call_events RLS as the client: sender_id must be the
 * caller and they must be a conversation member. Unauthorized calls are
 * rejected with 403.
 */
export async function POST(request: NextRequest) {
  let body: EndCallBody;
  try {
    body = (await request.json()) as EndCallBody;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { conversationId, callId, type } = body;
  if (
    !isUuid(conversationId) ||
    !isUuid(callId) ||
    !["cancel", "decline", "end"].includes(type)
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.from("call_events").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    call_id: callId,
    event_type: type,
    payload: {},
  });

  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
