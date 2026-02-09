'use client';

import { useState, useEffect } from 'react';
import type { Profile } from '@/types';
import { useToast } from '@/hooks/useToast';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';

export default function EditProfileModal({
  open,
  onClose,
  profile,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  profile: Profile | null;
  onSaved: (updated: Profile) => void;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: '', description: '', color: '#fcd34d' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile && open) {
      setForm({
        name: profile.name,
        description: profile.description || '',
        color: profile.color || '#fcd34d',
      });
    }
  }, [profile, open]);

  const handleSave = async () => {
    if (!profile) return;
    if (!form.name.trim()) {
      showToast('Profile name is required', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/late/profiles/${profile._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        onClose();
        showToast('Profile updated!', 'success');
        const updated = (data.profile || data) as Profile;
        onSaved(updated);
      } else {
        showToast(data.error || 'Failed', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Profile" maxWidth="max-w-md">
      <div className="space-y-4 p-4">
        <div>
          <label className="mb-2 block text-sm text-[var(--text-muted)]">Profile Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="w-full rounded-lg border border-[var(--border)] px-4 py-2"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-[var(--text-muted)]">Description (optional)</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            className="w-full rounded-lg border border-[var(--border)] px-4 py-2"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-[var(--text-muted)]">Color</label>
          <input
            type="color"
            value={form.color}
            onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
            className="h-9 w-14 cursor-pointer rounded-lg border border-[var(--border)]"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] py-3 font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Spinner />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </Modal>
  );
}
