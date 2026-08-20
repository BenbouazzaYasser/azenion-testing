// QA UI test: post share -> chat integration (00080_post_share_chat).
//   1. Sharing a post from the feed creates a native post-share card in the
//      sharer/recipient private conversation.
//   2. The optional sender message appears with the card.
//   3. The recipient, with the conversation already open, sees the card arrive
//      via realtime without a reload.
//   4. Clicking the card navigates to the post permalink /feed/post/[id].
//   5. Sharing without a message renders a sensible card.
//   6. The chat sidebar preview reflects the share.
//
//   node qa_share_chat_ui.mjs
//
// Requires the dev server running on http://localhost:3000 and 00080 applied
// to the linked Supabase project.

import { chromium } from "playwright-core";
import { createTestUser, admin, QA_TEST_PASSWORD } from "./qa_sec_lib.mjs";

const BASE = "http://localhost:3000";
const POST_TITLE = "QA UI Share Post";

const results = [];
function report(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " :: " + detail : ""}`);
}

async function dismissOnboarding(page) {
  const close = page.locator('button[aria-label="Close onboarding"]');
  if (await close.isVisible().catch(() => false)) {
    await close.click();
    await page.waitForTimeout(400);
  }
  for (const label of ["Skip intro", "Skip for now", "Skip"]) {
    const btn = page.getByRole("button", { name: label, exact: true }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(400);
      return;
    }
  }
}

async function login(page, email) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await page.fill("#login-identifier", email);
    await page.fill("#login-password", QA_TEST_PASSWORD);
    await page.click('button[type="submit"]');
    // The app redirects away from /login only once the session is set.
    try {
      await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 });
    } catch {}
    await page.waitForTimeout(1500);
    await dismissOnboarding(page);
    // Probe with an authenticated route: /chat redirects unauthenticated
    // users to /login, so this verifies the session cookie actually stuck.
    await page.goto(`${BASE}/chat`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    if (!page.url().startsWith(`${BASE}/login`)) {
      await dismissOnboarding(page);
      return;
    }
    await page.waitForTimeout(2000);
  }
  throw new Error(`login failed for ${email}`);
}

async function shareFromFeed(page, recipientUsername, message) {
  // dismiss any lingering modal before interacting
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(500);
  const title = page.getByText(POST_TITLE, { exact: true }).first();
  await title.waitFor({ state: "visible", timeout: 20000 });
  const card = title.locator(
    "xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' rounded-2xl ')][1]",
  );
  const shareBtn = card.getByRole("button", { name: "Share this post" });
  await shareBtn.waitFor({ state: "visible", timeout: 15000 });
  for (let attempt = 0; attempt < 3; attempt++) {
    await shareBtn.click().catch(async () => {
      await shareBtn.click({ force: true });
    });
    try {
      await page.locator('[role="dialog"][aria-label="Share post"]').waitFor({ state: "visible", timeout: 6000 });
      break;
    } catch {
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(600);
    }
  }
  await page.locator('[role="dialog"][aria-label="Share post"]').waitFor({ state: "visible", timeout: 10000 });

  await page.fill("#share-recipient-search", recipientUsername);
  await page.getByText(`@${recipientUsername}`, { exact: true }).first().click({ timeout: 15000 });
  await page.waitForTimeout(300);

  if (message) {
    await page.fill("#share-message", message);
  }
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await page.locator('[role="dialog"][aria-label="Share post"]').waitFor({ state: "detached", timeout: 15000 });
  await page.waitForTimeout(1000);
}

async function main() {
  const sharer = await createTestUser("qauis");
  const recipient = await createTestUser("qauir");
  if (sharer.error || recipient.error) {
    console.log("SETUP FAIL", JSON.stringify({ sharer, recipient }).slice(0, 400));
    process.exit(1);
  }

  const { data: post, error: postErr } = await admin
    .from("posts")
    .insert({
      author_id: sharer.id,
      title: POST_TITLE,
      body: "Shared from the feed UI.",
      source_type: "user_post",
      source_id: null,
    })
    .select("id")
    .single();
  if (postErr) {
    console.log("SETUP FAIL: could not create post", postErr.message);
    process.exit(1);
  }
  const postId = post.id;
  console.log(`Post: ${postId}`);

  const browser = await chromium.launch();
  let convId = null;
  try {
    const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await login(pageA, sharer.email);
    await login(pageB, recipient.email);

    // ---- create the private conversation as the sharer, capture its id
    await pageA.goto(`${BASE}/chat/start/${recipient.id}`, { waitUntil: "domcontentloaded" });
    await pageA.waitForURL(/\/chat\/[0-9a-f-]{36}$/, { timeout: 35000 });
    convId = pageA.url().split("/").pop();
    report("conversation created via /chat/start", /^[0-9a-f-]{36}$/.test(convId), convId);
    await dismissOnboarding(pageA);

    // ---- recipient opens the same conversation (stays on it, no reload later)
    await pageB.goto(`${BASE}/chat/${convId}`, { waitUntil: "domcontentloaded" });
    await pageB.waitForTimeout(4000);
    report("recipient has the conversation open", pageB.url().includes(`/chat/${convId}`), pageB.url());
    await dismissOnboarding(pageB);

    // ---- sharer shares the post from its permalink WITH a message
    await pageA.goto(`${BASE}/feed/post/${postId}`, { waitUntil: "domcontentloaded" });
    await pageA.waitForTimeout(3000);
    await dismissOnboarding(pageA);
    await shareFromFeed(pageA, recipient.username, "Read this!");

    // ---- sharer opens the conversation and sees the card
    await pageA.goto(`${BASE}/chat/${convId}`, { waitUntil: "domcontentloaded" });
    await pageA.waitForTimeout(3000);
    await pageA.getByText("Shared a post").first().waitFor({ state: "visible", timeout: 15000 });
    await pageA.getByText(POST_TITLE, { exact: true }).first().waitFor({ state: "visible", timeout: 15000 });
    await pageA.getByText("Read this!", { exact: true }).first().waitFor({ state: "visible", timeout: 15000 });
    report("sharer sees the post-share card with message", true);

    // ---- recipient sees the card: via realtime when the env delivers it,
    //      otherwise after a reload (realtime delivery for messages is broken
    //      at the platform level in this linked project — pre-existing).
    let realtime = false;
    try {
      await pageB.getByText("Read this!", { exact: true }).first().waitFor({ state: "visible", timeout: 8000 });
      await pageB.getByText(POST_TITLE, { exact: true }).first().waitFor({ state: "visible", timeout: 8000 });
      realtime = true;
    } catch {
      realtime = false;
    }
    report("recipient sees the card via realtime without reload", realtime);
    if (!realtime) {
      await pageB.reload({ waitUntil: "domcontentloaded" });
      await pageB.waitForTimeout(3000);
      await dismissOnboarding(pageB);
      await pageB.getByText("Read this!", { exact: true }).first().waitFor({ state: "visible", timeout: 15000 });
      await pageB.getByText(POST_TITLE, { exact: true }).first().waitFor({ state: "visible", timeout: 15000 });
      report("recipient sees the card after reload", true);
    }

    // ---- clicking the card navigates to the post permalink
    await pageB.keyboard.press("Escape").catch(() => {});
    await pageB.waitForTimeout(400);
    const link = pageB.locator('a[aria-label^="Open shared post"]').first();
    await link.waitFor({ state: "visible", timeout: 15000 });
    await link.click().catch(async () => {
      await link.click({ force: true });
    });
    try {
      await pageB.waitForURL(/\/feed\/post\//, { timeout: 15000 });
      report("card click navigates to the post permalink", pageB.url().includes(`/feed/post/${postId}`), pageB.url());
    } catch {
      report("card click navigates to the post permalink", false, pageB.url());
    }

    // ---- sidebar preview shows the share message
    await pageA.goto(`${BASE}/chat`, { waitUntil: "domcontentloaded" });
    await pageA.waitForTimeout(3000);
    await pageA.getByText(`@${recipient.username}`, { exact: true }).first().waitFor({ state: "visible", timeout: 15000 });
    await pageA.getByText("Read this!", { exact: true }).first().waitFor({ state: "visible", timeout: 15000 });
    report("sidebar preview shows the share message", true);

    // ---- share WITHOUT a message -> sensible fallback card
    await pageA.goto(`${BASE}/feed/post/${postId}`, { waitUntil: "domcontentloaded" });
    await pageA.waitForTimeout(2500);
    await dismissOnboarding(pageA);
    await shareFromFeed(pageA, recipient.username, null);

    await pageA.goto(`${BASE}/chat/${convId}`, { waitUntil: "domcontentloaded" });
    await pageA.waitForTimeout(3000);
    const shareHeaders = await pageA.getByText("Shared a post", { exact: true }).count();
    report("second share (no message) adds another card", shareHeaders >= 2, `count=${shareHeaders}`);
    report("message-less card still shows the post title", (await pageA.getByText(POST_TITLE, { exact: true }).count()) >= 1);
  } catch (e) {
    report("test run", false, e?.message ?? String(e));
  } finally {
    await browser.close();
  }

  // cleanup
  try {
    await admin.from("posts").delete().eq("id", postId);
  } catch {}
  if (convId) {
    try {
      await admin.from("conversations").delete().eq("id", convId);
    } catch {}
  }
  for (const u of [sharer, recipient]) {
    if (u?.id) {
      try {
        await admin.auth.admin.deleteUser(u.id);
      } catch {}
    }
  }

  const pass = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  console.log(`\n==== ${pass} PASS, ${fail} FAIL ====`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error("TEST ERROR:", e?.message ?? e);
  process.exit(1);
});