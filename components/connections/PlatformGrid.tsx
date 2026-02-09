'use client';

import { useState } from 'react';
import type { Profile, Account } from '@/types';
import { useToast } from '@/hooks/useToast';
import { copyToClipboard } from '@/lib/dateUtils';
import Spinner from '@/components/ui/Spinner';

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
      <h3 className="mb-4 font-semibold">Platforms</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {['tiktok', 'instagram', 'youtube', 'facebook', 'twitter', 'linkedin'].map((platform) => {
          const account = profileAccounts.find((a) => a.platform === platform);
          const icon = platform === 'tiktok' ? '♪' : platform === 'instagram' ? '📷' : platform === 'youtube' ? '▶' : platform === 'facebook' ? 'f' : platform === 'linkedin' ? 'in' : '𝕏';
          return (
            <div key={platform} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-[var(--tiktok)]">{icon}</span>
                <span className="font-semibold capitalize">{platform === 'twitter' ? 'X (Twitter)' : platform}</span>
              </div>
              {account ? (
                <>
                  <div className="mb-2 rounded-lg bg-[var(--background)] p-3">
                    <div className="flex items-center gap-3">
                      {account.profilePicture ? (
                        <img
                          src={account.profilePicture}
                          alt={account.username || account.displayName || 'Profile'}
                          className="h-12 w-12 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--border)] text-lg font-semibold text-[var(--text-muted)]">
                          {(account.username || account.displayName || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">@{account.username || account.displayName}</div>
                        {account.createdAt && (
                          <div className="text-xs text-[var(--text-muted)]">Connected {new Date(account.createdAt).toLocaleDateString()}</div>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      id: {account._id.slice(0, 8)}...
                      <button onClick={() => copyToClipboard(account._id, showToast)} className="rounded border px-1 hover:bg-white">copy</button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
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
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] py-2 text-sm hover:bg-[var(--background)] disabled:opacity-50"
                    >
                      {isDisconnecting === account._id ? (
                        <>
                          <Spinner className="h-4 w-4" />
                          Disconnecting...
                        </>
                      ) : (
                        'Disconnect'
                      )}
                    </button>
                    <button
                      onClick={async () => {
                        const res = await fetch(`/api/late/invite/${platform}?profileId=${currentProfile!._id}`);
                        const data = await res.json();
                        if (data.inviteUrl) {
                          copyToClipboard(data.inviteUrl, showToast);
                          showToast('Invite link copied!', 'success');
                        }
                      }}
                      className="w-full rounded-lg border border-[var(--border)] py-2 text-sm hover:bg-[var(--background)]"
                    >
                      🔗 Invite
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={async () => {
                      setIsConnecting(platform);
                      try {
                        const res = await fetch(`/api/late/connect/${platform}?profileId=${currentProfile!._id}`);
                        const data = await res.json();
                        if (data.connectUrl) {
                          window.open(data.connectUrl, '_blank');
                          showToast('Complete authorization in the new window, then refresh', 'success');
                        }
                      } finally {
                        setIsConnecting(null);
                      }
                    }}
                    disabled={isConnecting === platform}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--accent-border)] bg-[var(--accent)] py-2 text-sm hover:bg-[#fde68a] disabled:opacity-50"
                  >
                    {isConnecting === platform ? (
                      <>
                        <Spinner className="h-4 w-4" />
                        Connecting...
                      </>
                    ) : (
                      '+ Connect'
                    )}
                  </button>
                  <button
                    onClick={async () => {
                      const res = await fetch(`/api/late/invite/${platform}?profileId=${currentProfile!._id}`);
                      const data = await res.json();
                      if (data.inviteUrl) {
                        copyToClipboard(data.inviteUrl, showToast);
                        showToast('Invite link copied!', 'success');
                      }
                    }}
                    className="w-full rounded-lg border border-[var(--border)] py-2 text-sm hover:bg-[var(--background)]"
                  >
                    🔗 Invite
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
