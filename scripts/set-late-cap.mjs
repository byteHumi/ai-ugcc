// One-off: set or display per-key Late profile caps in the DB.
//
// Usage:
//   node scripts/set-late-cap.mjs                    # show all caps
//   node scripts/set-late-cap.mjs --key 0 --max 100  # set GL-1 to 100
//   node scripts/set-late-cap.mjs --key 1 --max 100  # set GL-2 to 100
//   node scripts/set-late-cap.mjs --clear --key 0    # clear GL-1 (back to "unknown")

import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load DATABASE_URL from .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set. Add it to .env or env vars.');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return undefined;
  return args[i + 1];
};
const has = (name) => args.includes(`--${name}`);

await sql`
  CREATE TABLE IF NOT EXISTS late_api_key_limits (
    api_key_index INTEGER PRIMARY KEY,
    learned_limit INTEGER NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
  )
`;

const keyArg = flag('key');
const maxArg = flag('max');

if (has('clear') && keyArg !== undefined) {
  await sql`DELETE FROM late_api_key_limits WHERE api_key_index = ${parseInt(keyArg, 10)}`;
  console.log(`Cleared cap for GL-${parseInt(keyArg, 10) + 1}.`);
} else if (keyArg !== undefined && maxArg !== undefined) {
  const i = parseInt(keyArg, 10);
  const m = parseInt(maxArg, 10);
  await sql`
    INSERT INTO late_api_key_limits (api_key_index, learned_limit, updated_at)
    VALUES (${i}, ${m}, NOW())
    ON CONFLICT (api_key_index)
    DO UPDATE SET learned_limit = EXCLUDED.learned_limit, updated_at = NOW()
  `;
  console.log(`Set GL-${i + 1} (index ${i}) cap to ${m}.`);
}

const rows = await sql`SELECT api_key_index, learned_limit, updated_at FROM late_api_key_limits ORDER BY api_key_index`;
console.log('\nCurrent caps in DB:');
if (rows.length === 0) console.log('  (none — UI will show count only until you set or learn one)');
for (const r of rows) {
  console.log(`  GL-${r.api_key_index + 1}  →  ${r.learned_limit}   (updated ${new Date(r.updated_at).toISOString()})`);
}
