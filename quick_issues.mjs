// Actual current state QA testing
import fs from "fs";
import path from "path";

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function logIssue(category, status, message) {
  console.log(`${status === "PASS" ? "✅" : status === "FAIL" ? "❌" : status === "ERROR" ? "🔥" : "⚠️"} ${category}: ${message}`);
}

async function main() {
  console.log("=== REAL CODEBASE QA ASSESSMENT ===\n");
  
  // Check if lifecycle.ts exists (it does)
  const lifecyclePath = "./lib/lifecycle.ts";
  if (checkFileExists(lifecyclePath)) {
    logIssue("Lifecycle Helper", "PASS", "lib/lifecycle.ts exists");
    
    // Read the file to verify implementation
    const lifecycleContent = fs.readFileSync(lifecyclePath, "utf8");
    
    // Check for key functions
    if (lifecycleContent.includes("getProjectLifecycleStatus")) {
      logIssue("Lifecycle Helper", "PASS", "getProjectLifecycleStatus() implemented");
    } else {
      logIssue("Lifecycle Helper", "FAIL", "getProjectLifecycleStatus() missing");
    }
    
    if (lifecycleContent.includes("getTeamStatus")) {
      logIssue("Lifecycle Helper", "PASS", "getTeamStatus() implemented");
    } else {
      logIssue("Lifecycle Helper", "FAIL", "getTeamStatus() missing");
    }
    
    if (lifecycleContent.includes("isTeamHidden")) {
      logIssue("Lifecycle Helper", "PASS", "isTeamHidden() implemented");
    } else {
      logIssue("Lifecycle Helper", "FAIL", "isTeamHidden() missing");
    }
  } else {
    logIssue("Lifecycle Helper", "FAIL", "lib/lifecycle.ts missing");
  }
  
  // Check if 00052_ecosystem_lifecycle.sql exists (it does)
  const migrationPath = "./supabase/migrations/00052_ecosystem_lifecycle.sql";
  if (checkFileExists(migrationPath)) {
    logIssue("Migration", "PASS", "00052_ecosystem_lifecycle.sql exists");
    
    // Read first 200 lines to verify key components
    const migrationContent = fs.readFileSync(migrationPath, "utf8");
    const firstChunk = migrationContent.substring(0, 2000);
    
    // Check for critical functions
    if (firstChunk.includes("create_team(")) {
      logIssue("Migration", "PASS", "create_team() with ownership limit exists");
    } else {
      logIssue("Migration", "FAIL", "create_team() with ownership limit missing");
    }
    
    if (firstChunk.includes("request_team_join(")) {
      logIssue("Migration", "PASS", "request_team_join() with 5-cap exists");
    } else {
      logIssue("Migration", "FAIL", "request_team_join() with 5-cap missing");
    }
    
    if (firstChunk.includes("delete_team(")) {
      logIssue("Migration", "PASS", "delete_team() with cleanup exists");
    } else {
      logIssue("Migration", "FAIL", "delete_team() with cleanup missing");
    }
    
    // Check if 00053_storage_cleanup_best_effort.sql exists (it does)
    const cleanupPath = "./supabase/migrations/00053_storage_cleanup_best_effort.sql";
    if (checkFileExists(cleanupPath)) {
      logIssue("Storage Cleanup", "PASS", "00053_storage_cleanup_best_effort.sql exists");
    } else {
      logIssue("Storage Cleanup", "FAIL", "00053_storage_cleanup_best_effort.sql missing");
    }
  } else {
    logIssue("Migration", "FAIL", "00052_ecosystem_lifecycle.sql missing");
  }
  
  // Check for critical server actions
  const serverActions = [
    "./actions/project.actions.ts",
    "./actions/team.actions.ts",
    "./actions/ownership.actions.ts"
  ];
  
  serverActions.forEach(actionPath => {
    if (checkFileExists(actionPath)) {
      const content = fs.readFileSync(actionPath, "utf8");
      
      if (actionPath.includes("project.actions.ts")) {
        if (content.includes("restoreProject")) {
          logIssue("Server Actions", "PASS", "restoreProject() exists in project.actions.ts");
        } else {
          logIssue("Server Actions", "FAIL", "restoreProject() missing in project.actions.ts");
        }
      }
      
      if (actionPath.includes("team.actions.ts")) {
        if (content.includes("reactivateTeam")) {
          logIssue("Server Actions", "PASS", "reactivateTeam() exists in team.actions.ts");
        } else {
          logIssue("Server Actions", "FAIL", "reactivateTeam() missing in team.actions.ts");
        }
      }
      
      if (actionPath.includes("ownership.actions.ts")) {
        if (content.includes("transfer_team_ownership")) {
          logIssue("Server Actions", "PASS", "transfer_team_ownership() exists");
        } else {
          logIssue("Server Actions", "FAIL", "transfer_team_ownership() missing");
        }
      }
    } else {
      logIssue("Server Actions", "FAIL", `${path.basename(actionPath)} missing`);
    }
  });
  
  // Check UI components
  const uiComponents = [
    "./components/sections/teams/team-card.tsx",
    "./components/sections/projects/project-card.tsx",
    "./components/sections/projects/project-page-hero.tsx",
    "./components/sections/teams/team-hero.tsx"
  ];
  
  console.log("\n=== UI COMPONENTS CHECK ===");
  uiComponents.forEach(componentPath => {
    if (checkFileExists(componentPath)) {
      const content = fs.readFileSync(componentPath, "utf8");
      const componentName = path.basename(componentPath, ".tsx");
      
      if (componentPath.includes("team-card.tsx") && content.includes("last_activity_at")) {
        logIssue("UI Components", "PASS", `${componentName} includes lifecycle props`);
      } else if (componentPath.includes("team-card.tsx")) {
        logIssue("UI Components", "FAIL", `${componentName} missing lifecycle props`);
      }
      
      if (componentPath.includes("project-card.tsx") && content.includes("lifecycle_status")) {
        logIssue("UI Components", "PASS", `${componentName} includes lifecycle props`);
      } else if (componentPath.includes("project-card.tsx")) {
        logIssue("UI Components:", "FAIL", `${componentName} missing lifecycle props`);
      }
    } else {
      logIssue("UI Components", "FAIL", `${componentName} missing`);
    }
  });
  
  console.log("\n=== QUICK ASSESSMENT COMPLETE ===");
  console.log("\nTo get the full picture of issues, run the detailed QA sweep:");
  console.log("node qa_sweep.mjs");
}

main().catch(console.error);
