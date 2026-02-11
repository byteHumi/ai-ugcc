'use client';

import { useState, useRef, useEffect } from 'react';
import type { Profile } from '@/types';
import { useToast } from '@/hooks/useToast';
import { copyToClipboard } from '@/lib/dateUtils';
import { ChevronDown, Pencil, Trash2, Copy, Check } from 'lucide-react';

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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <h3 className="font-semibold">Select Profile</h3>
        <button
          onClick={onEdit}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--text)]"
          title="Edit profile"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={onDelete}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-500"
          title="Delete profile"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <div ref={ref} className="relative mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3 transition-colors hover:bg-[var(--accent)]"
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
          <ChevronDown className={`h-4 w-4 text-[var(--text-muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute left-4 right-4 top-full z-20 mt-1 overflow-hidden rounded-xl border border-[var(--border)] shadow-xl bg-white dark:bg-[#2a2a2a]">
            <div className="max-h-64 overflow-auto p-1">
              {profiles.map((p) => {
                const isActive = currentProfile?._id === p._id;
                return (
                  <button
                    key={p._id}
                    onClick={() => { setCurrentProfile(p); setOpen(false); }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      isActive ? 'bg-[var(--accent)]' : 'hover:bg-[var(--accent)]'
                    }`}
                  >
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color || '#fcd34d' }} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{p.name}</div>
                      {p.description && <div className="text-xs text-[var(--text-muted)] truncate">{p.description}</div>}
                    </div>
                    {isActive && <Check className="h-4 w-4 shrink-0 text-[var(--primary)]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          profile id: <span className="font-mono">{currentProfile?._id ?? '-'}</span>
          <button
            onClick={() => currentProfile && copyToClipboard(currentProfile._id, showToast)}
            className="flex h-5 w-5 items-center justify-center rounded text-[var(--text-muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--text)]"
            title="Copy ID"
          >
            <Copy className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>
    </>
  );
}
