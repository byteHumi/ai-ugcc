import { sql } from './db-client';

export async function getSetting(key) {
  const result = await sql`SELECT value FROM app_settings WHERE key = ${key}`;
  return result[0]?.value ?? null;
}

export async function setSetting(key, value) {
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${key}, ${value}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()
  `;
}
