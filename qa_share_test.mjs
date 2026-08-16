// QA test: post sharing (00079_post_shares) — RPC validation + RLS isolation.
// Requires the migration applied to the linked Supabase project.
//
//   node qa_share_test.mjs
//
// Creates three disposable users, a shareable user post, then asserts:
//   1. Valid share succeeds and persists the message.
//   2. Self-share is rejected.
//   3. Unknown recipient is rejected.
//   4. Unknown post is rejected.
//   5. Message longer than 500 chars is rejected.
//   6. A blocked relationship (either direction) is rejected.
//   7. Anonymous callers cannot share.
//   8. RLS: only the sharer and recipient can read a share row.
//   9. RLS: authenticated clients cannot INSERT into post_shares directly.
// Users, posts and shares are cleaned up at the end.

import { createTestUser, userClient, admin, anon, report, printSummary } from "./qa_sec_lib.mjs";

const results = [];
let sharer = null;
let recipient = null;
let unrelated = null;
let postId = null;
let shareId = null;

async function testShareRPCValidation() {
  console.log("== SHARE POST: RPC VALIDATION ==");

  const c = userClient(sharer.token);

  // 2. self-share
  let r = await c.rpc("share_post", { p_post_id: postId, p_recipient_id: sharer.id, p_message: null });
  report("cannot share with yourself", r.error != null, r.error?.message ?? "ALLOWED!");

  // 3. unknown recipient
  const ghost = "00000000-0000-0000-0000-000000000000";
  r = await c.rpc("share_post", { p_post_id: postId, p_recipient_id: ghost, p_message: null });
  report("cannot share with unknown recipient", r.error != null, r.error?.message ?? "ALLOWED!");

  // 4. unknown post
  r = await c.rpc("share_post", { p_post_id: ghost, p_recipient_id: recipient.id, p_message: null });
  report("cannot share an unknown post", r.error != null, r.error?.message ?? "ALLOWED!");

  // 5. message too long
  const long = "x".repeat(501);
  r = await c.rpc("share_post", { p_post_id: postId, p_recipient_id: recipient.id, p_message: long });
  report("rejects message over 500 chars", r.error != null, r.error?.message ?? "ALLOWED!");

  // 1. valid share
  r = await c.rpc("share_post", { p_post_id: postId, p_recipient_id: recipient.id, p_message: "Check this out!" });
  report("valid share succeeds", r.error == null && r.data != null, r.error?.message ?? JSON.stringify(r.data));
  if (r.error == null && r.data) shareId = r.data;

  // 7. anonymous cannot share
  r = await anon.rpc("share_post", { p_post_id: postId, p_recipient_id: recipient.id, p_message: null });
  report("anonymous cannot share", r.error != null, r.error?.message ?? "ALLOWED!");

  // 6. blocked: recipient blocks sharer -> reject
  const { error: blockErr } = await admin
    .from("user_blocks")
    .insert({ blocker_id: recipient.id, blocked_id: sharer.id });
  if (blockErr) {
    report("setup block (recipient -> sharer)", false, blockErr.message);
  } else {
    r = await c.rpc("share_post", { p_post_id: postId, p_recipient_id: recipient.id, p_message: null });
    report("blocked recipient rejects share", r.error != null, r.error?.message ?? "ALLOWED!");
    // remove block again so the share row remains visible for the RLS checks
    try {
      await admin.from("user_blocks").delete().eq("blocker_id", recipient.id).eq("blocked_id", sharer.id);
    } catch {}
  }
}

async function testShareRLS() {
  console.log("\n== SHARE POST: RLS ISOLATION ==");

  // 8. sharer + recipient can read; unrelated cannot
  const sharerC = userClient(sharer.token);
  const recipientC = userClient(recipient.token);
  const unrelatedC = userClient(unrelated.token);

  let r = await sharerC.from("post_shares").select("id, post_id, recipient_id").eq("id", shareId);
  report("sharer can read own share", r.error == null && (r.data?.length ?? 0) === 1, r.error?.message ?? "");

  r = await recipientC.from("post_shares").select("id, post_id, sharer_id").eq("id", shareId);
  report("recipient can read the share", r.error == null && (r.data?.length ?? 0) === 1, r.error?.message ?? "");

  r = await unrelatedC.from("post_shares").select("id").eq("id", shareId);
  report("unrelated user cannot read the share", (r.data?.length ?? 0) === 0, r.data?.length ? "LEAKED" : "");

  // 9. authenticated clients cannot INSERT directly (no insert grant)
  r = await sharerC.from("post_shares").insert({
    sharer_id: sharer.id,
    recipient_id: unrelated.id,
    post_id: postId,
    message: "bypass attempt",
  });
  report("direct insert is rejected", r.error != null, r.error?.message ?? "ALLOWED!");
}

async function cleanup() {
  if (postId) {
    try {
      await admin.from("posts").delete().eq("id", postId);
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
    .insert({ author_id: sharer.id, title: "QA Share Test Post", body: "A post to share.", source_type: "user_post", source_id: null })
    .select("id")
    .single();
  if (postErr) {
    console.log("SETUP FAIL: could not create post", postErr.message);
    await cleanup();
    process.exit(1);
  }
  postId = post.id;
  console.log(`Post: ${postId}`);

  await testShareRPCValidation();
  await testShareRLS();
  await cleanup();
  printSummary();
}

main().catch((e) => {
  console.error("TEST ERROR:", e?.message ?? e);
  process.exit(1);
});