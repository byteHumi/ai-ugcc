import { sql as rawSql } from './db-client';
import { db } from './drizzle';
import { generationRequests } from './schema';
import { eq } from 'drizzle-orm';

export async function createGenerationRequest({
  type,
  provider,
  model,
  status = 'processing',
  cost = null,
  durationSeconds = null,
  error = null,
  metadata = null,
  createdBy = null,
  createdByEmail = null,
}) {
  const rows = await db.insert(generationRequests).values({
    type,
    provider,
    model,
    status,
    cost,
    durationSeconds,
    error,
    metadata,
    createdBy,
    createdByEmail,
  }).returning();
  return rows[0];
}

export async function updateGenerationRequest(id, { status, cost, durationSeconds, error }) {
  const set = {};
  if (status !== undefined && status !== null) set.status = status;
  if (cost !== undefined && cost !== null) set.cost = cost;
  if (durationSeconds !== undefined && durationSeconds !== null) set.durationSeconds = durationSeconds;
  if (error !== undefined && error !== null) set.error = error;

  if (Object.keys(set).length === 0) return;

  await db.update(generationRequests).set(set).where(eq(generationRequests.id, id));
}

// Gemini 3 Pro Image ("Nano Banana Pro") list price — Google's published rate
// for standard 1K/2K output ($0.134/image). Source: ai.google.dev/gemini-api/docs/pricing.
// Direct Gemini calls log cost = 0 in the DB, so we cost them at query time.
const GEMINI_IMAGE_PRICE = 0.134;

// Kling 2.6 video — confirmed FAL billing rate ($0.035/sec). The recorded `cost`
// column was logged at inconsistent rates over time, so for Kling videos we
// recompute the exact cost from duration_seconds × this rate.
const KLING_VIDEO_PRICE_PER_SEC = 0.035;

