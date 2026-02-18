'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { AnalyticsSnapshot } from '@/types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 10_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

const COLORS = {
  likes: '#d4698e',
  comments: '#f59e0b',
  shares: '#22c55e',
};

export default function EngagementTrend({ history }: { history: AnalyticsSnapshot[] }) {
  const { data, totals } = useMemo(() => {
    if (history.length === 0) return { data: [], totals: { likes: 0, comments: 0, shares: 0 } };

    const raw = history.length === 1 ? [history[0], history[0]] : history;
    const d = raw.map((s, i) => ({
      date:
        history.length === 1 && i === 1
          ? 'Now'
          : new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      likes: s.totalLikes,
      comments: s.totalComments,
      shares: s.totalShares,
    }));

    const last = d[d.length - 1];
    return {
      data: d,
      totals: { likes: last?.likes || 0, comments: last?.comments || 0, shares: last?.shares || 0 },
    };
  }, [history]);

  if (history.length === 0) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-[var(--text-muted)]">
        No engagement data yet.
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between pb-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Engagement Breakdown
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight">
            {formatNumber(totals.likes + totals.comments + totals.shares)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {Object.entries(COLORS).map(([key, color]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[11px] text-[var(--text-muted)] capitalize">{key}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              tickFormatter={formatNumber}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--popover)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 12,
                padding: '6px 10px',
              }}
              formatter={(value: number, name: string) => [
                formatNumber(value),
                name.charAt(0).toUpperCase() + name.slice(1),
              ]}
              cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
            />
            <Bar dataKey="likes" fill={COLORS.likes} radius={[3, 3, 0, 0]} barSize={12} />
            <Bar dataKey="comments" fill={COLORS.comments} radius={[3, 3, 0, 0]} barSize={12} />
            <Bar dataKey="shares" fill={COLORS.shares} radius={[3, 3, 0, 0]} barSize={12} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
