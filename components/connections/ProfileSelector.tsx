'use client';

import { useState } from 'react';
import type { Profile } from '@/types';
import { useToast } from '@/hooks/useToast';
import { copyToClipboard } from '@/lib/dateUtils';

export default function ProfileSelector({
  profiles,
  currentProfile,
  setCurrentProfile,
  onEdit,
  onDelete,
}: {
  profiles: Profile[];
  currentProfile: Profile | null;
  setCurrentProfile: (p: Profile) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { showToast } = useToast();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <h3 className="font-semibold">Select Profile</h3>
        <button
          onClick={onEdit}
          className="rounded border border-[var(--border)] px-2 py-1 text-sm hover:bg-[var(--background)]"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="rounded border border-[var(--error)] bg-[var(--error-bg)] px-2 py-1 text-sm text-[var(--error)]"
        >
          Delete
        </button>
      </div>
      <div className="relative mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <button
          onClick={() => setProfileDropdownOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: currentProfile?.color || '#fcd34d' }}
            />
            <div className="text-left">
              <div className="font-medium">{currentProfile?.name ?? 'Loading...'}</div>
              <div className="text-sm text-[var(--text-muted)]">{currentProfile?.description ?? '-'}</div>
            </div>
          </div>
          <span>▼</span>
        </button>
        {profileDropdownOpen && (
          <div className="absolute left-4 right-4 top-full z-10 mt-1 max-h-48 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg">
            {profiles.map((p) => (
              <button
                key={p._id}
                onClick={() => {
                  setCurrentProfile(p);
                  setProfileDropdownOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--background)]"
              >
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color || '#fcd34d' }} />
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{p.description || ''}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          profile id: <span>{currentProfile?._id ?? '-'}</span>
          <button
            onClick={() => currentProfile && copyToClipboard(currentProfile._id, showToast)}
            className="rounded border border-[var(--border)] px-2 py-0.5 hover:bg-[var(--background)]"
          >
            copy
          </button>
        </div>
      </div>
    </>
  );
}
