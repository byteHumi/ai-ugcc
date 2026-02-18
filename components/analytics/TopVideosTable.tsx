'use client';

import { ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FaTiktok, FaInstagram, FaYoutube } from 'react-icons/fa6';
import type { AnalyticsMediaItem } from '@/types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 10_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

const PLATFORM_META: Record<string, { icon: ReactNode; color: string }> = {
  tiktok:    { icon: <FaTiktok className="h-3 w-3" />,    color: '#00f2ea' },
  instagram: { icon: <FaInstagram className="h-3 w-3" />, color: '#E1306C' },
  youtube:   { icon: <FaYoutube className="h-3 w-3" />,   color: '#FF0000' },
};

export default function TopVideosTable({ items }: { items: AnalyticsMediaItem[] }) {
  const top5 = items.slice(0, 5);

  return (
    <div>
      <div className="pb-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Top Performing
        </p>
        <p className="mt-1 text-sm font-semibold">Best {Math.min(top5.length, 5)} Videos</p>
      </div>

      {top5.length === 0 ? (
        <p className="pb-5 text-sm text-[var(--text-muted)]">No videos tracked yet.</p>
      ) : (
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[220px]">Video</TableHead>
                <TableHead className="w-8"></TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Likes</TableHead>
                <TableHead className="text-right">Eng.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top5.map((item, i) => {
                const meta = PLATFORM_META[item.platform];
                return (
                  <TableRow key={item.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--muted)] text-[10px] font-bold text-[var(--text-muted)]">
                          {i + 1}
                        </span>
                        {item.thumbnailUrl && (
                          <img src={item.thumbnailUrl} alt="" className="h-8 w-8 rounded-md object-cover" />
                        )}
                        <span className="max-w-[140px] truncate text-sm">
                          {item.url ? (
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {item.title || item.caption?.slice(0, 50) || 'Untitled'}
                            </a>
                          ) : (
                            item.title || item.caption?.slice(0, 50) || 'Untitled'
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span style={{ color: meta?.color || '#9ca3af' }}>{meta?.icon}</span>
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold">{formatNumber(item.views)}</TableCell>
                    <TableCell className="text-right text-sm">{formatNumber(item.likes)}</TableCell>
                    <TableCell className="text-right text-sm">{item.engagementRate.toFixed(1)}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
