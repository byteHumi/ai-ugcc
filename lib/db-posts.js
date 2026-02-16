import { sql } from './db-client';
import { transformPost } from './db-transforms';

let postsSchemaInitPromise = null;

async function ensurePostsSchema() {
  if (postsSchemaInitPromise) {
    await postsSchemaInitPromise;
    return;
  }

  postsSchemaInitPromise = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
        account_id UUID REFERENCES tiktok_accounts(id) ON DELETE SET NULL,
        caption TEXT,
        video_url TEXT,
        platform TEXT DEFAULT 'tiktok',
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
        scheduled_for TIMESTAMP,
        published_at TIMESTAMP,
        external_post_id TEXT,
        error TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS late_post_id TEXT`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS late_account_id TEXT`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS platform_post_url TEXT`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS publish_attempts INTEGER DEFAULT 0`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMP`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`;
    await sql`ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check`;
    await sql`ALTER TABLE posts ADD CONSTRAINT posts_status_check CHECK (status IN ('draft', 'pending', 'publishing', 'scheduled', 'published', 'failed', 'partial', 'cancelled'))`;
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_late_post_id ON posts(late_post_id)`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS created_by TEXT`;
  })();

  try {
    await postsSchemaInitPromise;
  } catch (error) {
    postsSchemaInitPromise = null;
    throw error;
  }
}

export async function createPost({ jobId, accountId, lateAccountId, caption, videoUrl, platform, status, scheduledFor, latePostId, platformPostUrl, createdBy }) {
  await ensurePostsSchema();
  const result = await sql`
    INSERT INTO posts (job_id, account_id, late_account_id, caption, video_url, platform, status, scheduled_for, late_post_id, platform_post_url, created_by)
    VALUES (${jobId || null}, ${accountId || null}, ${lateAccountId || null}, ${caption || null}, ${videoUrl || null}, ${platform || 'tiktok'}, ${status || 'draft'}, ${scheduledFor || null}, ${latePostId || null}, ${platformPostUrl || null}, ${createdBy || null})
    RETURNING *
  `;
  return transformPost(result[0]);
}

export async function getPost(id) {
  const result = await sql`SELECT * FROM posts WHERE id = ${id}`;
  return result[0] ? transformPost(result[0]) : null;
}

export async function getAllPosts() {
  await ensurePostsSchema();
  const result = await sql`SELECT * FROM posts ORDER BY created_at DESC`;
  return result.map(transformPost);
}

export async function getPostsByJobIds(jobIds) {
  if (!jobIds || jobIds.length === 0) return [];
  await ensurePostsSchema();
  const result = await sql`SELECT * FROM posts WHERE job_id = ANY(${jobIds}) ORDER BY created_at DESC`;
  return result.map(transformPost);
}

export async function updatePost(id, updates) {
  await ensurePostsSchema();
  const { status, publishedAt, externalPostId, error, latePostId, platformPostUrl, publishAttempts, lastCheckedAt } = updates;

  const result = await sql`
    UPDATE posts SET
      status = COALESCE(${status || null}, status),
      published_at = COALESCE(${publishedAt || null}, published_at),
      external_post_id = COALESCE(${externalPostId || null}, external_post_id),
      error = ${error !== undefined ? error : null},
      late_post_id = COALESCE(${latePostId || null}, late_post_id),
      platform_post_url = COALESCE(${platformPostUrl || null}, platform_post_url),
      publish_attempts = COALESCE(${publishAttempts ?? null}, publish_attempts),
      last_checked_at = COALESCE(${lastCheckedAt || null}, last_checked_at),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return result[0] ? transformPost(result[0]) : null;
}

export async function getPostByLateId(latePostId) {
  await ensurePostsSchema();
  const result = await sql`SELECT * FROM posts WHERE late_post_id = ${latePostId}`;
  return result[0] ? transformPost(result[0]) : null;
}

export async function updatePostByLateId(latePostId, updates) {
  await ensurePostsSchema();
  const { status, publishedAt, externalPostId, error, platformPostUrl, publishAttempts, lastCheckedAt } = updates;

  const result = await sql`
    UPDATE posts SET
      status = COALESCE(${status || null}, status),
      published_at = COALESCE(${publishedAt || null}, published_at),
      external_post_id = COALESCE(${externalPostId || null}, external_post_id),
      error = ${error !== undefined ? error : null},
      platform_post_url = COALESCE(${platformPostUrl || null}, platform_post_url),
      publish_attempts = COALESCE(${publishAttempts ?? null}, publish_attempts),
      last_checked_at = COALESCE(${lastCheckedAt || null}, last_checked_at),
      updated_at = NOW()
    WHERE late_post_id = ${latePostId}
    RETURNING *
  `;
  return result[0] ? transformPost(result[0]) : null;
}

export async function getPendingPosts() {
  await ensurePostsSchema();
  const result = await sql`
    SELECT * FROM posts
    WHERE status IN ('pending', 'publishing', 'scheduled')
      AND late_post_id IS NOT NULL
    ORDER BY created_at DESC
  `;
  return result.map(transformPost);
}

export async function findRecentDuplicatePost({ caption, videoUrl, lateAccountIds, mode = 'now', scheduledFor, withinSeconds = 30 }) {
  await ensurePostsSchema();
  const normalizedCaption = caption || '';
  const normalizedVideoUrl = videoUrl || '';
  const normalizedScheduledFor = scheduledFor || null;
  const normalizedMode = mode || 'now';
  const accountIds = [...new Set((lateAccountIds || []).filter(Boolean))].sort();
  if (accountIds.length === 0) return null;

  const result = await sql`
    WITH recent_posts AS (
      SELECT
        late_post_id,
        created_at,
        late_account_id
      FROM posts
      WHERE created_at >= NOW() - (${withinSeconds} * INTERVAL '1 second')
        AND late_post_id IS NOT NULL
        AND COALESCE(caption, '') = ${normalizedCaption}
        AND COALESCE(video_url, '') = ${normalizedVideoUrl}
        AND (
          (${normalizedMode} = 'draft' AND status = 'draft')
          OR (${normalizedMode} = 'schedule' AND status = 'scheduled')
          OR (${normalizedMode} = 'queue' AND status = 'pending')
          OR (${normalizedMode} = 'now' AND status IN ('publishing', 'published', 'failed', 'partial'))
        )
        AND (
          (${normalizedScheduledFor}::timestamp IS NULL AND scheduled_for IS NULL)
          OR scheduled_for = ${normalizedScheduledFor}::timestamp
        )
    ),
    grouped AS (
      SELECT
        late_post_id,
        MIN(created_at) AS first_seen_at,
        COUNT(DISTINCT late_account_id) FILTER (WHERE late_account_id IS NOT NULL) AS total_accounts,
        COUNT(DISTINCT late_account_id) FILTER (WHERE late_account_id = ANY(${accountIds})) AS matched_accounts
      FROM recent_posts
      GROUP BY late_post_id
    )
    SELECT
      late_post_id,
      first_seen_at
    FROM grouped
    WHERE total_accounts = ${accountIds.length}
      AND matched_accounts = ${accountIds.length}
    ORDER BY first_seen_at DESC
    LIMIT 1
  `;

  if (!result[0]) return null;
  return {
    latePostId: result[0].late_post_id,
    createdAt: result[0].first_seen_at?.toISOString(),
  };
}
