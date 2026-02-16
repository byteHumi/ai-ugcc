'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/useToast';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import { getProfileInitials, getProfileAvatarClass } from './profileAvatar';

export default function NewProfileModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: '', description: '' });
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      showToast('Profile name is required', 'error');
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch('/api/late/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        onClose();
        setForm({ name: '', description: '' });
        showToast('Profile created!', 'success');
        onCreated();
      } else {
        showToast(data.error || 'Failed', 'error');
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Profile" maxWidth="max-w-md">
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-[var(--muted)] px-3 py-2">
          <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold ${getProfileAvatarClass(form.name || 'new-profile')}`}>
            {getProfileInitials(form.name || 'New')}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{form.name || 'New Profile'}</p>
            <p className="truncate text-xs text-[var(--text-muted)]">{form.description || 'Add a short description to identify this profile'}</p>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm text-[var(--text-muted)]">Profile Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g., TikTok Account 3"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-[var(--text-muted)]">Description (optional)</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="e.g., Eastern Europe accounts"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5"
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--master)] py-3 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isCreating ? (
            <>
              <Spinner />
              Creating...
            </>
          ) : (
            'Create Profile'
          )}
        </button>
      </div>
    </Modal>
  );
}
