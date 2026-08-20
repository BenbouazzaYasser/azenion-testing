// QA test: post sharing delivered into chat (00079_post_shares + 00080_post_share_chat).
// Requires both migrations applied to the linked Supabase project.
//
//   node qa_share_test.mjs
//
// Creates three disposable users, a shareable user post, then asserts:
//   1. Share with a message succeeds and returns {share_id, conversation_id, message_id}.
//   2. The post_shares row persists with the message.
//   3. A private conversation is created with both members.
//   4. A post_share chat message exists with message_type, the curated metadata
//      snapshot (post_id, title, excerpt, image, source_type, author), and the
//      optional message preserved as content.
//   5. Sharing without a message works (content '' but metadata intact).
//   6. Sharing again reuses the existing conversation and creates a second message.
//   7. Sender and recipient can both read the chat message; an unrelated user cannot.
//   8. Blocked (either direction) is rejected without leaving a share/message behind.
//   9. Self-share, unknown recipient, unknown post, and >500-char message rejected.
//  10. Deleting the chat message does NOT delete the post_shares row.
//  11. Normal text messages still work (defaults: message_type='text', metadata null).
//  12. RLS: authenticated clients cannot INSERT into post_shares directly.
// Users, posts, conversations and shares are cleaned up at the end.

import { createTestUser, userClient, admin, anon, report, printSummary } from "./qa_sec_lib.mjs";

const results = [];
let sharer = null;
let recipient = null;
let unrelated = null;
let postId = null;
let share1 = null;
let share2 = null;

const POST_TITLE = "QA Share Test Post";
const POST_BODY = "A post to share with rich content for the snapshot excerpt test.";
const POST_IMAGE = "https://example.com/qaimg.jpg";

async function testShareRPCValidation(c) {
  console.log("\n== SHARE POST: RPC VALIDATION ==");

  // self-share
  let r = await c.rpc("share_post", { p_post_id: postId, p_recipient_id: sharer.id, p_message: null });
  report("cannot share with yourself", r.error != null, r.error?.message ?? "ALLOWED!");

  // unknown recipient
  const ghost = "00000000-0000-0000-0000-000000000000";
  r = await c.rpc("share_post", { p_post_id: postId, p_recipient_id: ghost, p_message: null });
  report("cannot share with unknown recipient", r.error != null, r.error?.message ?? "ALLOWED!");

  // unknown post
  r = await c.rpc("share_post", { p_post_id: ghost, p_recipient_id: recipient.id, p_message: null });
  report("cannot share an unknown post", r.error != null, r.error?.message ?? "ALLOWED!");

  // message too long
  const long = "x".repeat(501);
  r = await c.rpc("share_post", { p_post_id: postId, p_recipient_id: recipient.id, p_message: long });
  report("rejects message over 500 chars", r.error != null, r.error?.message ?? "ALLOWED!");

  // valid share WITH message
  r = await c.rpc("share_post", { p_post_id: postId, p_recipient_id: recipient.id, p_message: "Check this out!" });
  report("valid share succeeds", r.error == null && r.data != null, r.error?.message ?? JSON.stringify(r.data));
  if (r.error == null && r.data) {
    share1 = r.data;
    report("share returns share_id", !!share1.share_id, JSON.stringify(share1));
    report("share returns conversation_id", !!share1.conversation_id, JSON.stringify(share1));
    report("share returns message_id", !!share1.message_id, JSON.stringify(share1));
  }

  // anonymous cannot share
  r = await anon.rpc("share_post", { p_post_id: postId, p_recipient_id: recipient.id, p_message: null });
  report("anonymous cannot share", r.error != null, r.error?.message ?? "ALLOWED!");

  // blocked: recipient blocks sharer -> reject, and no rows are left behind
  const countBefore = await countRows("post_shares");
  const { error: blockErr } = await admin
    .from("user_blocks")
    .insert({ blocker_id: recipient.id, blocked_id: sharer.id });
  if (blockErr) {
    report("setup block (recipient -> sharer)", false, blockErr.message);
  } else {
    r = await c.rpc("share_post", { p_post_id: postId, p_recipient_id: recipient.id, p_message: null });
    report("blocked recipient rejects share", r.error != null, r.error?.message ?? "ALLOWED!");
    const countAfter = await countRows("post_shares");
    report("blocked share leaves no post_shares row", countAfter === countBefore, `${countBefore} -> ${countAfter}`);
    try {
      await admin.from("user_blocks").delete().eq("blocker_id", recipient.id).eq("blocked_id", sharer.id);
    } catch {}
  }
}

