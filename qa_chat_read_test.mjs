import { admin, anon, userClient, QA_TEST_PASSWORD } from "./qa_sec_lib.mjs";

const QA_EMAIL = "qachat_msro52fa_kxs3@qa.azenion.test";
const QA_USER_ID = "3be744b6-00b6-4fd9-8f22-490b96b1f213";
const ZIY8ED_ID = "dfcadf56-3fa0-4c03-ad31-d0697bc5fca9";
const CONVERSATION_ID = "26aa8a54-ee18-40cc-b36a-98364c8ffda4";

const { data: sess, error: signInErr } = await anon.auth.signInWithPassword({
  email: QA_EMAIL,
  password: QA_TEST_PASSWORD,
});
if (signInErr) throw new Error(`QA sign-in failed: ${signInErr.message}`);
const supa = userClient(sess.session.access_token);

// Latest message Ziy8ed sent in this conversation (the one they just replied with).
const { data: latest } = await supa
  .from("messages")
  .select("id, sender_id, content, created_at")
  .eq("conversation_id", CONVERSATION_ID)
  .eq("sender_id", ZIY8ED_ID)
  .order("created_at", { ascending: false })
  .limit(1)
  .single();
if (!latest) throw new Error("No message from Ziy8ed found in conversation");

// Normal authenticated read flow (mirrors the app's markConversationRead DB op).
const { data: readRow, error: readErr } = await supa
  .from("conversation_members")
  .update({ last_read_at: new Date().toISOString() })
  .eq("conversation_id", CONVERSATION_ID)
  .eq("user_id", QA_USER_ID)
  .select("user_id, conversation_id, last_read_at")
  .single();
if (readErr) throw new Error(`mark-conversation-read failed: ${readErr.message}`);

const { data: ziyReadRow } = await admin
  .from("conversation_members")
  .select("user_id, last_read_at")
  .eq("conversation_id", CONVERSATION_ID);

const { data: unread } = await admin.rpc("get_unread_counts", { p_user_id: ZIY8ED_ID });

console.log(
  JSON.stringify(
    {
      ziy8ed_latest_message: latest,
      qa_membership_after_read: readRow,
      ziy8ed_read: (ziyReadRow ?? []).find((r) => r.user_id === ZIY8ED_ID) ?? null,
      read_covers_latest: new Date(readRow.last_read_at).getTime() >= new Date(latest.created_at).getTime(),
      ziy8ed_unread_counts_now: (unread ?? []).find((u) => u.conversation_id === CONVERSATION_ID) ?? null,
    },
    null,
    2,
  ),
);