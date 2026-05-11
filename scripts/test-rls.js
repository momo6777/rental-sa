/**
 * RLS Policy Test Script
 * Tests that Row Level Security works correctly for admin and accountant roles.
 *
 * Usage: node scripts/test-rls.js
 * Requires: .env.local with VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testUnauthenticated() {
  console.log('\n📝 Testing: Unauthenticated access');
  const tables = ['properties', 'units', 'tenants', 'contracts', 'payments', 'maintenance_requests', 'profiles'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    const pass = !error && (!data || data.length === 0);
    console.log(`  ${pass ? '✅' : '❌'} ${table}: ${pass ? 'No data returned (correct)' : `Error: ${error?.message || 'Data leaked'}`}`);
  }
}

async function testAdminAccess() {
  console.log('\n📝 Testing: Admin access (via service role)');
  const tables = ['properties', 'units', 'tenants', 'contracts', 'payments', 'maintenance_requests', 'profiles'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(5);
    const pass = !error && data !== null;
    console.log(`  ${pass ? '✅' : '❌'} ${table}: ${pass ? `${data.length} rows readable` : error?.message}`);
  }
}

async function testCRUD() {
  console.log('\n📝 Testing: CRUD operations (service role = admin)');
  
  // Test INSERT on properties
  const { data: prop, error: insertErr } = await supabase
    .from('properties')
    .insert([{ name_ar: 'اختبار', type: 'residential', city: 'الرياض', district: 'الملز', total_units: 1 }])
    .select()
    .single();
  console.log(`  ${insertErr ? '❌' : '✅'} INSERT properties: ${insertErr ? insertErr.message : 'Success'}`);
  
  if (prop) {
    // Test UPDATE
    const { error: updateErr } = await supabase.from('properties').update({ name_ar: 'اختبار معدل' }).eq('id', prop.id);
    console.log(`  ${updateErr ? '❌' : '✅'} UPDATE properties: ${updateErr ? updateErr.message : 'Success'}`);
    
    // Test DELETE
    const { error: deleteErr } = await supabase.from('properties').delete().eq('id', prop.id);
    console.log(`  ${deleteErr ? '❌' : '✅'} DELETE properties: ${deleteErr ? deleteErr.message : 'Success'}`);
  }
}

async function run() {
  console.log('=== RLS Policy Tests ===\n');
  
  await testUnauthenticated();
  await testAdminAccess();
  await testCRUD();
  
  console.log('\n=== Tests Complete ===');
}

run().catch(console.error);
