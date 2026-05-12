const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  // Query the schema_migrations table to see what's been applied
  const { data: migrations, error: mErr } = await supabase
    .from('_supabase_migrations')
    .select('*')
    .order('name');
  console.log('Migrations:', JSON.stringify(migrations, null, 2));
  if (mErr) console.log('Migration error:', mErr);

  // Try querying directly
  const { data, error } = await supabase
    .from('properties')
    .select('id, total_units')
    .limit(3);
  console.log('Properties:', JSON.stringify(data, null, 2));
  if (error) console.log('Properties error:', error);
}

check();
