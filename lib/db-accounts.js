import { sql } from './db-client';
import { transformAccount } from './db-transforms';

export async function createTikTokAccount({ accountId, username, displayName, profilePicture, accessToken, refreshToken, profileId }) {
  const result = await sql`
    INSERT INTO tiktok_accounts (account_id, username, display_name, profile_picture, access_token, refresh_token, profile_id)
    VALUES (${accountId}, ${username || null}, ${displayName || null}, ${profilePicture || null}, ${accessToken || null}, ${refreshToken || null}, ${profileId || null})
    ON CONFLICT (account_id) DO UPDATE SET
      username = COALESCE(EXCLUDED.username, tiktok_accounts.username),
      display_name = COALESCE(EXCLUDED.display_name, tiktok_accounts.display_name),
      profile_picture = COALESCE(EXCLUDED.profile_picture, tiktok_accounts.profile_picture),
      access_token = COALESCE(EXCLUDED.access_token, tiktok_accounts.access_token),
      refresh_token = COALESCE(EXCLUDED.refresh_token, tiktok_accounts.refresh_token),
      profile_id = COALESCE(EXCLUDED.profile_id, tiktok_accounts.profile_id),
      updated_at = NOW()
    RETURNING *
  `;
  return transformAccount(result[0]);
}

export async function getTikTokAccount(id) {
  const result = await sql`SELECT * FROM tiktok_accounts WHERE id = ${id}`;
  return result[0] ? transformAccount(result[0]) : null;
}

export async function getTikTokAccountByAccountId(accountId) {
  const result = await sql`SELECT * FROM tiktok_accounts WHERE account_id = ${accountId}`;
  return result[0] ? transformAccount(result[0]) : null;
}

export async function getAllTikTokAccounts() {
  const result = await sql`SELECT * FROM tiktok_accounts WHERE is_active = true ORDER BY created_at DESC`;
  return result.map(transformAccount);
}

export async function deleteTikTokAccount(id) {
  await sql`UPDATE tiktok_accounts SET is_active = false WHERE id = ${id}`;
}
