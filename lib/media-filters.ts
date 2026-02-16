import type { DateFilterValue } from '@/types/media-filters';

const DAY_MS = 24 * 60 * 60 * 1000;

export function getDateFilterCutoffMs(filter: DateFilterValue): number | null {
  if (filter === '24h') return Date.now() - DAY_MS;
  if (filter === '7d') return Date.now() - (7 * DAY_MS);
  if (filter === '30d') return Date.now() - (30 * DAY_MS);
  return null;
}

export function getDateFilterSortDirection(filter: DateFilterValue): 'asc' | 'desc' {
  return filter === 'oldest' ? 'asc' : 'desc';
}

export function toMillis(value?: string | null): number {
  if (!value) return 0;
  const t = +new Date(value);
  return Number.isFinite(t) ? t : 0;
}
