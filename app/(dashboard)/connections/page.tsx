'use client';

import { useState } from 'react';
import type { Profile } from '@/types';
import { useToast } from '@/hooks/useToast';
import { useConnections } from '@/hooks/useConnections';
import RefreshButton from '@/components/ui/RefreshButton';
import ProfileSelector from '@/components/connections/ProfileSelector';
import PlatformGrid from '@/components/connections/PlatformGrid';
import NewProfileModal from '@/components/connections/NewProfileModal';
import EditProfileModal from '@/components/connections/EditProfileModal';

export default function ConnectionsPage() {
  const { showToast } = useToast();
  const {
    profiles,
    accounts,
    currentProfile,
    setCurrentProfile,
    profileAccounts,
    refresh,
  } = useConnections();

  const [newProfileModal, setNewProfileModal] = useState(false);
  const [editProfileModal, setEditProfileModal] = useState(false);

  const handleDeleteProfile = async () => {
    if (!currentProfile) return;
    const accs = accounts.filter((a) => {
      const pId = typeof a.profileId === 'object' ? (a.profileId as { _id: string })?._id : a.profileId;
      return pId === currentProfile._id;
    });
    if (accs.length > 0) {
      showToast('Disconnect all accounts before deleting profile', 'error');
      return;
    }
    if (!confirm(`Delete "${currentProfile.name}"?`)) return;
    await fetch(`/api/late/profiles/${currentProfile._id}`, { method: 'DELETE' });
    showToast('Profile deleted', 'success');
    setCurrentProfile(null as unknown as Profile);
    refresh();
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Connections</h1>
          <p className="text-[var(--text-muted)]">Manage profiles and platform integrations</p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton onClick={refresh} />
          <button
            onClick={() => setNewProfileModal(true)}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white hover:bg-[var(--primary-hover)]"
          >
            + New Profile
          </button>
        </div>
      </div>

      <ProfileSelector
        profiles={profiles}
        currentProfile={currentProfile}
        setCurrentProfile={setCurrentProfile}
        onEdit={() => setEditProfileModal(true)}
        onDelete={handleDeleteProfile}
      />

      <PlatformGrid
        profileAccounts={profileAccounts}
        currentProfile={currentProfile}
        loadConnections={refresh}
      />

      <NewProfileModal
        open={newProfileModal}
        onClose={() => setNewProfileModal(false)}
        onCreated={refresh}
      />

      <EditProfileModal
        open={editProfileModal}
        onClose={() => setEditProfileModal(false)}
        profile={currentProfile}
        onSaved={(updated) => {
          if (currentProfile && updated._id === currentProfile._id) {
            setCurrentProfile(updated);
          }
          refresh();
        }}
      />
    </div>
  );
}
