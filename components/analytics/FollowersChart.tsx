'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { AnalyticsSnapshot } from '@/types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 10_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

const PRIMARY = '#d4698e';

export default function FollowersChart({ history }: { history: AnalyticsSnapshot[] }) {
  const { data, growth, latest } = useMemo(() => {
    if (history.length === 0) return { data: [], growth: 0, latest: 0 };

    const raw = history.length === 1 ? [history[0], history[0]] : history;
    const d = raw.map((s, i) => ({
      date:
        history.length === 1 && i === 1
          ? 'Now'
          : new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      followers: s.followers,
    }));

    const first = d[0]?.followers || 0;
    const last = d[d.length - 1]?.followers || 0;
    const g = first > 0 ? ((last - first) / first) * 100 : 0;

    return { data: d, growth: g, latest: last };
  }, [history]);

  if (history.length === 0) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-[var(--text-muted)]">
        No follower data yet. Sync accounts to start tracking.
      </div>
    );
  }

  const isPositive = growth >= 0;

  return (
    <div>
      <div className="flex items-start justify-between pb-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Audience Growth
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{formatNumber(latest)}</p>
        </div>
        {history.length > 1 && (
          <div
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              isPositive
                ? 'bg-[var(--success-bg)] text-[var(--success)]'
                : 'bg-[var(--error-bg)] text-[var(--error)]'
            }`}
          >
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isPositive ? '+' : ''}
            {growth.toFixed(1)}%
          </div>
        )}
      </div>

      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="followersFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.15} />
                <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
              </linearGradient>
            </defs>
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
              formatter={(v: number) => [formatNumber(v), 'Followers']}
              cursor={{ stroke: PRIMARY, strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area
              type="monotone"
              dataKey="followers"
              fill="url(#followersFill)"
              stroke={PRIMARY}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: PRIMARY, stroke: 'var(--background)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
