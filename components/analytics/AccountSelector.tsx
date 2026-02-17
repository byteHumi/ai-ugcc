'use client';

import { ReactNode } from 'react';
import { FaTiktok, FaInstagram, FaYoutube } from 'react-icons/fa6';
import type { AnalyticsAccount } from '@/types';

const PLATFORM_META: Record<string, { icon: ReactNode; color: string }> = {
  tiktok:    { icon: <FaTiktok className="h-3 w-3" />,    color: '#00f2ea' },
  instagram: { icon: <FaInstagram className="h-3 w-3" />, color: '#E1306C' },
  youtube:   { icon: <FaYoutube className="h-3 w-3" />,   color: '#FF0000' },
};

export default function AccountSelector({
  accounts,
  selected,
  onToggle,
}: {
  accounts: AnalyticsAccount[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (accounts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {accounts.map(account => {
        const isActive = selected.has(account.id);
        const meta = PLATFORM_META[account.platform];
        return (
          <button
            key={account.id}
            onClick={() => onToggle(account.id)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-all ${
              isActive
                ? 'border-[var(--primary)] bg-[var(--accent)]'
                : 'border-[var(--border)] opacity-50 hover:opacity-75'
            }`}
          >
            <span style={{ color: meta?.color || '#9ca3af' }}>{meta?.icon}</span>
            <span>@{account.username}</span>
          </button>
        );
      })}
    </div>
  );
}
