// Quick test to identify real issues
import { createClient } from './lib/supabase/client';
import { createAdminClient } from './lib/supabase/admin';

async function identifyIssues() {
  console.log('=== TESTING CURRENT IMPLEMENTATION ===\n');
  
  // Test 1: Check if storage cleanup migration is needed
  console.log('1. Testing storage cleanup issue...');
  
  // Check if delete_team RPC still has storage delete issues
  try {
    const client = createClient();
    const { data, error } = await client.rpc('delete_team', { p_team_id: 'test-id' });
    if (error?.message?.includes('Direct deletion from storage tables')) {
      console.log('❌ CRITICAL: delete_team still has storage cleanup issue');
      console.log('   Error:', error.message);
    } else {
      console.log('✅ Storage cleanup appears fixed');
    }
  } catch (e) {
    console.log('⚠️ Could not test storage cleanup:', e.message);
  }
  
  // Test 2: Check if lifecycle features are properly integrated
  console.log('\n2. Testing lifecycle integration...');
  
  // Create a test user
  const admin = createAdminClient();
  const stamp = Date.now().toString(36);
  
  try {
    const { data: user, error: userError } = await admin.auth.admin.createUser({
      email: `test_${stamp}@example.com`,
      password: "Test123!",
      email_confirm: true,
      user_metadata: { username: `test_${stamp}`, full_name: "Test User" }
    });
    
    if (userError) {
      console.log('❌ User creation failed:', userError.message);
    } else {
      console.log('✅ User creation works');
      
      // Test one-team ownership limit
      try {
        const supabase = createClient(undefined, undefined, {
          global: { headers: { Authorization: `Bearer ${user.data.session?.access_token}` } }
        });
        
        // Create first team
        const team1 = await supabase.rpc('create_team', {
          p_name: 'Team 1',
          p_slug: 'team1-' + stamp,
          p_description: null,
          p_visibility: 'public',
          p_logo_url: null
        });
        
        if (team1.error) {
          console.log('❌ First team creation failed:', team1.error.message);
        } else {
          console.log('✅ First team created');
          
          // Try to create second team (should be blocked)
          const team2 = await supabase.rpc('create_team', {
            p_name: 'Team 2',
            p_slug: 'team2-' + stamp,
            p_description: null,
            p_visibility: 'public',
            p_logo_url: null
          });
          
          if (team2.error && team2.error.message.includes('only one team')) {
            console.log('✅ One-team ownership limit working');
          } else {
            console.log('❌ One-team ownership limit NOT working');
          }
        }
      } catch (e) {
        console.log('❌ One-team test error:', e.message);
      }
    }
  } catch (error) {
    console.log('❌ Test user creation error:', error.message);
  }
  
  // Test 3: Check team deletion
  console.log('\n3. Testing team deletion...');
  try {
    const admin = createAdminClient();
    const stamp = Date.now().toString(36);
    
    const { data: user, error: userError } = await admin.auth.admin.createUser({
      email: `del_test_${stamp}@example.com`,
      password: "Test123!",
      email_confirm: true,
      user_metadata: { username: `del_test_${stamp}`, full_name: "Delete Test" }
    });
    
    if (userError) {
      console.log('❌ Could not create test user for deletion test');
    } else {
      console.log('✅ Test user created');
      
      const team = await admin
        .from('teams')
        .insert({
          name: 'Team to Delete',
          slug: 'delete-test-' + stamp,
          owner_id: user.data.user.id,
          visibility: 'public'
        })
        .select('id')
        .single();
      
      if (team.error) {
        console.log('❌ Could not create team for deletion test');
      } else {
        console.log('✅ Team created for deletion test');
        
        // Try to delete the team
        const { error: deleteError } = await admin.rpc('delete_team', {
          p_team_id: team.data.id
        });
        
        if (deleteError && deleteError.message.includes('Direct deletion from storage tables')) {
          console.log('❌ CRITICAL: Team deletion blocked by storage issue');
          console.log('   This prevents cooldown enforcement');
        } else {
          console.log('✅ Team deletion appears to work');
        }
      }
    }
  } catch (error) {
    console.log('❌ Team deletion test error:', error.message);
  }
}

identifyIssues();
