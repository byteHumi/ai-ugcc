'use client';

import { ReactNode } from 'react';
import NumberFlow from '@number-flow/react';
import { FaTiktok, FaInstagram, FaYoutube } from 'react-icons/fa6';
import type { AnalyticsOverview } from '@/types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 10_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

const PLATFORM_META: Record<string, { label: string; icon: ReactNode; color: string }> = {
  tiktok:    { label: 'TikTok',    icon: <FaTiktok className="h-4 w-4" />,    color: '#00f2ea' },
  instagram: { label: 'Instagram', icon: <FaInstagram className="h-4 w-4" />, color: '#E1306C' },
  youtube:   { label: 'YouTube',   icon: <FaYoutube className="h-4 w-4" />,   color: '#FF0000' },
};

export default function PlatformComparison({ overview }: { overview: AnalyticsOverview | null }) {
  const breakdown = overview?.platformBreakdown || [];

  if (breakdown.length === 0) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-[var(--text-muted)]">
        No platforms tracked yet.
      </div>
    );
  }

  const totalViews = breakdown.reduce((s, p) => s + p.views, 0) || 1;

  return (
    <div>
      <div className="pb-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Platform Performance
        </p>
      </div>

      {/* Stacked share bar */}
      <div className="mb-4 flex h-2.5 gap-1">
        {breakdown.map((p) => {
          const meta = PLATFORM_META[p.platform];
          const pct = (p.views / totalViews) * 100;
          return (
            <div
              key={p.platform}
              className="rounded-full"
              style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: meta?.color || '#9ca3af' }}
            />
          );
        })}
      </div>

      {/* Platform rows */}
      <div className="divide-y divide-[var(--border)]">
        {breakdown.map((p) => {
          const meta = PLATFORM_META[p.platform];
          const viewsPct = ((p.views / totalViews) * 100).toFixed(0);

          return (
            <div key={p.platform} className="py-3.5">
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${meta?.color || '#9ca3af'}10`, color: meta?.color || '#9ca3af' }}
                >
                  {meta?.icon || <span className="text-xs font-bold">{p.platform[0].toUpperCase()}</span>}
                </div>

                {/* Name + accounts */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{meta?.label || p.platform}</span>
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: `${meta?.color || '#9ca3af'}12`, color: meta?.color }}
                    >
                      {viewsPct}%
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {p.accountCount} account{p.accountCount !== 1 ? 's' : ''} · {p.engagementRate.toFixed(1)}% eng
                  </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-5 text-right">
                  <div>
                    <p className="text-sm font-bold">
                      <NumberFlow value={p.followers} format={{ notation: 'compact', maximumFractionDigits: 1 }} />
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">followers</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold">
                      <NumberFlow value={p.views} format={{ notation: 'compact', maximumFractionDigits: 1 }} />
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">views</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{formatNumber(p.likes + p.comments + p.shares)}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">interactions</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
