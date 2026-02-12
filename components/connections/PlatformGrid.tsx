'use client';

import { useState, type ReactNode } from 'react';
import type { Profile, Account } from '@/types';
import { useToast } from '@/hooks/useToast';
import { copyToClipboard } from '@/lib/dateUtils';
import { Link2, Link2Off, Copy, ExternalLink } from 'lucide-react';
import { FaTiktok, FaInstagram, FaYoutube, FaFacebook, FaXTwitter, FaLinkedin } from 'react-icons/fa6';
import Spinner from '@/components/ui/Spinner';

const PLATFORMS: { id: string; label: string; icon: ReactNode; color: string; bg: string }[] = [
  { id: 'tiktok',    label: 'TikTok',       icon: <FaTiktok className="h-5 w-5" />,    color: '#00f2ea', bg: 'bg-[#00f2ea]/10' },
  { id: 'instagram', label: 'Instagram',     icon: <FaInstagram className="h-5 w-5" />, color: '#E1306C', bg: 'bg-[#E1306C]/10' },
  { id: 'youtube',   label: 'YouTube',       icon: <FaYoutube className="h-5 w-5" />,   color: '#FF0000', bg: 'bg-[#FF0000]/10' },
  { id: 'facebook',  label: 'Facebook',      icon: <FaFacebook className="h-5 w-5" />,  color: '#1877F2', bg: 'bg-[#1877F2]/10' },
  { id: 'twitter',   label: 'X (Twitter)',   icon: <FaXTwitter className="h-5 w-5" />,  color: '#ffffff', bg: 'bg-white/10' },
  { id: 'linkedin',  label: 'LinkedIn',      icon: <FaLinkedin className="h-5 w-5" />,  color: '#0A66C2', bg: 'bg-[#0A66C2]/10' },
];

export default function PlatformGrid({
  profileAccounts,
  currentProfile,
  loadConnections,
}: {
  profileAccounts: Account[];
  currentProfile: Profile | null;
  loadConnections: () => Promise<void>;
}) {
  const { showToast } = useToast();
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null);

  return (
    <>
      <h3 className="mb-3 text-sm font-semibold text-[var(--text-muted)]">Platforms</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map(({ id, label, icon, color, bg }) => {
          const account = profileAccounts.find((a) => a.platform === id);

          return (
            <div
              key={id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-shadow hover:shadow-md"
            >
              {/* Header */}
              <div className="mb-3 flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}
                  style={{ color }}
                >
                  {icon}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-semibold">{label}</span>
                  {account ? (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Connected
                    </div>
                  ) : (
                    <div className="text-[10px] text-[var(--text-muted)]">Not connected</div>
                  )}
                </div>
              </div>

              {account ? (
                <>
                  {/* Account info */}
                  <div className="mb-3 rounded-lg bg-[var(--background)] p-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="relative h-9 w-9 shrink-0">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                          style={{ backgroundColor: color }}
                        >
                          {(account.username || account.displayName || '?')[0].toUpperCase()}
                        </div>
                        {account.profilePicture && (
                          <img
                            src={account.profilePicture}
                            alt={account.username || account.displayName || 'Profile'}
                            className="absolute inset-0 h-full w-full rounded-full object-cover z-10"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold">@{account.username || account.displayName}</div>
                        {account.createdAt && (
                          <div className="text-[10px] text-[var(--text-muted)]">
                            {new Date(account.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => copyToClipboard(account._id, showToast)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--text)]"
                        title="Copy ID"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (!confirm('Disconnect this account?')) return;
                        setIsDisconnecting(account._id);
                        try {
                          await fetch(`/api/late/accounts/${account._id}`, { method: 'DELETE' });
                          showToast('Disconnected', 'success');
                          loadConnections();
                        } finally {
                          setIsDisconnecting(null);
                        }
                      }}
                      disabled={isDisconnecting === account._id}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] py-2 text-xs font-medium text-[var(--text-muted)] transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      {isDisconnecting === account._id ? (
                        <Spinner className="h-3.5 w-3.5" />
                      ) : (
                        <Link2Off className="h-3.5 w-3.5" />
                      )}
                      {isDisconnecting === account._id ? 'Removing...' : 'Disconnect'}
                    </button>
                    <button
                      onClick={async () => {
                        const res = await fetch(`/api/late/invite/${id}?profileId=${currentProfile!._id}`);
                        const data = await res.json();
                        if (data.inviteUrl) {
                          copyToClipboard(data.inviteUrl, showToast);
                          showToast('Invite link copied!', 'success');
                        }
                      }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] py-2 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--text)]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Invite
                    </button>
                  </div>
                </>
              ) : (
                /* Not connected */
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setIsConnecting(id);
                      try {
                        const res = await fetch(`/api/late/connect/${id}?profileId=${currentProfile!._id}`);
                        const data = await res.json();
                        if (data.connectUrl) {
                          window.open(data.connectUrl, '_blank');
                          showToast('Complete authorization in the new window, then refresh', 'success');
                        } else {
                          showToast(data.error || `Failed to get ${label} connect URL`, 'error');
                        }
                      } catch {
                        showToast(`Failed to connect ${label}`, 'error');
                      } finally {
                        setIsConnecting(null);
                      }
                    }}
                    disabled={isConnecting === id}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--primary)] py-2 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
                  >
                    {isConnecting === id ? (
                      <Spinner className="h-3.5 w-3.5" />
                    ) : (
                      <Link2 className="h-3.5 w-3.5" />
                    )}
                    {isConnecting === id ? 'Connecting...' : 'Connect'}
                  </button>
                  <button
                    onClick={async () => {
                      const res = await fetch(`/api/late/invite/${id}?profileId=${currentProfile!._id}`);
                      const data = await res.json();
                      if (data.inviteUrl) {
                        copyToClipboard(data.inviteUrl, showToast);
                        showToast('Invite link copied!', 'success');
                      }
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] py-2 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--text)]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Invite
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
