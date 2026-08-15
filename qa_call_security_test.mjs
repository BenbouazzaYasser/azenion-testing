import { createTestUser, userClient, admin, anon } from "./qa_sec_lib.mjs";

const { id: A, token: tokA, error: eA } = await createTestUser("qa_call_a");
if (eA) throw new Error(`create A failed: ${eA}`);
const { id: B, token: tokB, error: eB } = await createTestUser("qa_call_b");
if (eB) throw new Error(`create B failed: ${eB}`);
const { id: C, token: tokC, error: eC } = await createTestUser("qa_call_c");
if (eC) throw new Error(`create C failed: ${eC}`);

const clientA = userClient(tokA);
const clientB = userClient(tokB);
const clientC = userClient(tokC);

// Give the realtime layer real JWT claims (header-based auth alone doesn't reach it).
clientA.realtime.setAuth(tokA);
clientB.realtime.setAuth(tokB);
clientC.realtime.setAuth(tokC);

const { data: convId, error: convErr } = await clientA.rpc("get_or_create_conversation", {
  p_user_id: B,
});
if (convErr) throw new Error(`get_or_create_conversation failed: ${convErr.message}`);

const results = [];
const report = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " :: " + detail : ""}`);
};

const callId = crypto.randomUUID();

// 1. Member A can insert a call event as themselves
{
  const { error } = await clientA.from("call_events").insert({
    conversation_id: convId,
    sender_id: A,
    call_id: callId,
    event_type: "offer",
    payload: { kind: "audio", sdp: "test-sdp" },
  });
  report("member can insert call event", !error, error?.message);
}

// 2. Spoofed sender_id is rejected
{
  const { error } = await clientA.from("call_events").insert({
    conversation_id: convId,
    sender_id: B,
    call_id: callId,
    event_type: "answer",
    payload: { sdp: "x" },
  });
  report("spoofed sender_id rejected", !!error, error?.message ?? "accepted!");
}

// 3. Non-member C cannot insert into the conversation
{
  const { error } = await clientC.from("call_events").insert({
    conversation_id: convId,
    sender_id: C,
    call_id: callId,
    event_type: "ice",
    payload: { candidate: "x" },
  });
  report("non-member cannot insert", !!error, error?.message ?? "accepted!");
}

// 4. Non-member C cannot read the conversation's events (RLS -> empty)
{
  const { data, error } = await clientC
    .from("call_events")
    .select("id")
    .eq("conversation_id", convId);
  report("non-member cannot read events", !error && (data ?? []).length === 0, `${data?.length} rows`);
}

// 4b. get_call_peer: member resolves the caller profile; non-member cannot;
//     anon is not granted the function
{
  const { data: peer, error: peerErr } = await clientB
    .rpc("get_call_peer", { p_conversation_id: convId, p_user_id: A })
    .maybeSingle();
  report(
    "member resolves caller profile via get_call_peer",
    !peerErr && peer?.id === A && !!peer?.full_name,
    peerErr?.message ?? `name=${peer?.full_name}`,
  );

  const { data: outsider, error: outsiderErr } = await clientC
    .rpc("get_call_peer", { p_conversation_id: convId, p_user_id: A })
    .maybeSingle();
  report("non-member cannot resolve caller profile", !outsiderErr && outsider === null, JSON.stringify(outsider));

  const { error: anonErr } = await anon
    .rpc("get_call_peer", { p_conversation_id: convId, p_user_id: A });
  report("anon is not granted get_call_peer", !!anonErr, anonErr?.message ?? "accepted!");
}

// 5. Realtime: B (member) receives events, C (non-member) never does
{
  function watch(client, channelName, sentinel, timeoutMs = 12000) {
    const got = new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), timeoutMs);
      const channel = client
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "call_events" },
          (payload) => {
            if (payload.new?.sender_id === A && payload.new?.event_type === sentinel) {
              clearTimeout(timeout);
              void client.removeChannel(channel);
              resolve(true);
            }
          },
        );
      channel.subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          clearTimeout(timeout);
          void client.removeChannel(channel);
          resolve(false);
        }
      });
    });
    return got;
  }

  const memberGot = watch(clientB, `call-qa-member:${convId}`, "end");
  const outsiderGot = watch(clientC, `call-qa-outsider:${convId}`, "end");
  // Let both channels fully register (client SUBSCRIBED + server-side ack) before firing.
  await new Promise((r) => setTimeout(r, 4000));
  await clientA.from("call_events").insert({
    conversation_id: convId,
    sender_id: A,
    call_id: callId,
    event_type: "end",
    payload: {},
  });
  const [memberDelivered, outsiderDelivered] = await Promise.all([memberGot, outsiderGot]);
  report("realtime delivers events to members", memberDelivered === true);
  report("realtime does NOT deliver to non-members", outsiderDelivered !== true);
}

// 6. Ephemeral cleanup: old rows are purged on next insert
{
  const { error: oldErr } = await admin.from("call_events").insert({
    conversation_id: convId,
    sender_id: A,
    call_id: crypto.randomUUID(),
    event_type: "offer",
    payload: { kind: "audio", sdp: "stale" },
    created_at: new Date(Date.now() - 3600_000).toISOString(),
  });
  if (oldErr) throw new Error(`seed old row failed: ${oldErr.message}`);
  await clientA.from("call_events").insert({
    conversation_id: convId,
    sender_id: A,
    call_id: crypto.randomUUID(),
    event_type: "end",
    payload: {},
  });
  const { data } = await admin
    .from("call_events")
    .select("id")
    .eq("conversation_id", convId);
  const stale = (data ?? []).filter(() => false);
  const { data: staleRows } = await admin
    .from("call_events")
    .select("id, created_at")
    .eq("conversation_id", convId);
  const hasOld = (staleRows ?? []).some(
    (r) => new Date(r.created_at).getTime() < Date.now() - 600_000,
  );
  report("stale events purged (>15m)", !hasOld, `${staleRows?.length} rows remain`);
  void stale;
}

// 7. A blocked by B cannot signal (DB-level block enforcement)
{
  const { error: blockErr } = await clientB.from("user_blocks").upsert(
    { blocker_id: B, blocked_id: A },
    { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
  );
  if (blockErr) throw new Error(`block failed: ${blockErr.message}`);
  const { error } = await clientA.from("call_events").insert({
    conversation_id: convId,
    sender_id: A,
    call_id: crypto.randomUUID(),
    event_type: "offer",
    payload: { kind: "audio", sdp: "x" },
  });
  report("blocked user cannot signal", !!error, error?.message ?? "accepted!");
}

const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok).length;
console.log(`\n==== call_events security: ${pass} PASS, ${fail} FAIL ====`);
process.exit(fail > 0 ? 1 : 0);
