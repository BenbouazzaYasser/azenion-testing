//!/usr/bin/env node

import { createClient } from "/home/ziyad/Documents/Azenion/azenion-platform/lib/supabase/server";
import { createAdminClient } from "/home/ziyad/Documents/Azenion/azenion-platform/lib/supabase/admin";

async function testLifecycle() {
  console.log("=== LIFE CYCLE SYSTEM QA TESTS ===");
  const results = [];

  // Test 1: One-team ownership limit
  console.log("\n--- Test 1: One-team ownership limit ---");
  const stamp = Date.now().toString(36);
  const email1 = `qa_owner1_${stamp}@azenion`;
  const email2 = `qa_owner2_${stamp}@azenion`;

  try {
    const admin = createAdminClient();

    // Create first user
    const user1 = await admin.auth.admin.createUser({
      email: email1,
      password: "QaTest123!",
      email_confirm: true,
      user_metadata: { username: `owner1_${stamp}`, full_name: "QA Owner 1" }
    });
    if (user1.error) {
      results.push({
        name: "Create user 1",
        status: "FAIL",
        detail: user1.error.message || "Unknown error"
      });
    } else {
      const user1Id = user1.data.user.id;
      const user1Session = user1.data.session?.access_token;

      // Create second user
      const user2 = await admin.auth.admin.createUser({
        email: email2,
        password: "QaTest123!",
        email_confirm: true,
        user_metadata: { username: `owner2_${stamp}`, full_name: "QA Owner 2" }
      });
      if (user2.error) {
        results.push({
          name: "Create user 2",
          status: "FAIL",
          detail: user2.error.message || "Unknown error"
        });
      } else {
        const user2Id = user2.data.user.id;
        const user2Session = user2.data.session?.access_token;

        // Create first team (should succeed)
        const team1 = await admin
          .from("teams")
          .insert({
            name: "Owner 1 Team",
            slug: "owner1-team-" + stamp,
            owner_id: user1Id,
            description: "First team by owner 1",
            visibility: "public"
          })
          .select("id")
          .single();
        if (team1.error) {
          results.push({
            name: "Create first team (owner 1)",
            status: "FAIL",
            detail: team1.error.message || "Unknown error"
          });
        } else {
          // Second user attempts to create a team (should fail)
          const supabase2 = createClient(undefined, undefined, {
            global: {
              headers: {
                Authorization: "Bearer " + user2Session
              }
            }
          });
          const team2 = await supabase2.rpc("create_team", {
            p_name: "Owner 2 Team",
            p_slug: "owner2-team-" + stamp,
            p_description: "Second team by owner 2",
            p_visibility: "public",
            p_logo_url: null
          });
          if (team2.error && team2.error.message.includes("can only own one team")) {
            results.push({
              name: "Second user blocked from creating team (ownership limit)",
              status: "PASS",
              detail: "Correctly blocked by ownership limit"
            });
          } else {
            results.push({
              name: "Second user blocked from creating team (ownership limit)",
              status: "FAIL",
              detail: team2.error?.message || "Should have failed but succeeded"
            });
          }
        }
      }
    }
  } catch (error) {
    results.push({
      name: "Lifecycle ownership limit test",
      status: "ERROR",
      detail: error.message || "Unexpected error"
    });
  }

  // Test 2: Five-team membership cap
  console.log("\n--- Test 2: Five-team membership cap ---");
  const stamp2 = Date.now().toString(36);

  try {
    const admin = createAdminClient();

    // Create owner and member
    const owner = await admin.auth.admin.createUser({
      email: "qa_owner_" + stamp2 + "@azenion",
      password: "QaTest123!",
      email_confirm: true,
      user_metadata: { username: "owner_" + stamp2, full_name: "QA Owner" }
    });
    const member = await admin.auth.admin.createUser({
      email: "qa_member_" + stamp2 + "@azenion",
      password: "QaTest123!",
      email_confirm: true,
      user_metadata: { username: "member_" + stamp2, full_name: "QA Member" }
    });

    if (owner.error) {
      results.push({
        name: "Setup users for membership cap test",
        status: "FAIL",
        detail: owner.error.message || "Unknown error"
      });
    } else {
      const ownerId = owner.data.user.id;
      const memberId = member.data.user.id;
      const memberSession = member.data.session?.access_token;

      // Owner creates 5 teams, adds member to all of them
      const teamIds = [];
      for (let i = 0; i < 5; i++) {
        const { data: team } = await admin
          .from("teams")
          .insert({
            name: "Owner Team " + i,
            slug: "owner-team-" + i + "-" + stamp2,
            owner_id: ownerId,
            visibility: "public"
          })
          .select("id")
          .single();
        if (team?.id) {
          await admin
            .from("team_members")
            .insert({
              team_id: team.id,
              user_id: memberId,
              role: "member"
            });
          teamIds.push(team.id);
        }
      }

      // Create a 6th team for the member to try to join via request
      const { data: sixthTeam } = await admin
        .from("teams")
        .insert({
          name: "Sixth Team",
          slug: "sixth-team-" + stamp2,
          owner_id: ownerId,
          visibility: "public"
        })
        .select("id")
        .single();

      if (!sixthTeam?.id) {
        results.push({
          name: "Create sixth team for membership cap test",
          status: "FAIL",
          detail: "Could not create sixth team"
        });
      } else {
        const anon = createClient(undefined, undefined, {
          global: {
            headers: {
              Authorization: "Bearer " + memberSession
            }
          }
        });

        const request = await anon.rpc("request_team_join", {
          p_team_id: sixthTeam.id,
          p_message: "Join request for sixth team"
        });

        if (request.error && request.error.message.includes("can join at most 5 teams")) {
          results.push({
            name: "Member blocked from joining sixth team (membership cap)",
            status: "PASS",
            detail: "Correctly blocked by 5-team membership cap"
          });
        } else {
          results.push({
            name: "Member blocked from joining sixth team (membership cap)",
            status: "FAIL",
            detail: request.error?.message || "Should have failed but succeeded"
          });
        }
      }
    }
  } catch (error) {
    results.push({
      name: "Lifecycle membership cap test",
      status: "ERROR",
      detail: error.message || "Unexpected error"
    });
  }

  // Test 3: Project lifecycle (status transitions)
  console.log("\n--- Test 3: Project lifecycle status transitions ---");
  const stamp3 = Date.now().toString(36);

  try {
    const admin = createAdminClient();

    // Create users and team
    const owner = await admin.auth.admin.createUser({
      email: "qa_owner3_" + stamp3 + "@azenion",
      password: "QaTest123!",
      email_confirm: true,
      user_metadata: { username: "owner3_" + stamp3, full_name: "QA Owner 3" }
    });
    const member = await admin.auth.admin.createUser({
      email: "qa_member3_" + stamp3 + "@azenion",
      password: "QaTest123!",
      email_confirm: true,
      user_metadata: { username: "member3_" + stamp3, full_name: "QA Member 3" }
    });

    if (owner.error || member.error) {
      results.push({
        name: "Setup users for project lifecycle test",
        status: "FAIL",
        detail: owner.error?.message || member.error?.message || "Unknown error"
      });
    } else {
      const ownerId = owner.data.user.id;
      const memberId = member.data.user.id;

      // Create a team
      const { data: team } = await admin
        .from("teams")
        .insert({
          name: "Test Team",
          slug: "test-team-" + stamp3,
          owner_id: ownerId,
          visibility: "public"
        })
        .select("id")
        .single();

      if (!team?.id) {
        results.push({
          name: "Create team for project lifecycle test",
          status: "FAIL",
          detail: "Could not create team"
        });
      } else {
        // Add member to team
        await admin
          .from("team_members")
          .insert({
            team_id: team.id,
            user_id: memberId,
            role: "member"
          });

        // Create a project
        const { data: project } = await admin
          .from("projects")
          .insert({
            name: "Test Project",
            slug: "test-project-" + stamp3,
            team_id: team.id,
            owner_id: ownerId,
            visibility: "public",
            lifecycle_status: "ACTIVE",
            last_activity_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
          })
          .select("id")
          .single();

        if (!project?.id) {
          results.push({
            name: "Create project for lifecycle test",
            status: "FAIL",
            detail: "Could not create project"
          });
        } else {
          // Verify the project lifecycle status
          const { data: projects, error } = await admin
            .from("projects")
            .select("*")
            .eq("id", project.id);

          if (error) {
            results.push({
              name: "Fetch project for lifecycle validation",
              status: "FAIL",
              detail: error.message || "Unknown error"
            });
          } else if (!projects || projects.length === 0) {
            results.push({
              name: "Fetch project for lifecycle validation",
              status: "FAIL",
              detail: "No project found"
            });
          } else {
            const p = projects[0];
            if (p.lifecycle_status === "INACTIVE") {
              results.push({
                name: "Project lifecycle status computed correctly (40 days ago => INACTIVE)",
                status: "PASS",
                detail: "Computed status: " + p.lifecycle_status
              });
            } else {
              results.push({
                name: "Project lifecycle status computed correctly (40 days ago => INACTIVE)",
                status: "FAIL",
                detail: "Expected INACTIVE, got " + p.lifecycle_status
              });
            }
          }
        }
      }
    }
  } catch (error) {
    results.push({
      name: "Project lifecycle status test",
      status: "ERROR",
      detail: error.message || "Unexpected error"
    });
  }

  // Test 4: Team lifecycle status transitions
  console.log("\n--- Test 4: Team lifecycle status transitions ---");
  const stamp4 = Date.now().toString(36);

  try {
    const admin = createAdminClient();

    // Create a user
    const user = await admin.auth.admin.createUser({
      email: "qa_user4_" + stamp4 + "@azenion",
      password: "QaTest123!",
      email_confirm: true,
      user_metadata: { username: "user4_" + stamp4, full_name: "QA User 4" }
    });

    if (user.error) {
      results.push({
        name: "Create user for team lifecycle test",
        status: "FAIL",
        detail: user.error.message || "Unknown error"
      });
    } else {
      const userId = user.data.user.id;

      // Create a team with old activity (45 days ago)
      const { data: team } = await admin
        .from("teams")
        .insert({
          name: "Test Team",
          slug: "test-team-lifecycle-" + stamp4,
          owner_id: userId,
          visibility: "public",
          status: "active",
          last_activity_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select("id")
        .single();

      if (!team?.id) {
        results.push({
          name: "Create team for lifecycle status test",
          status: "FAIL",
          detail: "Could not create team"
        });
      } else {
        // Verify the team lifecycle status
        const { data: teams, error } = await admin
          .from("teams")
          .select("id, status")
          .eq("id", team.id);

        if (error) {
          results.push({
            name: "Fetch team for lifecycle status validation",
            status: "FAIL",
            detail: error.message || "Unknown error"
          });
        } else if (!teams || teams.length === 0) {
          results.push({
            name: "Fetch team for lifecycle status validation",
            status: "FAIL",
            detail: "No team found"
          });
        } else {
          const t = teams[0];
          if (t.status === "inactive") {
            results.push({
              name: "Team lifecycle status computed correctly (45 days ago => inactive)",
              status: "PASS",
              detail: "Computed status: " + t.status
            });
          } else {
            results.push({
              name: "Team lifecycle status computed correctly (45 days ago => inactive)",
              status: "FAIL",
              detail: "Expected inactive, got " + t.status
            });
          }
        }
      }
    }
  } catch (error) {
    results.push({
      name: "Team lifecycle status test",
      status: "ERROR",
      detail: error.message || "Unexpected error"
    });
  }

  console.log("\n=== LIFE CYCLE SYSTEM QA TEST SUMMARY ===");
  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.name}: ${r.status} - ${r.detail}`);
  });

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const errors = results.filter((r) => r.status === "ERROR").length;

  console.log(`\nSUMMARY: ${passed} PASSED, ${failed} FAILED, ${errors} ERRORS`);
  return { passed, failed, errors, results };
}

export default testLifecycle();
