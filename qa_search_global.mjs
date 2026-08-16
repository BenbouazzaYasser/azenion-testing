// QA UI test: global search fixes.
//   1. @username search returns the user (leading @ stripped in globalSearch action).
//   2. Ctrl/Cmd+K opens exactly ONE palette (single shared hotkey via lib/global-search-hotkey).
//   3. Escape closes; result click opens profile preview without overlay interception;
//      desktop + mobile navbar buttons still open a single palette.
//
//   node qa_search_global.mjs

import { chromium } from "playwright-core";
import { createTestUser, admin, QA_TEST_PASSWORD } from "./qa_sec_lib.mjs";

const BASE = "http://localhost:3000";

const results = [];
function report(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " :: " + detail : ""}`);
}

function dialogs(page, name = "Search Azenion") {
  return page.locator(`[role="dialog"][aria-label="${name}"]`);
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

async function main() {
  const a = await createTestUser("qagls");
  const b = await createTestUser("qaglt");
  if (a.error || b.error) {
    console.log("SETUP FAIL", JSON.stringify({ a, b }).slice(0, 400));
    process.exit(1);
  }
  console.log(`Logged-in user:  ${a.email} (${a.username})`);
  console.log(`Search target:   ${b.username} (@${b.username})`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await page.fill("#login-identifier", a.email);
    await page.fill("#login-password", QA_TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector('button[aria-label="Search Azenion (Ctrl+K)"]', { timeout: 30000 });
    await dismissOnboarding(page);
    await page.goto(`${BASE}/feed`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('button[aria-label="Search Azenion (Ctrl+K)"]', { timeout: 30000 });
    await page.waitForTimeout(2500);
    await dismissOnboarding(page);

    // ---- 1. Ctrl+K opens exactly ONE palette
    report("no dialog before shortcut", (await dialogs(page).count()) === 0);
    await page.keyboard.press("Control+k");
    await dialogs(page).first().waitFor({ state: "visible", timeout: 10000 });
    report("Ctrl+K opens exactly ONE palette", (await dialogs(page).count()) === 1, `count=${await dialogs(page).count()}`);

    // ---- 2. @username search returns the user
    const input = page.locator('input[aria-label="Search Azenion"]');
    await input.fill(`@${b.username}`);
    const hit = dialogs(page).getByText(`@${b.username}`).first();
    await hit.waitFor({ state: "visible", timeout: 15000 });
    report("@username search finds the user", (await hit.count()) === 1, `query="@${b.username}"`);

    // ---- 3. clicking a result opens the profile preview (no overlay interception)
    await hit.click({ force: false }).catch(async () => {
      await hit.click({ force: true });
    });
    const preview = page.locator('[role="dialog"]:not([aria-label="Search Azenion"])');
    await preview.first().waitFor({ state: "visible", timeout: 10000 });
    report("result click opens profile preview (no overlay interception)", (await preview.count()) >= 1);
    await preview.getByRole("button", { name: "Close" }).last().click();
    await page.waitForTimeout(400);

    // ---- 4. Ctrl+K while open toggles it closed (single responder)
    await dialogs(page).first().waitFor({ state: "visible", timeout: 10000 });
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(500);
    report("Ctrl+K toggles the palette closed", (await dialogs(page).count()) === 0, `count=${await dialogs(page).count()}`);

    // ---- 5. plain username search still works
    await page.keyboard.press("Control+k");
    await dialogs(page).first().waitFor({ state: "visible", timeout: 10000 });
    await input.fill(b.username);
    const plainHit = dialogs(page).getByText(`@${b.username}`).first();
    await plainHit.waitFor({ state: "visible", timeout: 15000 });
    report("plain username search still works", (await plainHit.count()) === 1);

    // ---- 6. nonexistent @user -> no results
    await input.fill("@qaglt_definitely_missing");
    const noRes = dialogs(page).getByText("No results found.").first();
    await noRes.waitFor({ state: "visible", timeout: 15000 });
    report("unknown @user shows No results", (await noRes.count()) === 1);

    // ---- 7. Escape closes
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    report("Escape closes the palette", (await dialogs(page).count()) === 0, `count=${await dialogs(page).count()}`);

    // ---- 8. desktop navbar button opens exactly ONE palette
    await dismissOnboarding(page);
    await page.click('button[aria-label="Search Azenion (Ctrl+K)"]');
    await dialogs(page).first().waitFor({ state: "visible", timeout: 10000 });
    report("desktop button opens exactly ONE palette", (await dialogs(page).count()) === 1, `count=${await dialogs(page).count()}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // ---- 9. mobile navbar button opens exactly ONE palette
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector('button[aria-label="Search"]', { timeout: 15000 });
    await dismissOnboarding(page);
    await page.click('button[aria-label="Search"]');
    await dialogs(page).first().waitFor({ state: "visible", timeout: 10000 });
    report("mobile button opens exactly ONE palette", (await dialogs(page).count()) === 1, `count=${await dialogs(page).count()}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // ---- 10. after reload, Ctrl+K still opens a single palette
    await page.keyboard.press("Control+k");
    await dialogs(page).first().waitFor({ state: "visible", timeout: 10000 });
    report("Ctrl+K after reload opens exactly ONE palette", (await dialogs(page).count()) === 1, `count=${await dialogs(page).count()}`);
    await page.keyboard.press("Escape");
  } catch (e) {
    report("test run", false, e?.message ?? String(e));
  } finally {
    await browser.close();
  }

  for (const u of [a, b]) {
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