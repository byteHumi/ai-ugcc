'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CalendarDays } from 'lucide-react';
import type { AnalyticsMediaItem } from '@/types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function PostingActivity({ items }: { items: AnalyticsMediaItem[] }) {
  const { postingData, bestDay } = useMemo(() => {
    const dayData = DAYS.map(d => ({ day: d, posts: 0, avgViews: 0, totalViews: 0 }));
    items.forEach(item => {
      if (!item.publishedAt) return;
      const dayIdx = new Date(item.publishedAt).getDay();
      dayData[dayIdx].posts++;
      dayData[dayIdx].totalViews += item.views;
    });
    dayData.forEach(d => {
      d.avgViews = d.posts > 0 ? Math.round(d.totalViews / d.posts) : 0;
    });
    const best = dayData.reduce((b, d) => d.avgViews > b.avgViews ? d : b, dayData[0]);
    return { postingData: dayData, bestDay: best };
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-[var(--text-muted)]">
        No posting data yet.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between pb-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Posting Activity
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight">
            {items.length} <span className="text-sm font-medium text-[var(--text-muted)]">videos</span>
          </p>
        </div>
        <span className="rounded-full bg-[var(--muted)] px-2.5 py-1 text-[11px] text-[var(--text-muted)]">
          Best: <span className="font-semibold text-[var(--foreground)]">{bestDay.day}</span>
        </span>
      </div>

      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={postingData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={30} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, padding: '6px 10px' }}
              formatter={(v: number, name: string) => [
                name === 'posts' ? `${v} posts` : formatNumber(v) + ' avg views',
                name === 'posts' ? 'Posts' : 'Avg Views',
              ]}
            />
            <Bar dataKey="posts" fill="#f59e0b" fillOpacity={0.8} radius={[4, 4, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
