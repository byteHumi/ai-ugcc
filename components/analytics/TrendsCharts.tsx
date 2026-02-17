'use client';

import { ReactNode, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import {
  Activity, PieChartIcon, TrendingUp,
  Zap, ArrowUpRight, ArrowDownRight, Video, Eye, Heart, MessageCircle,
} from 'lucide-react';
import EngagementTrend from '@/components/analytics/EngagementTrend';
import { FaTiktok, FaInstagram, FaYoutube } from 'react-icons/fa6';
import NumberFlow from '@number-flow/react';
import type { AnalyticsOverview, AnalyticsSnapshot, AnalyticsMediaItem } from '@/types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

const PLATFORM_META: Record<string, { label: string; icon: ReactNode; color: string }> = {
  tiktok:    { label: 'TikTok',    icon: <FaTiktok className="h-4 w-4" />,    color: '#00f2ea' },
  instagram: { label: 'Instagram', icon: <FaInstagram className="h-4 w-4" />, color: '#E1306C' },
  youtube:   { label: 'YouTube',   icon: <FaYoutube className="h-4 w-4" />,   color: '#FF0000' },
};

const LINE_METRICS = [
  { key: 'views',    label: 'Views',    color: '#d4698e' },
  { key: 'likes',    label: 'Likes',    color: '#f59e0b' },
  { key: 'comments', label: 'Comments', color: '#22c55e' },
];


export default function TrendsCharts({
  overview,
  history,
  items = [],
}: {
  overview: AnalyticsOverview | null;
  history: AnalyticsSnapshot[];
  items?: AnalyticsMediaItem[];
}) {
  const raw = history.length === 1 ? [history[0], history[0]] : history;
  const lineData = raw.map((s, i) => ({
    date: history.length === 1 && i === 1
      ? 'Now'
      : new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    views: s.totalViews,
    likes: s.totalLikes,
    comments: s.totalComments,
  }));

  const engagementData = raw.map((s, i) => ({
    date: history.length === 1 && i === 1
      ? 'Now'
      : new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    rate: s.engagementRate,
  }));

  const breakdown = overview?.platformBreakdown || [];
  const pieData = breakdown.map(p => ({
    name: PLATFORM_META[p.platform]?.label || p.platform,
    value: p.views,
    color: PLATFORM_META[p.platform]?.color || '#9ca3af',
  }));
  const totalPieViews = pieData.reduce((sum, d) => sum + d.value, 0);

  // Growth calculations
  const growth = useMemo(() => {
    if (history.length < 2) return null;
    const first = history[0];
    const last = history[history.length - 1];
    const fFollowers = first.followers || 1;
    const fViews = first.totalViews || 1;
    const fEng = first.engagementRate || 1;
    return {
      followers: ((last.followers - first.followers) / fFollowers) * 100,
      followersAbs: last.followers - first.followers,
      views: ((last.totalViews - first.totalViews) / fViews) * 100,
      viewsAbs: last.totalViews - first.totalViews,
      engagement: ((last.engagementRate - first.engagementRate) / fEng) * 100,
      engagementAbs: last.engagementRate - first.engagementRate,
    };
  }, [history]);

  // Content stats
  const contentStats = useMemo(() => {
    if (items.length === 0) return null;
    const totalViews = items.reduce((s, i) => s + i.views, 0);
    const totalLikes = items.reduce((s, i) => s + i.likes, 0);
    const totalComments = items.reduce((s, i) => s + i.comments, 0);
    return {
      totalVideos: items.length,
      totalViews,
      totalLikes,
      totalComments,
      avgViews: Math.round(totalViews / items.length),
    };
  }, [items]);

  // Platform engagement comparison
  const platformEngagement = useMemo(() => {
    return breakdown.map(p => ({
      platform: PLATFORM_META[p.platform]?.label || p.platform,
      engagement: p.engagementRate,
      color: PLATFORM_META[p.platform]?.color || '#9ca3af',
    })).sort((a, b) => b.engagement - a.engagement);
  }, [breakdown]);

  return (
    <div className="space-y-5">
      {/* Row 1: Growth Summary Cards */}
      {growth && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Follower Growth', value: growth.followers, abs: growth.followersAbs, icon: TrendingUp, accent: '#d4698e', suffix: '' },
            { label: 'Views Growth', value: growth.views, abs: growth.viewsAbs, icon: Eye, accent: '#f59e0b', suffix: '' },
            { label: 'Engagement Change', value: growth.engagement, abs: growth.engagementAbs, icon: Zap, accent: '#22c55e', suffix: 'pts' },
          ].map(g => {
            const isPositive = g.value >= 0;
            const GIcon = g.icon;
            return (
              <div key={g.label} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="mb-2 flex items-center gap-1.5">
                  <GIcon className="h-3.5 w-3.5" style={{ color: g.accent }} />
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    {g.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                    {isPositive ? '+' : ''}{g.value.toFixed(1)}%
                  </span>
                  <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                    {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {isPositive ? '+' : ''}{g.suffix === 'pts' ? g.abs.toFixed(2) + ' pts' : formatNumber(Math.abs(g.abs))}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">vs. start of period</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Row 2: Metrics Over Time + Views by Platform */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Metrics Over Time */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[var(--primary)]" />
              <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Metrics Over Time
              </p>
            </div>
            <div className="flex items-center gap-3">
              {LINE_METRICS.map(m => (
                <div key={m.key} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="text-[10px] text-[var(--text-muted)]">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {lineData.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-[var(--text-muted)]">
              No trend data yet. Sync daily to build history.
            </div>
          ) : (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lineData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    {LINE_METRICS.map(m => (
                      <linearGradient key={m.key} id={`trend-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={m.color} stopOpacity={0.12} />
                        <stop offset="100%" stopColor={m.color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatNumber} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, padding: '6px 10px' }}
                    formatter={(v: number, name: string) => [formatNumber(v), name.charAt(0).toUpperCase() + name.slice(1)]}
                    cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  {LINE_METRICS.map(m => (
                    <Area
                      key={m.key}
                      type="monotone"
                      dataKey={m.key}
                      name={m.label}
                      stroke={m.color}
                      strokeWidth={2}
                      fill={`url(#trend-${m.key})`}
                      dot={false}
                      activeDot={{ r: 3, fill: m.color, stroke: 'var(--background)', strokeWidth: 2 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Views by Platform */}
        {pieData.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="mb-4 flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-[var(--primary)]" />
              <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Views by Platform
              </p>
            </div>
            <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, padding: '6px 10px' }}
                      formatter={(v: number) => [formatNumber(v), 'Views']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                {breakdown.map(p => {
                  const meta = PLATFORM_META[p.platform];
                  const pct = totalPieViews > 0 ? ((p.views / totalPieViews) * 100) : 0;
                  return (
                    <div key={p.platform} className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${meta?.color || '#9ca3af'}12`, color: meta?.color || '#9ca3af' }}
                      >
                        {meta?.icon || <span className="text-xs font-bold">{p.platform[0].toUpperCase()}</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{meta?.label || p.platform}</span>
                          <span className="text-sm font-bold">
                            <NumberFlow value={Number(pct.toFixed(1))} format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} />%
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: meta?.color || '#9ca3af' }}
                          />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                          <span>{formatNumber(p.views)} views</span>
                          <span>{formatNumber(p.followers)} followers</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Row 3: Engagement Rate Trend + Engagement Breakdown */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Engagement Rate Over Time */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#22c55e]" />
            <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Engagement Rate Over Time
            </p>
          </div>
          {engagementData.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-[var(--text-muted)]">
              No data yet.
            </div>
          ) : (
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={engagementData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="engFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(v: number) => v.toFixed(1) + '%'}
                    tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, padding: '6px 10px' }}
                    formatter={(v: number) => [v.toFixed(2) + '%', 'Engagement']}
                    cursor={{ stroke: '#22c55e', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#engFill)"
                    dot={false}
                    activeDot={{ r: 3, fill: '#22c55e', stroke: 'var(--background)', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Engagement Breakdown */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <EngagementTrend history={history} />
        </div>
      </div>

      {/* Row 4: Content Performance + Platform Engagement */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Content Performance */}
        {contentStats && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="mb-4 flex items-center gap-2">
              <Video className="h-4 w-4 text-[var(--primary)]" />
              <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Content Performance
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Total Videos', value: contentStats.totalVideos, icon: Video, accent: '#d4698e' },
                { label: 'Avg Views', value: contentStats.avgViews, icon: Eye, accent: '#f59e0b' },
                { label: 'Total Likes', value: contentStats.totalLikes, icon: Heart, accent: '#ef4444' },
                { label: 'Total Comments', value: contentStats.totalComments, icon: MessageCircle, accent: '#22c55e' },
              ].map(s => {
                const SIcon = s.icon;
                return (
                  <div key={s.label} className="rounded-lg bg-[var(--muted)] p-3">
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <SIcon className="h-3 w-3" style={{ color: s.accent }} />
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">{s.label}</span>
                    </div>
                    <span className="text-lg font-bold">
                      <NumberFlow value={s.value} format={{ notation: 'compact', maximumFractionDigits: 1 }} />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Platform Engagement Comparison */}
        {platformEngagement.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#22c55e]" />
              <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Platform Engagement
              </p>
            </div>
            <div className="space-y-4">
              {breakdown.map(p => {
                const meta = PLATFORM_META[p.platform];
                const maxEng = Math.max(...breakdown.map(b => b.engagementRate), 1);
                const barPct = (p.engagementRate / maxEng) * 100;
                return (
                  <div key={p.platform}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span style={{ color: meta?.color || '#9ca3af' }}>
                          {meta?.icon || <span className="text-xs font-bold">{p.platform[0].toUpperCase()}</span>}
                        </span>
                        <span className="text-sm font-medium">{meta?.label || p.platform}</span>
                      </div>
                      <span className="text-sm font-bold">{p.engagementRate.toFixed(2)}%</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(barPct, 3)}%`, backgroundColor: meta?.color || '#9ca3af' }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                      <span>{formatNumber(p.likes + p.comments + p.shares)} interactions</span>
                      <span>{formatNumber(p.views)} views</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
