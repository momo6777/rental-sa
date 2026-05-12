import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.+)`, 'm'));
  return match ? match[1].trim() : null;
};

const supabase = createClient(
  getEnv('VITE_SUPABASE_URL'),
  getEnv('SUPABASE_SERVICE_ROLE_KEY')
);

const { data: userData, error: signUpError } = await supabase.auth.admin.createUser({
  email: 'admin@admin.com',
  password: 'admin@admin',
  email_confirm: true,
});

if (signUpError) {
  console.error('Signup error:', signUpError.message);
  process.exit(1);
}

console.log('User created:', userData.user.id);

const { error: profileError } = await supabase.from('profiles').insert({
  id: userData.user.id,
  user_id: userData.user.id,
  full_name: 'مدير النظام',
  role: 'admin',
});

if (profileError) {
  console.error('Profile error:', profileError.message);
} else {
  console.log('Profile created with role: admin');
}
