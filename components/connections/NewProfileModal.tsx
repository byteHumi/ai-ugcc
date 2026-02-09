'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/useToast';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';

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
  const [form, setForm] = useState({ name: '', description: '', color: '#fcd34d' });
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
        setForm({ name: '', description: '', color: '#fcd34d' });
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
    <Modal open={open} onClose={onClose} title="Create New Profile" maxWidth="max-w-md">
      <div className="space-y-4 p-4">
        <div>
          <label className="mb-2 block text-sm text-[var(--text-muted)]">Profile Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g., TikTok Account 3"
            className="w-full rounded-lg border border-[var(--border)] px-4 py-2"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-[var(--text-muted)]">Description (optional)</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="e.g., Main business account"
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
          onClick={handleCreate}
          disabled={isCreating}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] py-3 font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
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
