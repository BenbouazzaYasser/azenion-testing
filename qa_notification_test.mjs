// Temporary QA script — DELETED after the test is complete.
// Seeds an unread "QA Notification Test" notification for ziy8ed@proton.me
// (actor: a disposable QA test user) and a "QA Announcement Test"
// platform announcement. Reuses the existing QA tooling in qa_sec_lib.mjs.
//
// Usage:
//   node qa_notification_test.mjs --seed
//   node qa_notification_test.mjs --cleanup
//
// State (ids) is persisted to /tmp/azenion_qa_seed_state.json.

import { admin, QA_TEST_PASSWORD } from "./qa_sec_lib.mjs";
import { readFileSync, writeFileSync, existsSync } from "fs";

const STATE_PATH = "/tmp/azenion_qa_seed_state.json";

const TARGET_EMAIL = "ziy8ed@proton.me";
const PREFIX = "qanotificationtest";
const NOTIFICATION_TYPE = "qa_test";
const NOTIFICATION_PREVIEW = "QA Notification Test";
const ANNOUNCEMENT_TITLE = "QA Announcement Test";

function loadState() {
  if (!existsSync(STATE_PATH)) return null;
  return JSON.parse(readFileSync(STATE_PATH, "utf8"));
}

function saveState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

async function findUserByEmail(email) {
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const found = data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (!data?.nextPage || data.nextPage <= page) return null;
    page = data.nextPage;
  }
}

async function seed() {
  if (loadState()) {
    throw new Error("State already exists; run --cleanup first before re-seeding.");
  }

  const target = await findUserByEmail(TARGET_EMAIL);
  if (!target) throw new Error(`Could not find user with email ${TARGET_EMAIL}`);
  console.log(`Target user: ${target.email} (${target.id})`);

  const stamp = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const email = `${PREFIX}_${stamp}@qa.azenion.test`;
  const username = `${PREFIX}_${stamp}`.slice(0, 20);
  const fullName = "QA Notification Test";

  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password: QA_TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { username, full_name: fullName },
    app_metadata: { provider: "email" },
  });
  if (createError) throw new Error(`createUser failed: ${createError.message}`);
  const actorId = newUser.user.id;

  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: actorId, username, full_name: fullName }, { onConflict: "id" });
  if (profileError) throw new Error(`profile upsert failed: ${profileError.message}`);

  const { data: notif, error: notifError } = await admin
    .from("notifications")
    .insert({
      user_id: target.id,
      actor_id: actorId,
      type: NOTIFICATION_TYPE,
      target_type: null,
      target_id: null,
      metadata: { preview: NOTIFICATION_PREVIEW },
    })
    .select("id, read")
    .single();
  if (notifError) throw new Error(`notification insert failed: ${notifError.message}`);

  const { data: announcement, error: annError } = await admin
    .from("platform_announcements")
    .insert({
      emoji: "🧪",
      title: ANNOUNCEMENT_TITLE,
      category: "QA",
      description: "QA test announcement — will be removed after verification.",
      badge: "QA",
      details: ["Verify this announcement is visible at the top of /announcements."],
    })
    .select("id")
    .single();
  if (annError) throw new Error(`announcement insert failed: ${annError.message}`);

  const state = {
    notificationId: notif.id,
    notificationRead: notif.read,
    announcementId: announcement.id,
    testUser: { id: actorId, email, username, fullName },
    target: { id: target.id, email: target.email },
    createdAt: new Date().toISOString(),
  };
  saveState(state);

  console.log("Seed complete:");
  console.log(`  Notification: id=${state.notificationId} read=${state.notificationRead}`);
  console.log(`  Announcement: id=${state.announcementId}`);
  console.log(`  Test user:    id=${state.testUser.id} email=${state.testUser.email} username=${state.testUser.username} fullName=${state.testUser.fullName}`);
}

async function cleanup() {
  const state = loadState();
  if (!state) throw new Error("No seed state found at " + STATE_PATH);

  const { error: notifDel } = await admin
    .from("notifications")
    .delete()
    .eq("id", state.notificationId);
  console.log(`Delete notification ${state.notificationId}: ${notifDel ? notifDel.message : "ok"}`);

  const { error: annDel } = await admin
    .from("platform_announcements")
    .delete()
    .eq("id", state.announcementId);
  console.log(`Delete announcement ${state.announcementId}: ${annDel ? annDel.message : "ok"}`);

  const { error: userDel } = await admin.auth.admin.deleteUser(state.testUser.id);
  console.log(`Delete test user ${state.testUser.id}: ${userDel ? userDel.message : "ok"}`);

  writeFileSync(STATE_PATH, "");
  console.log("Cleanup complete.");
}

const mode = process.argv[2] ?? "--seed";
if (mode === "--seed") {
  seed().catch((e) => {
    console.error("SEED FAILED:", e.message);
    process.exit(1);
  });
} else if (mode === "--cleanup") {
  cleanup().catch((e) => {
    console.error("CLEANUP FAILED:", e.message);
    process.exit(1);
  });
} else {
  console.error("Unknown mode. Use --seed or --cleanup.");
  process.exit(1);
}
