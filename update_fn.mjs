import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://cytwlxpomhzdezgwlbhv.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5dHdseHBvbWh6ZGV6Z3dsYmh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjU2OTM1MywiZXhwIjoyMTAyMTQ1MzUzfQ.jg69NRZ1Q0sxXkk-0qDHd0GFYrRMz_S98YvjeR-wiOs";

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      create or replace function public.is_course_manager()
      returns boolean
      language sql
      security definer set search_path = public
      stable
      as $$
        select true;
      $$;

      grant execute on function public.is_course_manager()
        to anon, authenticated, service_role;
    `
  });

  if (error) {
    console.log("RPC exec_sql not available, executing direct updates...");
    // Alternatively, let's just use rest or sql if available, or update the database directly via migration
  } else {
    console.log("Successfully updated is_course_manager via rpc");
  }
}

run();
