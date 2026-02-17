'use client';

import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Trash2, Users, Eye, TrendingUp, ExternalLink, Play } from 'lucide-react';
import { FaTiktok, FaInstagram, FaYoutube } from 'react-icons/fa6';
import type { AnalyticsAccount } from '@/types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

const PLATFORM_META: Record<string, { label: string; icon: ReactNode; color: string; bg: string; urlPrefix: string }> = {
  tiktok:    { label: 'TikTok',    icon: <FaTiktok className="h-3.5 w-3.5" />,    color: '#00f2ea', bg: 'bg-[#00f2ea]/10', urlPrefix: 'https://www.tiktok.com/@' },
  instagram: { label: 'Instagram', icon: <FaInstagram className="h-3.5 w-3.5" />, color: '#E1306C', bg: 'bg-[#E1306C]/10', urlPrefix: 'https://www.instagram.com/' },
  youtube:   { label: 'YouTube',   icon: <FaYoutube className="h-3.5 w-3.5" />,   color: '#FF0000', bg: 'bg-[#FF0000]/10', urlPrefix: 'https://www.youtube.com/@' },
};

export default function AccountCard({
  account,
  syncing,
  onRefresh,
  onRemove,
}: {
  account: AnalyticsAccount;
  syncing: boolean;
  onRefresh: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const meta = PLATFORM_META[account.platform] || { label: account.platform, icon: null, color: '#9ca3af', bg: 'bg-gray-500/10', urlPrefix: '' };
  const profileLink = meta.urlPrefix ? `${meta.urlPrefix}${account.username}` : '';

  return (
    <Card className="border-[var(--border)] transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {account.profileUrl ? (
            <img
              src={account.profileUrl}
              alt=""
              className="h-12 w-12 rounded-full object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`${account.profileUrl ? 'hidden' : ''} flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${meta.bg} text-lg font-bold`} style={{ color: meta.color }}>
            {meta.icon || account.username[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold">{account.displayName || account.username}</span>
              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${meta.bg}`} style={{ color: meta.color }}>
                {meta.icon}
              </div>
            </div>
            {profileLink ? (
              <a href={profileLink} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
                @{account.username}
              </a>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">@{account.username}</p>
            )}
          </div>
          <div className="flex shrink-0 gap-1">
            {profileLink && (
              <a href={profileLink} target="_blank" rel="noopener noreferrer" title={`Visit on ${meta.label}`}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                  <span><ExternalLink className="h-3.5 w-3.5" /></span>
                </Button>
              </a>
            )}
            <Button variant="ghost" size="sm" onClick={() => onRefresh(account.id)} disabled={syncing} className="h-8 w-8 p-0" title="Refresh">
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => { if (confirm(`Remove @${account.username} from analytics?`)) onRemove(account.id); }}
              className="h-8 w-8 p-0 text-[var(--error)] hover:text-[var(--error)]" title="Remove"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <div className="text-center">
            <Users className="mx-auto mb-1 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <p className="text-sm font-semibold">{formatNumber(account.followers)}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Followers</p>
          </div>
          <div className="text-center">
            <Eye className="mx-auto mb-1 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <p className="text-sm font-semibold">{formatNumber(account.totalViews)}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Views</p>
          </div>
          <div className="text-center">
            <Play className="mx-auto mb-1 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <p className="text-sm font-semibold">{account.mediaCount ?? 0}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Videos</p>
          </div>
          <div className="text-center">
            <TrendingUp className="mx-auto mb-1 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <p className="text-sm font-semibold">{account.engagementRate.toFixed(1)}%</p>
            <p className="text-[10px] text-[var(--text-muted)]">Engagement</p>
          </div>
        </div>

        {account.lastSyncedAt && (
          <p className="mt-3 text-[10px] text-[var(--text-muted)]">
            Last synced: {new Date(account.lastSyncedAt).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
