const https = require('https');
const fs = require('fs');
const path = require('path');

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'xlgzuirmzabzcjzixbhq';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

async function runSql(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });
    const req = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/sql`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  // 1. Create moddatetime function
  console.log('Creating moddatetime function...');
  await runSql(`
    create or replace function moddatetime()
    returns trigger
    language plpgsql
    as $$
    begin
      new.updated_at = now();
      return new;
    end;
    $$;
  `);
  console.log('✅ moddatetime function created');

  // 2. Add triggers for all tables
  const tables = ['profiles', 'properties', 'units', 'tenants', 'contracts', 'payments', 'maintenance_requests', 'notifications'];
  for (const table of tables) {
    try {
      await runSql(`
        do $$
        begin
          if not exists (select 1 from information_schema.columns where table_name = '${table}' and column_name = 'updated_at') then
            execute 'alter table ${table} add column updated_at timestamp with time zone default timezone(''utc''::text, now()) not null';
          end if;
        end
        $$;
      `);
      await runSql(`drop trigger if exists update_${table}_updated_at on ${table}`);
      await runSql(`
        create trigger update_${table}_updated_at before update on ${table}
          for each row execute procedure moddatetime (updated_at);
      `);
      console.log(`  ✅ Trigger on ${table}`);
    } catch (err) {
      console.log(`  ⚠️ ${table}: ${err.message}`);
    }
  }

  // 3. Add indexes
  const indexes = [
    'create index if not exists idx_properties_type on properties(type)',
    'create index if not exists idx_units_status on units(status)',
    'create index if not exists idx_units_property_id on units(property_id)',
    'create index if not exists idx_contracts_status on contracts(status)',
    'create index if not exists idx_contracts_dates on contracts(start_date, end_date)',
    'create index if not exists idx_payments_status on payments(status)',
    'create index if not exists idx_payments_due_date on payments(due_date)',
    'create index if not exists idx_maintenance_requests_status on maintenance_requests(status)',
    'create index if not exists idx_notifications_user_id on notifications(user_id)',
    'create index if not exists idx_notifications_is_read on notifications(is_read)',
  ];
  for (const idx of indexes) {
    try { await runSql(idx); console.log(`  ✅ ${idx.substring(0, 60)}...`); }
    catch (err) { console.log(`  ⚠️ ${err.message.substring(0, 100)}`); }
  }

  // 4. Mark migration 001 as complete in tracking table
  await runSql(`
    insert into supabase_migrations.schema_migrations (name, statements)
    select '001_initial.sql', 22
    where not exists (select 1 from supabase_migrations.schema_migrations where name = '001_initial.sql');
  `);
  console.log('✅ Marked 001_initial.sql as applied');

  // 5. Apply migrations 002-005 from files
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();
  for (const file of files) {
    if (!file.endsWith('.sql') || file === '001_initial.sql') continue;
    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, 'utf8');
    
    // Skip if already applied
    const existing = await runSql(`select count(*) as c from supabase_migrations.schema_migrations where name = '${file}'`);
    if (existing.includes('"c":"1"') || existing.includes('"c":1') || existing.includes('"c": "1"')) {
      console.log(`⏭️ ${file} already applied`);
      continue;
    }

    console.log(`Applying ${file}...`);
    try {
      await runSql(sql);
      const stmtCount = sql.split(';').filter(s => s.trim()).length;
      await runSql(`insert into supabase_migrations.schema_migrations (name, statements) values ('${file}', ${stmtCount})`);
      console.log(`  ✅ ${file}`);
    } catch (err) {
      console.error(`  ❌ ${file}: ${err.message.substring(0, 200)}`);
    }
  }

  console.log('\n✅ All done!');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
