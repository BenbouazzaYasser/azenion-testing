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

// 1. Fresh message sent by Ziy8ed (so its received_at starts null).
const { data: fresh, error: freshErr } = await admin
  .from("messages")
  .insert({
    conversation_id: CONVERSATION_ID,
    sender_id: ZIY8ED_ID,
    content: `qa receipt ${Date.now()}`,
  })
  .select("id, sender_id, received_at")
  .single();
if (freshErr) throw new Error(`seed insert failed: ${freshErr.message}`);

// 2. A message sent by QA themselves (must NOT be touched by the RPC).
const { data: own } = await admin
  .from("messages")
  .insert({
    conversation_id: CONVERSATION_ID,
    sender_id: QA_USER_ID,
    content: `qa own ${Date.now()}`,
  })
  .select("id, sender_id, received_at")
  .single();

// 3. QA (the recipient) acks delivery via the RPC.
const { data: updatedCount, error: rpcErr } = await supa.rpc("mark_messages_received", {
  p_conversation_id: CONVERSATION_ID,
});
if (rpcErr) throw new Error(`mark_messages_received failed: ${rpcErr.message}`);

// 4. Verify state afterwards.
const { data: after } = await admin
  .from("messages")
  .select("id, sender_id, content, received_at")
  .in("id", [fresh.id, own.id]);

const freshRow = after?.find((m) => m.id === fresh.id);
const ownRow = after?.find((m) => m.id === own.id);

// 5. Security: RPC returns 0 for a non-member (must be a no-op, not an error).
const { data: nonMemberCount, error: nonMemberErr } = await supa.rpc(
  "mark_messages_received",
  { p_conversation_id: "00000000-0000-0000-0000-000000000000" },
);

console.log(
  JSON.stringify(
    {
      updated_rows: updatedCount,
      ziy8ed_fresh_message_received: freshRow?.received_at ?? null,
      ziy8ed_fresh_marked: freshRow?.received_at != null,
      own_message_untouched: ownRow?.received_at == null,
      non_member_rpc_noop: nonMemberCount === 0 && !nonMemberErr,
    },
    null,
    2,
  ),
);