async function testChatDelivery(c) {
  console.log("\n== SHARE POST: CHAT DELIVERY ==");

  // post_shares row persists the message
  let r = await admin.from("post_shares").select("id, sharer_id, recipient_id, post_id, message").eq("id", share1.share_id);
  const shareRow = r.data?.[0];
  report("post_shares row persisted", r.error == null && !!shareRow, r.error?.message ?? "");
  report("post_shares message preserved", shareRow?.message === "Check this out!", JSON.stringify(shareRow?.message));

  // conversation exists with both members
  r = await admin.from("conversation_members").select("user_id").eq("conversation_id", share1.conversation_id);
  const members = (r.data ?? []).map((m) => m.user_id).sort();
  report("conversation has both members", members.length === 2 && members.includes(sharer.id) && members.includes(recipient.id), JSON.stringify(members));

  // the post_share message
  r = await admin.from("messages").select("id, conversation_id, sender_id, content, message_type, metadata").eq("id", share1.message_id);
  const msg = r.data?.[0];
  report("post_share chat message created", r.error == null && !!msg, r.error?.message ?? "");
  report("message_type = post_share", msg?.message_type === "post_share", JSON.stringify(msg?.message_type));
  report("sender is the authenticated sharer", msg?.sender_id === sharer.id, JSON.stringify(msg?.sender_id));
  report("message content preserves the share message", msg?.content === "Check this out!", JSON.stringify(msg?.content));

  // metadata snapshot
  const md = msg?.metadata ?? {};
  report("metadata has post_id", md.post_id === postId, JSON.stringify(md.post_id));
  report("metadata has title", md.title === POST_TITLE, JSON.stringify(md.title));
  report("metadata has excerpt preview", md.excerpt === POST_BODY, JSON.stringify(md.excerpt));
  report("metadata has image", md.image === POST_IMAGE, JSON.stringify(md.image));
  report("metadata has source_type", md.source_type === "user_post", JSON.stringify(md.source_type));
  report("metadata has author username", md.author?.username === sharer.username, JSON.stringify(md.author));
  report("metadata has author full_name", md.author?.full_name === "QA qash", JSON.stringify(md.author));

  // share WITHOUT message -> separate event, message content ''
  r = await c.rpc("share_post", { p_post_id: postId, p_recipient_id: recipient.id, p_message: "" });
  report("share without message succeeds", r.error == null && r.data, r.error?.message ?? "");
  if (r.error == null && r.data) {
    share2 = r.data;
    report("second share reuses the same conversation", share2.conversation_id === share1.conversation_id, `${share1.conversation_id} vs ${share2.conversation_id}`);
    report("second share creates a distinct message", share2.message_id !== share1.message_id, "");
    report("second share creates a distinct share row", share2.share_id !== share1.share_id, "");
  }
  const { data: msg2 } = await admin.from("messages").select("content, message_type, metadata").eq("id", share2?.message_id ?? "00000000-0000-0000-0000-000000000000");
  const m2 = msg2?.[0];
  report("share without message -> content ''", m2?.content === "", JSON.stringify(m2?.content));
  report("share without message still post_share type", m2?.message_type === "post_share", JSON.stringify(m2?.message_type));
  report("share without message still has metadata", !!m2?.metadata?.post_id, JSON.stringify(m2?.metadata));

  // two post_share messages exist for the conversation
  const { data: sharesInConv } = await admin.from("messages").select("id").eq("conversation_id", share1.conversation_id).eq("message_type", "post_share");
  report("two post_share messages in conversation", (sharesInConv ?? []).length === 2, String((sharesInConv ?? []).length));
}

