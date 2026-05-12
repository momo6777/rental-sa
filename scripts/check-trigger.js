const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: triggers, error: tErr } = await supabase.rpc('check_trigger_fn');
  if (tErr) console.log('RPC error:', tErr);

  // Direct SQL via query
  const { data: fn, error: fnErr } = await supabase
    .from('_realtime_')
    .select('*')
    .limit(0);

  // Use raw SQL
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      select proname as function_name, prosrc as function_body
      from pg_proc
      where proname = 'sync_property_units';
    `
  });
  console.log({ data, error });
}

check();
