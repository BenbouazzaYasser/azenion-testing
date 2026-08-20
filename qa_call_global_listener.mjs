// QA for the global incoming-call listener architecture:
//  - Receiver subscribes to call_events with NO filter (like CallProvider),
//    so calls arrive regardless of which page they are on.
//  - RLS still restricts delivery: a non-member of the conversation must NOT
//    receive the offer.
//  - Decline signaling flows back to the caller.
import { createTestUser, userClient, admin, URL, ANON, QA_TEST_PASSWORD } from "./qa_sec_lib.mjs";
import { createRequire } from "module";
const require = createRequire("/home/ziyad/Documents/Azenion/azenion-platform/");
const { createClient } = require("@supabase/supabase-js");

const mk = () => createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
const results = [];
const report = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " :: " + detail : ""}`);
};

// Users A (caller), B (recipient), C (non-member outsider), D (A's other chat)
const A = await createTestUser("qa_gl_a");
const B = await createTestUser("qa_gl_b");
const C = await createTestUser("qa_gl_c");
const D = await createTestUser("qa_gl_d");
if (A.error || B.error || C.error || D.error) throw new Error("user create failed");

const clientA = userClient(A.token);
const clientB = userClient(B.token);
const clientC = userClient(C.token);
clientA.realtime.setAuth(A.token);
clientB.realtime.setAuth(B.token);
clientC.realtime.setAuth(C.token);

const { data: convAB } = await clientA.rpc("get_or_create_conversation", { p_user_id: B.id });
const { data: convAD } = await clientA.rpc("get_or_create_conversation", { p_user_id: D.id });
if (!convAB || !convAD) throw new Error("conversation create failed");

// Global, unfiltered listener — exactly what CallProvider subscribes to.
function globalListener(client, tag, expectConversation, expectSender) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve({ tag, ok: false, reason: "timeout" }), 15000);
    const channel = client
      .channel(`calls-qa:${tag}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_events" },
        (payload) => {
          const row = payload.new;
          if (row?.event_type === "offer" && row?.sender_id === expectSender) {
            clearTimeout(timeout);
            void client.removeChannel(channel);
            resolve({ tag, ok: row.conversation_id === expectConversation, reason: `got offer in ${row.conversation_id}` });
          }
        },
      )
      .subscribe();
  });
}

// B listens globally; C (non-member of A-B) also listens globally.
const bGot = globalListener(clientB, "b", convAB, A.id);
const cGot = globalListener(clientC, "c", convAB, A.id);
await new Promise((r) => setTimeout(r, 4000)); // let subscriptions register

const callId = crypto.randomUUID();
await clientA.from("call_events").insert({
  conversation_id: convAB,
  sender_id: A.id,
  call_id: callId,
  event_type: "offer",
  payload: { kind: "audio", sdp: "global-listen" },
});

const [bRes, cRes] = await Promise.all([bGot, cGot]);
report("B receives offer via GLOBAL (unfiltered) subscription", bRes.ok === true, bRes.reason ?? "");
report("non-member C does NOT receive B's offer", cRes.ok !== true, cRes.reason ?? "timeout (correct)");

// Decline flows back: B declines, A (global listener) receives the decline.
const aGot = new Promise((resolve) => {
  const timeout = setTimeout(() => resolve("timeout"), 15000);
  const ch = clientA
    .channel("calls-qa:adecline")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "call_events" },
      (payload) => {
        const row = payload.new;
        if (row?.event_type === "decline" && row?.call_id === callId) {
          clearTimeout(timeout);
          void clientA.removeChannel(ch);
          resolve("ok");
        }
      },
    )
    .subscribe();
});
await new Promise((r) => setTimeout(r, 4000));
await clientB.from("call_events").insert({
  conversation_id: convAB,
  sender_id: B.id,
  call_id: callId,
  event_type: "decline",
  payload: {},
});
const declineRes = await aGot;
report("decline signaling reaches the caller", declineRes === "ok", declineRes);

console.log(`\n==== call global listener: ${results.filter((r) => r.ok).length}/${results.length} PASS ====`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
