'use client';

import { useState, useEffect } from 'react';
import type { Profile, Account } from '@/types';
import { useToast } from '@/hooks/useToast';
import { uploadVideoDirectToGcs } from '@/lib/gcsResumableUpload';
import Spinner from '@/components/ui/Spinner';

export default function CreatePostModal({
  open,
  onClose,
  onSubmitted,
  preselectedVideoUrl,
}: {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  preselectedVideoUrl?: string | null;
}) {
  const { showToast } = useToast();

  const [isLoadingModal, setIsLoadingModal] = useState(false);
  const [videos, setVideos] = useState<{ name: string; path: string; url?: string }[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [postForm, setPostForm] = useState({ caption: '', videoUrl: '', date: '', time: '' });
  const [publishMode, setPublishMode] = useState<'now' | 'schedule' | 'queue' | 'draft'>('now');
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [profileSearchQuery, setProfileSearchQuery] = useState('');
  const [profileMultiDropdownOpen, setProfileMultiDropdownOpen] = useState(false);
  const [postTimezone, setPostTimezone] = useState('Asia/Kolkata');
  const [isPosting, setIsPosting] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [postVideoUploadProgress, setPostVideoUploadProgress] = useState<number>(0);
  const [uploadedVideoPath, setUploadedVideoPath] = useState<string | null>(null);
  const [uploadedVideoPreviewUrl, setUploadedVideoPreviewUrl] = useState<string | null>(null);
  const [uploadedVideoName, setUploadedVideoName] = useState<string | null>(null);

  // Derived
  const selectedProfileAccounts = accounts.filter((a) => {
    const pId = typeof a.profileId === 'object' ? (a.profileId as { _id: string })?._id : a.profileId;
    return pId && selectedProfiles.includes(pId);
  });
  const postableAccounts = selectedProfileAccounts.filter(
    (a) => a.platform === 'tiktok' || a.platform === 'instagram' || a.platform === 'youtube'
  );

  useEffect(() => {
    if (!open) return;
    setIsLoadingModal(true);
    Promise.all([
      fetch('/api/videos').then((r) => r.json()),
      fetch('/api/late/accounts').then((r) => r.json()),
      fetch('/api/late/profiles').then((r) => r.json()),
    ]).then(([videosData, accountsData, profilesData]) => {
      setVideos(videosData.videos || []);
      setAccounts(accountsData.accounts || []);
      setProfiles(profilesData.profiles || []);
    }).catch(console.error).finally(() => {
      setIsLoadingModal(false);
    });
    setPostForm({ caption: '', videoUrl: preselectedVideoUrl || '', date: '', time: '' });
    setUploadedVideoPath(null);
    setUploadedVideoPreviewUrl(null);
    setUploadedVideoName(null);
    setPublishMode('now');
    setSelectedProfiles([]);
    setSelectedAccountIds([]);
    setProfileSearchQuery('');
    setProfileMultiDropdownOpen(false);
    setPostTimezone('Asia/Kolkata');
  }, [open, preselectedVideoUrl]);

  const uploadPostVideoFile = async (file: File) => {
    setIsUploadingVideo(true);
    setUploadedVideoName(file.name);
    setPostVideoUploadProgress(0);
    try {
      const data = await uploadVideoDirectToGcs(file, {
        onProgress: (uploadedBytes, totalBytes) => {
          const progress = totalBytes === 0 ? 0 : Math.round((uploadedBytes / totalBytes) * 100);
          setPostVideoUploadProgress(progress);
        },
      });
      if (data.success) {
        setUploadedVideoPath(data.gcsUrl);
        setUploadedVideoPreviewUrl(data.url || data.gcsUrl);
        setPostForm((p) => ({ ...p, videoUrl: '' }));
        showToast('Video uploaded successfully!', 'success');
      } else {
        setUploadedVideoName(null);
        showToast('Upload failed', 'error');
      }
    } catch (err) {
      setUploadedVideoName(null);
      showToast((err as Error).message || 'Upload failed', 'error');
    } finally {
      setIsUploadingVideo(false);
      setPostVideoUploadProgress(0);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadPostVideoFile(file);
    e.target.value = '';
  };

  const submitPost = async () => {
    const videoUrl = uploadedVideoPath || postForm.videoUrl;
    if (!videoUrl) {
      showToast('Please select or upload a video', 'error');
      return;
    }
    if (selectedAccountIds.length === 0) {
      showToast('Please select at least one account', 'error');
      return;
    }
    if (publishMode === 'schedule' && (!postForm.date || !postForm.time)) {
      showToast('Please select both date and time for scheduling', 'error');
      return;
    }

    setIsPosting(true);
    try {
      const platformTargets = selectedAccountIds.map((accId) => {
        const acc = postableAccounts.find((a) => a._id === accId);
        return { platform: acc?.platform || 'tiktok', accountId: accId };
      });

      const body: Record<string, unknown> = {
        videoUrl,
        caption: postForm.caption,
        platforms: platformTargets,
        publishMode,
      };
      if (publishMode === 'schedule') {
        body.scheduledFor = `${postForm.date}T${postForm.time}:00`;
        body.timezone = postTimezone;
      }

      onClose();
      const toastMsg = publishMode === 'now'
        ? `Publishing to ${platformTargets.length} account${platformTargets.length > 1 ? 's' : ''}...`
        : publishMode === 'schedule'
          ? 'Scheduling post...'
          : publishMode === 'draft'
            ? 'Saving draft...'
            : 'Adding to queue...';
      showToast(toastMsg, 'success');

      const res = await fetch('/api/posts/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(data.message || 'Post submitted!', 'success');
        onSubmitted();
      } else {
        const errorMsg = data.error || 'Failed to post';
        const details = data.details;
        showToast(details?.error || errorMsg, 'error');
        console.error('[Submit Post] Error:', data);
      }
    } catch (err) {
      showToast('Error: ' + (err as Error).message, 'error');
      console.error('[Submit Post] Exception:', err);
    } finally {
      setIsPosting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-[var(--surface)] shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <h3 className="text-lg font-semibold">Create Post</h3>
          <button onClick={onClose} className="text-2xl text-[var(--text-muted)]">&times;</button>
        </div>
        {isLoadingModal ? (
          <div className="space-y-4 p-4">
            <div className="animate-pulse space-y-4">
              <div>
                <div className="mb-2 h-4 w-24 rounded bg-[var(--background)]" />
                <div className="h-10 w-full rounded-lg bg-[var(--background)]" />
              </div>
              <div>
                <div className="mb-2 h-4 w-16 rounded bg-[var(--background)]" />
                <div className="h-24 w-full rounded-lg bg-[var(--background)]" />
              </div>
              <div>
                <div className="mb-2 h-4 w-32 rounded bg-[var(--background)]" />
                <div className="h-10 w-full rounded-lg bg-[var(--background)]" />
              </div>
              <div className="h-12 w-full rounded-lg bg-[var(--background)]" />
            </div>
          </div>
        ) : (
        <div className="space-y-4 p-4">
          {/* Video Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-muted)]">Select Video</label>

            {uploadedVideoPath && (
              <div className="mb-3 overflow-hidden rounded-xl border-2 border-[var(--success)] bg-[var(--success-bg)]">
                <div className="flex items-center justify-between border-b border-[var(--success)]/20 bg-[var(--success-bg)] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium text-[var(--success)]">Uploaded: {uploadedVideoName || 'video.mp4'}</span>
                  </div>
                  <button
                    onClick={() => {
                      setUploadedVideoPath(null);
                      setUploadedVideoPreviewUrl(null);
                      setUploadedVideoName(null);
                    }}
                    className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--background)] hover:text-[var(--error)]"
                    title="Remove video"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="bg-black">
                  <video
                    src={uploadedVideoPreviewUrl || uploadedVideoPath}
                    controls
                    className="mx-auto max-h-48 w-full object-contain"
                  />
                </div>
              </div>
            )}

            {!uploadedVideoPath && (
              <>
                <select
                  value={postForm.videoUrl}
                  onChange={(e) => setPostForm((p) => ({ ...p, videoUrl: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--border)] px-4 py-2"
                  disabled={isUploadingVideo}
                >
                  <option value="">Select a generated video...</option>
                  {videos.map((v) => (
                    <option key={v.path} value={v.path}>{v.name}</option>
                  ))}
                </select>

                {postForm.videoUrl && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-black">
                    <video
                      src={videos.find((v) => v.path === postForm.videoUrl)?.url || postForm.videoUrl}
                      controls
                      className="mx-auto max-h-48 w-full object-contain"
                    />
                  </div>
                )}

                <p className="mt-3 text-center text-sm text-[var(--text-muted)]">or</p>
              </>
            )}

            {!uploadedVideoPath && (
              <label
                className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-6 transition-colors ${
                  isUploadingVideo
                    ? 'border-[var(--primary)] bg-[var(--primary)]/5 cursor-wait'
                    : 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--background)]'
                }`}
                onDragOver={(e) => {
                  if (isUploadingVideo) return;
                  e.preventDefault();
                  e.currentTarget.classList.add('border-[var(--primary)]', 'bg-[var(--surface)]', 'scale-[1.01]');
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-[var(--primary)]', 'bg-[var(--surface)]', 'scale-[1.01]');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-[var(--primary)]', 'bg-[var(--surface)]', 'scale-[1.01]');
                  if (isUploadingVideo) return;
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith('video/')) {
                    uploadPostVideoFile(file);
                  } else {
                    showToast('Please drop a video file', 'error');
                  }
                }}
              >
                {isUploadingVideo ? (
                  <>
                    <Spinner className="h-8 w-8 text-[var(--primary)]" />
                    <span className="mt-2 text-sm font-medium text-[var(--primary)]">
                      Uploading {uploadedVideoName}... {postVideoUploadProgress}%
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">Large files upload in chunks directly to storage</span>
                  </>
                ) : (
                  <>
                    <svg className="h-8 w-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="mt-2 text-sm font-medium text-[var(--text)]">Upload video from computer</span>
                    <span className="text-xs text-[var(--text-muted)]">MP4, MOV, WebM supported</span>
                  </>
                )}
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoUpload}
                  disabled={isUploadingVideo}
                />
              </label>
            )}
          </div>

          {/* Caption */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-muted)]">Caption</label>
            <textarea
              value={postForm.caption}
              onChange={(e) => setPostForm((p) => ({ ...p, caption: e.target.value }))}
              placeholder="Write your caption... #fyp #viral"
              className="min-h-[100px] w-full resize-y rounded-lg border border-[var(--border)] px-4 py-2"
            />
          </div>

          {/* Multi-Profile Selector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-muted)]">Select Profiles</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileMultiDropdownOpen((o) => !o)}
                className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5"
              >
                <div className="flex items-center gap-2">
                  {selectedProfiles.length > 0 ? (
                    <>
                      <div className="flex -space-x-1">
                        {profiles.filter((p) => selectedProfiles.includes(p._id)).slice(0, 4).map((p) => (
                          <div
                            key={p._id}
                            className="h-4 w-4 rounded-full border-2 border-[var(--background)]"
                            style={{ backgroundColor: p.color || '#fcd34d' }}
                          />
                        ))}
                      </div>
                      <span className="text-sm">{selectedProfiles.length} profile{selectedProfiles.length !== 1 ? 's' : ''} selected</span>
                    </>
                  ) : (
                    <span className="text-sm text-[var(--text-muted)]">Select profiles...</span>
                  )}
                </div>
                <svg className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${profileMultiDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {profileMultiDropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                  <div className="border-b border-[var(--border)] p-2">
                    <input
                      type="text"
                      value={profileSearchQuery}
                      onChange={(e) => setProfileSearchQuery(e.target.value)}
                      placeholder="Search profiles..."
                      className="w-full rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2 border-b border-[var(--border)] px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setSelectedProfiles(profiles.map((p) => p._id))}
                      className="text-xs text-[var(--primary)] hover:underline"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedProfiles([]); setSelectedAccountIds([]); }}
                      className="text-xs text-[var(--text-muted)] hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  {profiles
                    .filter((p) => !profileSearchQuery || p.name.toLowerCase().includes(profileSearchQuery.toLowerCase()))
                    .map((p) => (
                      <label
                        key={p._id}
                        className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-[var(--background)]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedProfiles.includes(p._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const newProfiles = [...selectedProfiles, p._id];
                              setSelectedProfiles(newProfiles);
                              const newAccounts = accounts.filter((a) => {
                                const aProfileId = typeof a.profileId === 'object' ? (a.profileId as { _id: string })?._id : a.profileId;
                                return aProfileId === p._id && (a.platform === 'tiktok' || a.platform === 'instagram' || a.platform === 'youtube');
                              });
                              setSelectedAccountIds((prev) => [...new Set([...prev, ...newAccounts.map((a) => a._id)])]);
                            } else {
                              setSelectedProfiles((prev) => prev.filter((id) => id !== p._id));
                              const profileAccountIds = accounts
                                .filter((a) => {
                                  const aProfileId = typeof a.profileId === 'object' ? (a.profileId as { _id: string })?._id : a.profileId;
                                  return aProfileId === p._id;
                                })
                                .map((a) => a._id);
                              setSelectedAccountIds((prev) => prev.filter((id) => !profileAccountIds.includes(id)));
                            }
                          }}
                          className="h-4 w-4 rounded accent-[var(--primary)]"
                        />
                        <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: p.color || '#fcd34d' }} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{p.name}</div>
                          {p.description && <div className="truncate text-xs text-[var(--text-muted)]">{p.description}</div>}
                        </div>
                      </label>
                    ))}
                  {selectedProfiles.length > 0 && (
                    <div className="border-t border-[var(--border)] px-3 py-2 text-xs text-[var(--text-muted)]">
                      Selected: {profiles.filter((p) => selectedProfiles.includes(p._id)).map((p) => p.name).join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Platform Account Cards */}
          {postableAccounts.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-muted)]">
                Accounts ({selectedAccountIds.length}/{postableAccounts.length} selected)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {postableAccounts.map((a) => {
                  const isSelected = selectedAccountIds.includes(a._id);
                  return (
                    <label
                      key={a._id}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-2 p-3 transition-colors ${
                        isSelected
                          ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                          : 'border-[var(--border)] hover:border-[var(--primary)]/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAccountIds((prev) => [...prev, a._id]);
                          } else {
                            setSelectedAccountIds((prev) => prev.filter((id) => id !== a._id));
                          }
                        }}
                        className="h-4 w-4 shrink-0 rounded accent-[var(--primary)]"
                      />
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        {a.platform === 'tiktok' ? (
                          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>
                        ) : a.platform === 'youtube' ? (
                          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                        ) : (
                          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        )}
                        {a.profilePicture ? (
                          <img src={a.profilePicture} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--border)] text-xs font-medium">
                            {(a.username || a.displayName || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <span className="truncate text-sm">@{a.username || a.displayName}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Publishing Options */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-muted)]">Publishing</label>
            <div className="mb-2 grid grid-cols-4 gap-1 rounded-lg border border-[var(--border)] p-1">
              {(['now', 'schedule', 'queue', 'draft'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPublishMode(mode)}
                  className={`rounded-md px-2 py-2 text-sm font-medium capitalize transition-colors ${
                    publishMode === mode
                      ? 'bg-[var(--primary)] text-white'
                      : 'text-[var(--text-muted)] hover:bg-[var(--background)]'
                  }`}
                >
                  {mode === 'now' ? 'Now' : mode === 'schedule' ? 'Schedule' : mode === 'queue' ? 'Queue' : 'Draft'}
                </button>
              ))}
            </div>
            {publishMode === 'schedule' && (
              <div className="mt-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-[var(--text-muted)]">Date</label>
                    <input
                      type="date"
                      value={postForm.date}
                      onChange={(e) => setPostForm((p) => ({ ...p, date: e.target.value }))}
                      className="w-full rounded-lg border border-[var(--border)] px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-muted)]">Time</label>
                    <input
                      type="time"
                      value={postForm.time}
                      onChange={(e) => setPostForm((p) => ({ ...p, time: e.target.value }))}
                      className="w-full rounded-lg border border-[var(--border)] px-4 py-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)]">Timezone</label>
                  <select
                    value={postTimezone}
                    onChange={(e) => setPostTimezone(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                    <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={submitPost}
            disabled={isPosting || selectedAccountIds.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] py-3 font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPosting ? (
              <>
                <Spinner />
                {publishMode === 'now' ? 'Publishing...' : publishMode === 'schedule' ? 'Scheduling...' : publishMode === 'draft' ? 'Saving...' : 'Queuing...'}
              </>
            ) : (
              (() => {
                const selectedPlatforms = selectedAccountIds.map((id) => postableAccounts.find((a) => a._id === id)?.platform).filter(Boolean);
                const uniquePlatforms = [...new Set(selectedPlatforms)];
                if (publishMode === 'draft') return 'Save Draft';
                if (publishMode === 'schedule') return 'Schedule Post';
                if (publishMode === 'queue') return 'Add to Queue';
                if (selectedAccountIds.length === 0) return 'Select accounts to publish';
                if (selectedAccountIds.length === 1 && uniquePlatforms.length === 1) {
                  const name = uniquePlatforms[0] === 'tiktok' ? 'TikTok' : uniquePlatforms[0] === 'youtube' ? 'YouTube' : 'Instagram';
                  return `Publish to ${name}`;
                }
                return `Publish to ${selectedAccountIds.length} accounts`;
              })()
            )}
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
