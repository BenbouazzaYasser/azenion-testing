import { createTestUser, userClient, admin, anon, report, printSummary, cleanup } from "./qa_sec_lib.mjs";

const privTeam = "ca70817e-e646-4bc1-ae29-be3927c86e21";
const privProj = "1b81122c-5a2a-4536-8ae7-a4ff09379737";
const privTeamPost = "91ffe10e-5e10-443d-9b15-a2c803a41d84";
const privProjPost = "d2c15726-e886-43d2-a487-12f0fd223144";

// unrelated authenticated user
const u = await createTestUser("seca");
if (u.error) { console.log("SETUP FAIL", u.error); process.exit(1); }
const c = userClient(u.token);
const uid = u.id;

console.log("== 1. USER ISOLATION ==");
// try to modify another user's profile (target = dev profile)
let target = "142863a0-2145-4083-a7c6-7b71d920ba79";
let r = await c.from("profiles").update({ bio: "HACKED" }).eq("id", target);
report("cannot update another profile", r.error != null, r.error?.message ?? "ALLOWED!");
// read another profile (RLS: own profile only)
r = await c.from("profiles").select("*").eq("id", target);
report("cannot read another profile", (r.data?.length ?? 0) === 0, r.data?.length ? "LEAKED: " + JSON.stringify(r.data[0]) : "");

// modify another user's settings
r = await c.from("user_settings").update({ theme: "dark" }).eq("user_id", target);
report("cannot update another settings", r.error != null, r.error?.message ?? "ALLOWED!");
r = await c.from("user_settings").select("*").eq("user_id", target);
report("cannot read another settings", (r.data?.length ?? 0) === 0, r.data?.length ? "LEAKED" : "");

// modify another user's notifications
r = await c.from("notifications").update({ read: true }).eq("user_id", target);
report("cannot update another notifications", r.error != null, r.error?.message ?? "ALLOWED!");
r = await c.from("notifications").select("*").eq("user_id", target);
report("cannot read another notifications", (r.data?.length ?? 0) === 0, r.data?.length ? "LEAKED " + r.data.length : "");

// onboarding state is on profiles
r = await c.from("profiles").update({ onboarding_step: "done" }).eq("id", target);
report("cannot modify another onboarding", r.error != null, r.error?.message ?? "ALLOWED!");

// get_user_teams enumeration of another user
r = await c.rpc("get_user_teams", { p_user_id: target });
report("cannot enumerate another user's teams", r.error != null, r.error?.message ?? "LEAKED: " + JSON.stringify(r.data));

console.log("\n== 2. TEAMS ==");
// update another team's settings via RPC
r = await c.rpc("update_team", { p_team_id: privTeam, p_name: "HACKED" });
report("cannot update private team settings", r.error != null, r.error?.message ?? "ALLOWED!");
// delete another team
r = await c.rpc("delete_team", { p_team_id: privTeam });
report("cannot delete another team", r.error != null, r.error?.message ?? "ALLOWED!");
// transfer ownership improperly
r = await c.rpc("transfer_team_ownership", { p_team_id: privTeam, p_new_owner_id: uid });
report("cannot transfer team ownership", r.error != null, r.error?.message ?? "ALLOWED!");
// add/remove member without permission (direct RLS insert/delete)
r = await c.from("team_members").insert({ team_id: privTeam, user_id: uid, role: "member" });
report("cannot insert into team_members", r.error != null, r.error?.message ?? "ALLOWED!");
r = await c.from("team_members").delete().eq("team_id", privTeam).eq("user_id", target);
report("cannot delete team member", r.error != null, r.error?.message ?? "ALLOWED!");
// change member roles via RPC
r = await c.rpc("update_member_role", { p_team_id: privTeam, p_user_id: target, p_role: "admin" });
report("cannot change member role", r.error != null, r.error?.message ?? "ALLOWED!");
// access private team data
r = await c.from("teams").select("*").eq("id", privTeam);
report("cannot read private team", (r.data?.length ?? 0) === 0, r.data?.length ? "LEAKED: " + JSON.stringify(r.data) : "");
// access private team feed content via RPC as unrelated user
r = await c.rpc("get_global_feed_posts", { p_filter: null, p_page: 1, p_page_size: 200, p_viewer: uid });
const ids = new Set((r.data ?? []).map(p => p.id));
report("private team post not in unrelated user feed", !ids.has(privTeamPost), ids.has(privTeamPost) ? "LEAKED priv team post" : "");
// join private team without authorization
r = await c.rpc("join_team", { p_team_id: privTeam });
report("cannot join private team", r.error != null, r.error?.message ?? "ALLOWED!");

console.log("\n== 3. PROJECTS ==");
r = await c.rpc("update_project", { p_project_id: privProj, p_name: "HACKED" });
report("cannot update private project", r.error != null, r.error?.message ?? "ALLOWED!");
r = await c.rpc("delete_project", { p_project_id: privProj });
report("cannot delete another project", r.error != null, r.error?.message ?? "ALLOWED!");
r = await c.rpc("transfer_project_ownership", { p_project_id: privProj, p_new_owner_id: uid });
report("cannot transfer project ownership", r.error != null, r.error?.message ?? "ALLOWED!");
r = await c.from("project_members").insert({ project_id: privProj, user_id: uid, role: "member" });
report("cannot insert into project_members", r.error != null, r.error?.message ?? "ALLOWED!");
r = await c.from("projects").select("*").eq("id", privProj);
report("cannot read private project", (r.data?.length ?? 0) === 0, r.data?.length ? "LEAKED: " + JSON.stringify(r.data) : "");
r = await c.rpc("join_project", { p_project_id: privProj });
report("cannot join private/invite-only project", r.error != null, r.error?.message ?? "ALLOWED!");
r = await c.rpc("get_global_feed_posts", { p_filter: null, p_page: 1, p_page_size: 200, p_viewer: uid });
const ids2 = new Set((r.data ?? []).map(p => p.id));
report("private project post not in unrelated user feed", !ids2.has(privProjPost), ids2.has(privProjPost) ? "LEAKED priv project post" : "");

// comments/likes leakage: read comments on private post
r = await c.from("update_comments").select("*").eq("target_type", "team_update").eq("target_id", "77010415-d015-48bf-a83f-5b049945926e");
report("cannot read comments on private team update", (r.data?.length ?? 0) === 0, r.data?.length ? "LEAKED comments: " + r.data.length : "");
r = await c.from("update_likes").select("*").eq("target_type", "team_update").eq("target_id", "77010415-d015-48bf-a83f-5b049945926e");
report("cannot read likes on private team update", (r.data?.length ?? 0) === 0, r.data?.length ? "LEAKED likes: " + r.data.length : "");

printSummary();