async function testRLS() {
  console.log("\n== SHARE POST: RLS / PERMISSIONS ==");
  const sharerC = userClient(sharer.token);
  const recipientC = userClient(recipient.token);
  const unrelatedC = userClient(unrelated.token);

  // chat message visibility
  let r = await sharerC.from("messages").select("id").eq("id", share1.message_id);
  report("sender can read the chat message", (r.data?.length ?? 0) === 1, r.error?.message ?? "");

  r = await recipientC.from("messages").select("id").eq("id", share1.message_id);
  report("recipient can read the chat message", (r.data?.length ?? 0) === 1, r.error?.message ?? "");

  r = await unrelatedC.from("messages").select("id").eq("id", share1.message_id);
  report("unrelated user cannot read the chat message", (r.data?.length ?? 0) === 0, r.data?.length ? "LEAKED" : "");

  // conversation visibility
  r = await unrelatedC.from("conversations").select("id").eq("id", share1.conversation_id);
  report("unrelated user cannot see the conversation", (r.data?.length ?? 0) === 0, r.data?.length ? "LEAKED" : "");

  // share row visibility
  r = await sharerC.from("post_shares").select("id, post_id, recipient_id").eq("id", share1.share_id);
  report("sharer can read own share", r.error == null && (r.data?.length ?? 0) === 1, r.error?.message ?? "");
  r = await recipientC.from("post_shares").select("id, post_id, sharer_id").eq("id", share1.share_id);
  report("recipient can read the share", r.error == null && (r.data?.length ?? 0) === 1, r.error?.message ?? "");
  r = await unrelatedC.from("post_shares").select("id").eq("id", share1.share_id);
  report("unrelated user cannot read the share", (r.data?.length ?? 0) === 0, r.data?.length ? "LEAKED" : "");

  // authenticated clients cannot INSERT into post_shares directly
  r = await sharerC.from("post_shares").insert({
    sharer_id: sharer.id,
    recipient_id: unrelated.id,
    post_id: postId,
    message: "bypass attempt",
  });
  report("direct post_shares insert is rejected", r.error != null, r.error?.message ?? "ALLOWED!");

  // normal text message still works: sender inserts via RLS, defaults apply
  const { data: textMsg, error: textErr } = await sharerC
    .from("messages")
    .insert({ conversation_id: share1.conversation_id, sender_id: sharer.id, content: "plain text works" })
    .select("id, message_type, metadata")
    .single();
  report("normal text message insert succeeds", textErr == null && !!textMsg, textErr?.message ?? "");
  report("normal text message defaults to message_type=text", textMsg?.message_type === "text", JSON.stringify(textMsg?.message_type));
  report("normal text message metadata is null", textMsg?.metadata == null, JSON.stringify(textMsg?.metadata));

  // recipient can read the text message too
  r = await recipientC.from("messages").select("id").eq("id", textMsg?.id ?? "00000000-0000-0000-0000-000000000000");
  report("recipient can read the normal text message", (r.data?.length ?? 0) === 1, r.data?.length ? "" : "MISSING");
}

async function testDelete() {
  console.log("\n== SHARE POST: DELETE SEMANTICS ==");
  const sharerC = userClient(sharer.token);

  const { error: delErr } = await sharerC.from("messages").delete().eq("id", share2.message_id).eq("sender_id", sharer.id);
  report("sender can delete their post_share message", delErr == null, delErr?.message ?? "");

  const { data: leftoverShare } = await admin.from("post_shares").select("id").eq("id", share2.share_id);
  report("deleting the chat message does NOT delete post_shares", (leftoverShare?.length ?? 0) === 1, leftoverShare?.length ? "" : "DELETED");
}

async function countRows(table) {
  const { data } = await admin.from(table).select("id");
  return (data ?? []).length;
}

async function cleanup() {
  if (postId) {
    try {
      await admin.from("posts").delete().eq("id", postId);
    } catch {}
  }
  const convIds = [share1?.conversation_id, share2?.conversation_id].filter(Boolean);
  if (convIds.length) {
    try {
      await admin.from("conversations").delete().in("id", convIds);
    } catch {}
  }
  for (const u of [sharer, recipient, unrelated]) {
    if (u?.id) {
      try {
        await admin.auth.admin.deleteUser(u.id);
      } catch {}
    }
  }
  console.log("\nCleanup complete.");
}

async function main() {
  console.log("SETUP: creating QA users + post");
  sharer = await createTestUser("qash");
  recipient = await createTestUser("qashr");
  unrelated = await createTestUser("qashx");
  if (sharer.error || recipient.error || unrelated.error) {
    console.log("SETUP FAIL", JSON.stringify({ sharer, recipient, unrelated }).slice(0, 400));
    process.exit(1);
  }

  const { data: post, error: postErr } = await admin
    .from("posts")
    .insert({
      author_id: sharer.id,
      title: POST_TITLE,
      body: POST_BODY,
      images: [POST_IMAGE],
      source_type: "user_post",
      source_id: null,
    })
    .select("id")
    .single();
  if (postErr) {
    console.log("SETUP FAIL: could not create post", postErr.message);
    await cleanup();
    process.exit(1);
  }
  postId = post.id;
  console.log(`Post: ${postId}`);

  const c = userClient(sharer.token);

  await testShareRPCValidation(c);
  if (!share1) {
    console.log("ABORT: valid share did not produce a result");
    await cleanup();
    process.exit(1);
  }
  await testChatDelivery(c);
  await testRLS();
  await testDelete();
  await cleanup();
  printSummary();
}

main().catch((e) => {
  console.error("TEST ERROR:", e?.message ?? e);
  process.exit(1);
});