export async function getGenerationRequestStats({ period = '30d', from = null, to = null } = {}) {
  const useCustom = from && to;
  const intervalMap = {
    '24h': '1 day', '7d': '7 days', '30d': '30 days',
    '90d': '90 days', '6m': '6 months', '1y': '12 months',
  };
  const interval = intervalMap[period] || '30 days';

  // Helper: builds WHERE clause fragment
  const whereClause = useCustom
    ? rawSql`created_at >= ${from}::date AND created_at < (${to}::date + interval '1 day')`
    : rawSql`created_at >= NOW() - ${interval}::interval`;

  // Effective cost — the exact, real cost for each row:
  //  - Kling videos: recomputed from duration_seconds × $0.035 (real FAL rate),
  //    since the stored `cost` was logged at inconsistent rates.
  //  - Zero-cost Gemini images: priced at the $0.134 list rate (logged as $0).
  //  - Everything else: the recorded cost.
  const effCost = rawSql`
    CASE
      WHEN type = 'image' AND model LIKE 'gemini-3%' AND COALESCE(cost, 0) = 0
        THEN ${GEMINI_IMAGE_PRICE}
      WHEN type = 'video' AND status = 'success' AND model LIKE '%kling%' AND duration_seconds IS NOT NULL
        THEN duration_seconds * ${KLING_VIDEO_PRICE_PER_SEC}
      ELSE COALESCE(cost, 0)
    END
  `;

  const summary = await rawSql`
    SELECT
      COUNT(*)::int AS total_requests,
      COUNT(*) FILTER (WHERE status = 'success')::int AS successful,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
      COALESCE(SUM(${effCost}) FILTER (WHERE status = 'success'), 0)::real AS total_cost,
      COALESCE(SUM(${effCost}) FILTER (WHERE type = 'image' AND status = 'success'), 0)::real AS image_cost,
      COALESCE(SUM(${effCost}) FILTER (WHERE type = 'video' AND status = 'success'), 0)::real AS video_cost,
      COUNT(*) FILTER (WHERE type = 'image')::int AS image_requests,
      COUNT(*) FILTER (WHERE type = 'video')::int AS video_requests,
      COUNT(*) FILTER (WHERE type = 'image' AND status = 'success')::int AS image_success,
      COUNT(*) FILTER (WHERE type = 'video' AND status = 'success')::int AS video_success,
      COUNT(*) FILTER (WHERE type = 'image' AND status = 'failed')::int AS image_failed,
      COUNT(*) FILTER (WHERE type = 'video' AND status = 'failed')::int AS video_failed
    FROM generation_requests
    WHERE ${whereClause}
  `;

  const daily = await rawSql`
    SELECT
      date_trunc('day', created_at)::date AS date,
      COUNT(*) FILTER (WHERE type = 'image' AND status = 'success')::int AS image_success,
      COUNT(*) FILTER (WHERE type = 'video' AND status = 'success')::int AS video_success,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
      COALESCE(SUM(${effCost}) FILTER (WHERE type = 'image' AND status = 'success'), 0)::real AS image_cost,
      COALESCE(SUM(${effCost}) FILTER (WHERE type = 'video' AND status = 'success'), 0)::real AS video_cost
    FROM generation_requests
    WHERE ${whereClause}
    GROUP BY 1 ORDER BY 1
  `;

  // Week buckets within each calendar month: week 1 = days 1-7, week 2 = 8-14,
  // week 3 = 15-21, week 4 = 22-28, week 5 = 29-end. Sub-weeks of a month sum
  // exactly to that month's total. month_start is a plain 'YYYY-MM-DD' string.
  const weekBuckets = await rawSql`
    SELECT
      to_char(date_trunc('month', created_at), 'YYYY-MM-DD') AS month_start,
      LEAST(CEIL(EXTRACT(DAY FROM created_at) / 7.0), 5)::int AS week_of_month,
      to_char(MIN(created_at), 'YYYY-MM-DD') AS first_day,
      to_char(MAX(created_at), 'YYYY-MM-DD') AS last_day,
      COUNT(*) FILTER (WHERE type = 'image' AND status = 'success')::int AS image_count,
      COUNT(*) FILTER (WHERE type = 'video' AND status = 'success')::int AS video_count,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
      COALESCE(SUM(${effCost}) FILTER (WHERE type = 'image' AND status = 'success'), 0)::real AS image_cost,
      COALESCE(SUM(${effCost}) FILTER (WHERE type = 'video' AND status = 'success'), 0)::real AS video_cost,
      COALESCE(SUM(${effCost}) FILTER (WHERE status = 'success'), 0)::real AS total_cost,
      COALESCE(SUM(duration_seconds) FILTER (WHERE type = 'video' AND status = 'success'), 0)::real AS video_seconds
    FROM generation_requests
    WHERE ${whereClause}
    GROUP BY 1, 2 ORDER BY 1, 2
  `;

  // Monthly breakdown. month_start is a plain 'YYYY-MM-DD' string.
  const monthly = await rawSql`
    SELECT
      to_char(date_trunc('month', created_at), 'YYYY-MM-DD') AS month_start,
      COUNT(*) FILTER (WHERE type = 'image' AND status = 'success')::int AS image_count,
      COUNT(*) FILTER (WHERE type = 'video' AND status = 'success')::int AS video_count,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
      COALESCE(SUM(${effCost}) FILTER (WHERE type = 'image' AND status = 'success'), 0)::real AS image_cost,
      COALESCE(SUM(${effCost}) FILTER (WHERE type = 'video' AND status = 'success'), 0)::real AS video_cost,
      COALESCE(SUM(${effCost}) FILTER (WHERE status = 'success'), 0)::real AS total_cost,
      COALESCE(SUM(duration_seconds) FILTER (WHERE type = 'video' AND status = 'success'), 0)::real AS video_seconds
    FROM generation_requests
    WHERE ${whereClause}
    GROUP BY 1 ORDER BY 1
  `;

  const byModel = await rawSql`
    SELECT model, type, COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'success')::int AS successful,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
      COALESCE(SUM(${effCost}) FILTER (WHERE status = 'success'), 0)::real AS total_cost
    FROM generation_requests
    WHERE ${whereClause}
    GROUP BY model, type ORDER BY total_cost DESC
  `;

  // By user
  const byUser = await rawSql`
    SELECT
      COALESCE(created_by_email, created_by, 'unknown') AS user_key,
      COALESCE(created_by, split_part(created_by_email, '@', 1)) AS display_name,
      created_by_email AS email,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'success')::int AS successful,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
      COALESCE(SUM(${effCost}) FILTER (WHERE status = 'success'), 0)::real AS total_cost,
      COUNT(*) FILTER (WHERE type = 'image')::int AS images,
      COUNT(*) FILTER (WHERE type = 'video')::int AS videos
    FROM generation_requests
    WHERE ${whereClause}
    GROUP BY created_by_email, created_by
    ORDER BY total_cost DESC
  `;

  // By job (from metadata->jobId)
  const byJob = await rawSql`
    SELECT
      metadata->>'jobId' AS job_id,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'success')::int AS successful,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
      COALESCE(SUM(${effCost}) FILTER (WHERE status = 'success'), 0)::real AS total_cost,
      COALESCE(SUM(duration_seconds) FILTER (WHERE status = 'success'), 0)::real AS total_duration
    FROM generation_requests
    WHERE ${whereClause} AND metadata->>'jobId' IS NOT NULL
    GROUP BY metadata->>'jobId'
    ORDER BY total_cost DESC
    LIMIT 50
  `;

  // Timeseries
  let bucket;
  if (useCustom) {
    const diffMs = new Date(to).getTime() - new Date(from).getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    bucket = diffDays <= 2 ? 'hour' : 'day';
  } else {
    bucket = period === '24h' ? 'hour' : period === '7d' ? 'hour' : 'day';
  }

  const timeseries = await rawSql`
    SELECT date_trunc(${bucket}, created_at) AS ts,
      COUNT(*) FILTER (WHERE status = 'success')::int AS success,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
      COUNT(*) FILTER (WHERE status = 'processing')::int AS processing
    FROM generation_requests
    WHERE ${whereClause}
    GROUP BY 1 ORDER BY 1
  `;

  // Recent requests
  const recent = await rawSql`
    SELECT id, type, model, status, cost, duration_seconds, error,
      created_by, created_by_email, metadata, created_at
    FROM generation_requests
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT 25
  `;

  return {
    summary: summary[0],
    daily,
    weekBuckets,
    monthly,
    byModel,
    byUser,
    byJob,
    timeseries,
    recent,
  };
}
