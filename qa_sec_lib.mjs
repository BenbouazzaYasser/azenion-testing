import { createClient } from "/home/ziyad/Documents/Azenion/azenion-platform/node_modules/@supabase/supabase-js/dist/index.cjs";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const env = readFileSync(join("/home/ziyad/Documents/Azenion/azenion-platform/.env.local"), "utf8");
const get = (k) => (env.match(new RegExp("^" + k + "=(.*)$", "m")) || [])[1]?.trim();

export const URL = get("NEXT_PUBLIC_SUPABASE_URL");
export const ANON = get("NEXT_PUBLIC_SUPABASE_ANON_KEY");
export const SVC = get("SUPABASE_SERVICE_ROLE_KEY");

export const admin = createClient(URL, SVC, { auth: { autoRefreshToken: false, persistSession: false } });

export function userClient(accessToken) {
  return createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const anon = createClient(URL, ANON, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "SecTest123!";

export async function createTestUser(prefix) {
  const stamp = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const email = `${prefix}_${stamp}@qa.azenion.test`;
  const username = `${prefix}_${stamp}`.slice(0, 20);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { username, full_name: `QA ${prefix}` },
    app_metadata: { provider: "email" },
  });
  if (error) {
    return { error };
  }
  // create profile row if trigger didn't
  const uid = data.user.id;
  const { error: perr } = await admin.from("profiles").upsert(
    { id: uid, username, full_name: `QA ${prefix}` },
    { onConflict: "id" },
  );
  if (perr) {
    return { error: perr };
  }
  // sign in to get a token
  const { data: sess, error: serr } = await userClient("").auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (serr) {
    // try admin generate link
    const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    return { error: `signin failed: ${serr.message}`, link: link?.properties?.action_link };
  }
  return { id: uid, email, username, token: sess.session.access_token, user: sess.user };
}

export const summary = [];
export function report(name, ok, detail) {
  summary.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " :: " + detail : ""}`);
}

export async function cleanup() {
  const { data } = await admin.from("auth.users").select("id, email").ilike("email", "%@security.azenion.test");
  // above may not work on auth.users via REST; handled elsewhere
  return data;
}

export function printSummary() {
  const pass = summary.filter((s) => s.ok).length;
  const fail = summary.filter((s) => !s.ok).length;
  console.log(`\n==== ${pass} PASS, ${fail} FAIL ====`);
  return { pass, fail };
}