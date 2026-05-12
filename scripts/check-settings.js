const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .limit(5);
  console.log('Data:', JSON.stringify(data, null, 2));
  console.log('Error:', error);
}

check();
