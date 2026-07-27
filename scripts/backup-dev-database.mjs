import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = path.resolve(scriptDirectory, '..');

config({ path: path.join(repositoryDirectory, '.env.local'), quiet: true });

const outputDirectoryArgument = process.argv[2];
if (!outputDirectoryArgument) {
  throw new Error('Usage: node scripts/backup-dev-database.mjs <output-directory>');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const outputDirectory = path.resolve(outputDirectoryArgument);
const dataDirectory = path.join(outputDirectory, 'data');
const pageSize = 1000;
const tables = [
  'workspaces',
  'users',
  'license_slots',
  'trials',
  'audit_logs',
  'materials',
  'locations',
  'assets',
  'asset_events',
];

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function exportTable(tableName) {
  const records = [];

  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(start, start + pageSize - 1);

    if (error) {
      throw new Error(`Failed to export ${tableName}: ${error.message}`);
    }

    records.push(...data);
    if (data.length < pageSize) break;
  }

  await writeFile(
    path.join(dataDirectory, `${tableName}.json`),
    `${JSON.stringify(records, null, 2)}\n`,
    'utf8',
  );

  return records.length;
}

async function exportAuthUsers() {
  const users = [];

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: pageSize,
    });

    if (error) {
      throw new Error(`Failed to export Auth users: ${error.message}`);
    }

    users.push(...data.users);
    if (data.users.length < pageSize) break;
  }

  await writeFile(
    path.join(dataDirectory, 'auth_users.json'),
    `${JSON.stringify(users, null, 2)}\n`,
    'utf8',
  );

  return users.length;
}

await mkdir(dataDirectory, { recursive: true });
await copyFile(
  path.join(repositoryDirectory, 'schema.sql'),
  path.join(outputDirectory, 'schema.sql'),
);

const recordCounts = {};
for (const tableName of tables) {
  recordCounts[tableName] = await exportTable(tableName);
}
recordCounts.auth_users = await exportAuthUsers();

const manifest = {
  created_at: new Date().toISOString(),
  source_url: new URL(supabaseUrl).origin,
  schema_source: 'schema.sql',
  record_counts: recordCounts,
};

await writeFile(
  path.join(outputDirectory, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);

console.log(`Backup completed: ${outputDirectory}`);
console.log(`Exported record counts: ${JSON.stringify(recordCounts)}`);
