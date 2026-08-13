import { createTestUser, userClient } from "./qa_sec_lib.mjs";

const ZIY8ED_ID = "dfcadf56-3fa0-4c03-ad31-d0697bc5fca9";

const { id: testUserId, username, token, error } = await createTestUser("qachat");
if (error) throw new Error(`createTestUser failed: ${error}`);

const supa = userClient(token);

const { data: conversationId, error: convErr } = await supa.rpc("get_or_create_conversation", {
  p_user_id: ZIY8ED_ID,
});
if (convErr) throw new Error(`get_or_create_conversation failed: ${convErr.message}`);

const { data: profile } = await supa
  .from("profiles")
  .select("id, full_name, username, avatar_url")
  .eq("id", testUserId)
  .single();

const { data: msg, error: msgErr } = await supa
  .from("messages")
  .insert({
    conversation_id: conversationId,
    sender_id: testUserId,
    content:
      "Hey Ziy8ed! This is a QA read-receipt test message sent from a temporary user. Reply here and my read receipt will show once you have.",
  })
  .select("id, conversation_id, sender_id, content, created_at")
  .single();
if (msgErr) throw new Error(`message insert failed: ${msgErr.message}`);

const fullName = profile?.full_name ?? null;
const displayName = fullName ?? profile?.username ?? username;

console.log(JSON.stringify(
  {
    test_user: {
      id: testUserId,
      username: profile?.username ?? username,
      full_name: fullName,
      email: profile ? null : null,
      display_name: displayName,
      avatar_url: profile?.avatar_url ?? null,
      auth_email: null,
    },
    conversation: {
      id: conversationId,
      url: `http://localhost:3000/chat/${conversationId}`,
    },
    message: {
      id: msg.id,
      content: msg.content,
      created_at: msg.created_at,
      sender_id: msg.sender_id,
    },
  },
  null,
  2,
));