'use client';

import { useState, useEffect, useCallback } from 'react';

type Job = {
  id: string;
  tiktokUrl: string;
  imageUrl: string;
  imageName?: string; // Backwards compatibility
  status: string;
  step: string;
  outputUrl?: string;
  createdAt: string;
};

type Post = {
  _id: string;
  content?: string;
  scheduledFor?: string;
  createdAt?: string;
  mediaItems?: { url?: string; thumbnailUrl?: string }[];
  platforms?: { platform: string; status?: string; platformPostUrl?: string }[];
};

type Profile = {
  _id: string;
  name: string;
  description?: string;
  color?: string;
};

type Account = {
  _id: string;
  platform: string;
  username?: string;
  displayName?: string;
  profilePicture?: string;
  createdAt?: string;
  profileId?: { _id: string } | string;
};

type Model = {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  imageCount?: number;
  createdAt?: string;
};

type ModelImage = {
  id: string;
  modelId: string;
  gcsUrl: string;
  signedUrl?: string;
  filename: string;
  isPrimary?: boolean;
};

type Batch = {
  id: string;
  name: string;
  status: string;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  progress?: number;
  model?: { id: string; name: string; avatarUrl?: string };
  jobs?: Job[];
  createdAt?: string;
};

export default function Home() {
  const [page, setPage] = useState<'generate' | 'models' | 'batches' | 'posts' | 'connections'>('generate');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsFilter, setPostsFilter] = useState<string>('all');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [uploadedImageName, setUploadedImageName] = useState<string | null>(null);
  const [uploadedImagePath, setUploadedImagePath] = useState<string | null>(null);
  const [uploadedVideoPath, setUploadedVideoPath] = useState<string | null>(null);
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [maxSeconds, setMaxSeconds] = useState(10);
  const [generateDisabled, setGenerateDisabled] = useState(true);
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [createPostModal, setCreatePostModal] = useState(false);
  const [newProfileModal, setNewProfileModal] = useState(false);
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now');
  const [videos, setVideos] = useState<{ name: string; path: string; url?: string }[]>([]);
  const [postForm, setPostForm] = useState({ caption: '', videoUrl: '', accountId: '', date: '', time: '' });
  const [newProfileForm, setNewProfileForm] = useState({ name: '', description: '', color: '#fcd34d' });
  const [editProfileForm, setEditProfileForm] = useState({ name: '', description: '', color: '#fcd34d' });
  const [preselectedVideoPath, setPreselectedVideoPath] = useState<string | null>(null);

  // Models state
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [modelImages, setModelImages] = useState<ModelImage[]>([]);
  const [modelImagesUploading, setModelImagesUploading] = useState(false);
  const [newModelModal, setNewModelModal] = useState(false);
  const [newModelForm, setNewModelForm] = useState({ name: '', description: '' });
  const [modelDetailModal, setModelDetailModal] = useState(false);

  // Batches state
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [batchDetailModal, setBatchDetailModal] = useState(false);
  const [batchPollingInterval, setBatchPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Bulk generate state
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkUrls, setBulkUrls] = useState('');
  const [parsedUrls, setParsedUrls] = useState<string[]>([]);
  const [selectedModelForGenerate, setSelectedModelForGenerate] = useState<string>('');
  const [imageSelectionMode, setImageSelectionMode] = useState<'all' | 'specific'>('all');
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [batchName, setBatchName] = useState('');

  const showToast = useCallback((message: string, type = '') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load jobs:', e);
    }
  }, []);

  const loadPosts = useCallback(async () => {
    try {
      let endpoint = '/api/late/posts?limit=50';
      if (postsFilter !== 'all') endpoint += `&status=${postsFilter}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (e) {
      console.error('Failed to load posts:', e);
    }
  }, [postsFilter]);

  const loadConnections = useCallback(async () => {
    try {
      const [profilesRes, accountsRes] = await Promise.all([
        fetch('/api/late/profiles'),
        fetch('/api/late/accounts'),
      ]);
      const profilesData = await profilesRes.json();
      const accountsData = await accountsRes.json();
      setProfiles(profilesData.profiles || []);
      setAccounts(accountsData.accounts || []);
      if (profilesData.profiles?.length && !currentProfile) {
        setCurrentProfile(profilesData.profiles[0]);
      }
    } catch (e) {
      console.error('Failed to load connections:', e);
    }
  }, [currentProfile]);

  const loadModels = useCallback(async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      setModels(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load models:', e);
    }
  }, []);

  const loadModelImages = useCallback(async (modelId: string) => {
    try {
      const res = await fetch(`/api/models/${modelId}/images`);
      const data = await res.json();
      setModelImages(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load model images:', e);
    }
  }, []);

  const loadBatches = useCallback(async () => {
    try {
      const res = await fetch('/api/batches');
      const data = await res.json();
      setBatches(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load batches:', e);
    }
  }, []);

  const loadBatchDetail = useCallback(async (batchId: string) => {
    try {
      const res = await fetch(`/api/batches/${batchId}`);
      const data = await res.json();
      setSelectedBatch(data);
    } catch (e) {
      console.error('Failed to load batch detail:', e);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    const hasActive = jobs.some((j) => j.status === 'queued' || j.status === 'processing');
    if (hasActive && !pollingInterval) {
      const id = setInterval(loadJobs, 2000);
      setPollingInterval(id);
    } else if (!hasActive && pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [jobs, loadJobs, pollingInterval]);

  useEffect(() => {
    setGenerateDisabled(!tiktokUrl.trim() || !uploadedImagePath);
  }, [tiktokUrl, uploadedImagePath]);

  useEffect(() => {
    if (page === 'posts') loadPosts();
  }, [page, postsFilter, loadPosts]);

  useEffect(() => {
    if (page === 'connections') loadConnections();
  }, [page, loadConnections]);

  useEffect(() => {
    if (page === 'models') loadModels();
  }, [page, loadModels]);

  useEffect(() => {
    if (page === 'batches') loadBatches();
  }, [page, loadBatches]);

  useEffect(() => {
    if (page === 'generate') loadModels();
  }, [page, loadModels]);

  // Poll batches for progress updates
  useEffect(() => {
    const hasActive = batches.some((b) => b.status === 'pending' || b.status === 'processing');
    if (hasActive && page === 'batches' && !batchPollingInterval) {
      const id = setInterval(loadBatches, 3000);
      setBatchPollingInterval(id);
    } else if ((!hasActive || page !== 'batches') && batchPollingInterval) {
      clearInterval(batchPollingInterval);
      setBatchPollingInterval(null);
    }
    return () => {
      if (batchPollingInterval) clearInterval(batchPollingInterval);
    };
  }, [batches, page, loadBatches, batchPollingInterval]);

  // Parse bulk URLs
  const handleParseBulkUrls = async () => {
    if (!bulkUrls.trim()) {
      setParsedUrls([]);
      return;
    }
    try {
      const res = await fetch('/api/parse-tiktok-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: bulkUrls }),
      });
      const data = await res.json();
      setParsedUrls(data.urls || []);
      if (data.duplicates > 0) {
        showToast(`Found ${data.urls.length} URLs (${data.duplicates} duplicates removed)`, 'success');
      }
    } catch (e) {
      console.error('Failed to parse URLs:', e);
    }
  };

  // Handle CSV upload for bulk URLs
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('csv', file);
    try {
      const res = await fetch('/api/parse-tiktok-urls', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setParsedUrls(data.urls || []);
      showToast(`Loaded ${data.urls.length} URLs from CSV`, 'success');
    } catch (e) {
      showToast('Failed to parse CSV', 'error');
    }
  };

  // Handle bulk generate
  const handleBulkGenerate = async () => {
    if (parsedUrls.length === 0) {
      showToast('No TikTok URLs to generate', 'error');
      return;
    }
    if (!selectedModelForGenerate && !uploadedImagePath) {
      showToast('Please select a model or upload an image', 'error');
      return;
    }

    try {
      const body: Record<string, unknown> = {
        name: batchName || `Batch ${new Date().toLocaleString()}`,
        tiktokUrls: parsedUrls,
        maxSeconds,
      };

      if (selectedModelForGenerate) {
        if (imageSelectionMode === 'all') {
          body.modelId = selectedModelForGenerate;
        } else {
          body.imageIds = selectedImageIds;
        }
      } else {
        body.imageUrl = uploadedImagePath;
      }

      const res = await fetch('/api/batch-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok) {
        showToast(`Started batch with ${data.count} jobs!`, 'success');
        setBulkUrls('');
        setParsedUrls([]);
        setBatchName('');
        setPage('batches');
        loadBatches();
      } else {
        showToast(data.error || 'Failed to start batch', 'error');
      }
    } catch (e) {
      showToast('Error: ' + (e as Error).message, 'error');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setUploadedImageName(data.filename);
        setUploadedImagePath(data.url || data.path); // Use GCS URL
        showToast('Image uploaded', 'success');
      }
    } catch (err) {
      showToast('Upload failed', 'error');
    }
  };

  const handleGenerate = async () => {
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiktokUrl: tiktokUrl.trim(),
          imageUrl: uploadedImagePath, // Now sending the full GCS URL
          maxSeconds: maxSeconds,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTiktokUrl('');
        loadJobs();
        showToast('Generation started!', 'success');
      } else {
        showToast(data.error || 'Failed', 'error');
      }
    } catch (err) {
      showToast('Error: ' + (err as Error).message, 'error');
    }
  };

  const openCreatePostModal = async (withVideoUrl?: string) => {
    try {
      const res = await fetch('/api/videos');
      const data = await res.json();
      setVideos(data.videos || []);
    } catch (e) {
      console.error(e);
    }
    setPostForm((prev) => ({
      ...prev,
      caption: '',
      videoUrl: withVideoUrl ?? preselectedVideoPath ?? '',
      accountId: prev.accountId || '',
      date: prev.date || '',
      time: prev.time || '',
    }));
    setUploadedVideoPath(null);
    setPreselectedVideoPath(null);
    setPublishMode('now');
    setCreatePostModal(true);
  };

  const submitPost = async () => {
    const videoUrl = uploadedVideoPath || postForm.videoUrl;
    if (!videoUrl) {
      showToast('Please select or upload a video', 'error');
      return;
    }
    if (!postForm.accountId) {
      showToast('Please select a TikTok account', 'error');
      return;
    }
    try {
      const body: Record<string, unknown> = {
        videoUrl, // Now using GCS URL
        caption: postForm.caption,
        accountId: postForm.accountId,
        publishNow: publishMode === 'now',
      };
      if (publishMode === 'schedule' && postForm.date && postForm.time) {
        body.scheduledFor = `${postForm.date}T${postForm.time}:00`;
        body.timezone = 'Asia/Kolkata';
        body.publishNow = false;
      }
      const res = await fetch('/api/tiktok/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCreatePostModal(false);
        showToast(data.message || 'Posted!', 'success');
        loadPosts();
      } else {
        showToast(data.error || 'Failed to post', 'error');
      }
    } catch (err) {
      showToast('Error: ' + (err as Error).message, 'error');
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('video', file);
    try {
      const res = await fetch('/api/upload-video', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setUploadedVideoPath(data.url || data.path); // Use GCS URL
        showToast('Video uploaded', 'success');
      }
    } catch (err) {
      showToast('Upload failed', 'error');
    }
  };

  const profileAccounts = accounts.filter((a) => {
    const pId = typeof a.profileId === 'object' ? (a.profileId as { _id: string })?._id : a.profileId;
    return pId === currentProfile?._id;
  });

  const tiktokAccounts = accounts.filter((a) => a.platform === 'tiktok');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied!', 'success');
  };

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--text)]">
      {/* Sidebar */}
      <nav className="w-[220px] shrink-0 border-r border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="mb-6 text-xl font-bold text-[var(--purple)]">AI UGC</div>
        <button
          onClick={() => setPage('generate')}
          className={`mb-2 flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-sm transition-colors ${
            page === 'generate' ? 'bg-[var(--background)] font-medium text-[var(--text)]' : 'text-[var(--text-muted)] hover:bg-[var(--background)] hover:text-[var(--text)]'
          }`}
        >
          <span className="text-lg">🎬</span> Generate
        </button>
        <button
          onClick={() => setPage('models')}
          className={`mb-2 flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-sm transition-colors ${
            page === 'models' ? 'bg-[var(--background)] font-medium text-[var(--text)]' : 'text-[var(--text-muted)] hover:bg-[var(--background)] hover:text-[var(--text)]'
          }`}
        >
          <span className="text-lg">👤</span> Models
        </button>
        <button
          onClick={() => setPage('batches')}
          className={`mb-2 flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-sm transition-colors ${
            page === 'batches' ? 'bg-[var(--background)] font-medium text-[var(--text)]' : 'text-[var(--text-muted)] hover:bg-[var(--background)] hover:text-[var(--text)]'
          }`}
        >
          <span className="text-lg">📦</span> Batches
        </button>
        <button
          onClick={() => setPage('posts')}
          className={`mb-2 flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-sm transition-colors ${
            page === 'posts' ? 'bg-[var(--background)] font-medium text-[var(--text)]' : 'text-[var(--text-muted)] hover:bg-[var(--background)] hover:text-[var(--text)]'
          }`}
        >
          <span className="text-lg">📋</span> Posts
        </button>
        <button
          onClick={() => setPage('connections')}
          className={`flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-sm transition-colors ${
            page === 'connections' ? 'bg-[var(--background)] font-medium text-[var(--text)]' : 'text-[var(--text-muted)] hover:bg-[var(--background)] hover:text-[var(--text)]'
          }`}
        >
          <span className="text-lg">🔗</span> Connections
        </button>
      </nav>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-8">
        {page === 'generate' && (
          <div>
            <h1 className="mb-1 text-2xl font-bold">Generate Videos</h1>
            <p className="mb-6 text-[var(--text-muted)]">Create AI-powered UGC videos from TikTok content</p>

            {/* Mode Toggle */}
            <div className="mb-6 flex gap-2">
              <button
                onClick={() => setBulkMode(false)}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${!bulkMode ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)] hover:bg-[var(--background)]'}`}
              >
                Single Video
              </button>
              <button
                onClick={() => setBulkMode(true)}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${bulkMode ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)] hover:bg-[var(--background)]'}`}
              >
                Bulk Generate
              </button>
            </div>

            {!bulkMode ? (
              /* Single Video Mode */
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
                  <h3 className="mb-4 text-lg font-semibold">Create Video</h3>
                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-[var(--text-muted)]">TikTok URL</label>
                    <input
                      type="text"
                      value={tiktokUrl}
                      onChange={(e) => setTiktokUrl(e.target.value)}
                      placeholder="https://www.tiktok.com/@user/video/..."
                      className="w-full rounded-lg border border-[var(--border)] px-4 py-3 text-sm focus:border-[var(--primary)] focus:outline-none"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-[var(--text-muted)]">Model Image</label>
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] bg-transparent py-8 transition-colors hover:border-[var(--primary)] hover:bg-[var(--background)]">
                      {uploadedImagePath ? (
                        <img src={uploadedImagePath} alt="Uploaded" className="max-h-36 max-w-full rounded-lg object-contain" />
                      ) : (
                        <span className="text-3xl">+</span>
                      )}
                      <span className="mt-2 text-sm text-[var(--text-muted)]">Click or drag image here</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-[var(--text-muted)]">
                      Max Duration: <span>{maxSeconds}</span>s
                    </label>
                    <input
                      type="range"
                      min={5}
                      max={30}
                      value={maxSeconds}
                      onChange={(e) => setMaxSeconds(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={generateDisabled}
                    className="w-full rounded-lg bg-[var(--primary)] px-4 py-3 font-medium text-white transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Generate Video
                  </button>
                </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <h3 className="mb-4 text-lg font-semibold">Generation Queue</h3>
                {jobs.length === 0 ? (
                  <p className="text-[var(--text-muted)]">No videos generated yet</p>
                ) : (
                  <div className="space-y-2">
                    {jobs.slice(0, 10).map((job) => (
                      <div key={job.id} className="rounded-lg bg-[var(--background)] p-3">
                        <div className="mb-1 flex items-center justify-between text-xs text-[var(--text-muted)]">
                          <span className="truncate">{job.tiktokUrl?.slice(0, 40)}...</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              job.status === 'completed' ? 'bg-[var(--success-bg)] text-[var(--success)]' :
                              job.status === 'failed' ? 'bg-[var(--error-bg)] text-[var(--error)]' :
                              'bg-[var(--warning-bg)] text-[var(--warning)]'
                            }`}
                          >
                            {job.status}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">{job.step}</div>
                        {job.status === 'completed' && job.outputUrl && (
                          <div className="mt-2 flex gap-2">
                            <a
                              href={job.outputUrl}
                              download
                              className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--background)]"
                            >
                              Download
                            </a>
                            <button
                              onClick={() => {
                                setPreselectedVideoPath(job.outputUrl!);
                                setPage('posts');
                                setTimeout(() => openCreatePostModal(job.outputUrl!), 100);
                              }}
                              className="rounded border border-[var(--accent-border)] bg-[var(--accent)] px-3 py-1.5 text-xs font-medium hover:bg-[#fde68a]"
                            >
                              Post to TikTok
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            ) : (
              /* Bulk Mode */
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <div className="space-y-6">
                  {/* Bulk URL Input */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
                    <h3 className="mb-4 text-lg font-semibold">TikTok URLs</h3>
                    <div className="mb-4">
                      <label className="mb-2 block text-sm font-medium text-[var(--text-muted)]">
                        Paste TikTok URLs (one per line or comma-separated)
                      </label>
                      <textarea
                        value={bulkUrls}
                        onChange={(e) => setBulkUrls(e.target.value)}
                        onBlur={handleParseBulkUrls}
                        placeholder="https://www.tiktok.com/@user/video/123...&#10;https://vm.tiktok.com/abc..."
                        className="min-h-[150px] w-full resize-y rounded-lg border border-[var(--border)] px-4 py-3 text-sm focus:border-[var(--primary)] focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="cursor-pointer rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--background)]">
                        Upload CSV
                        <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
                      </label>
                      <span className="text-sm text-[var(--text-muted)]">
                        {parsedUrls.length > 0 ? `${parsedUrls.length} URLs ready` : 'No URLs parsed'}
                      </span>
                    </div>
                  </div>

                  {/* Model Selection */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
                    <h3 className="mb-4 text-lg font-semibold">Model Selection</h3>
                    <div className="mb-4">
                      <label className="mb-2 block text-sm font-medium text-[var(--text-muted)]">Select Model</label>
                      <select
                        value={selectedModelForGenerate}
                        onChange={(e) => {
                          setSelectedModelForGenerate(e.target.value);
                          if (e.target.value) {
                            loadModelImages(e.target.value);
                          } else {
                            setModelImages([]);
                          }
                        }}
                        className="w-full rounded-lg border border-[var(--border)] px-4 py-3 text-sm"
                      >
                        <option value="">Select a model...</option>
                        {models.map((m) => (
                          <option key={m.id} value={m.id}>{m.name} ({m.imageCount || 0} images)</option>
                        ))}
                      </select>
                    </div>

                    {selectedModelForGenerate && (
                      <>
                        <div className="mb-4 flex gap-2">
                          <button
                            onClick={() => setImageSelectionMode('all')}
                            className={`rounded-lg px-3 py-2 text-sm ${imageSelectionMode === 'all' ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)]'}`}
                          >
                            Use All (Random)
                          </button>
                          <button
                            onClick={() => setImageSelectionMode('specific')}
                            className={`rounded-lg px-3 py-2 text-sm ${imageSelectionMode === 'specific' ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)]'}`}
                          >
                            Select Specific
                          </button>
                        </div>

                        {imageSelectionMode === 'specific' && modelImages.length > 0 && (
                          <div className="grid grid-cols-4 gap-2">
                            {modelImages.map((img) => (
                              <label key={img.id} className="relative cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedImageIds.includes(img.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedImageIds((prev) => [...prev, img.id]);
                                    } else {
                                      setSelectedImageIds((prev) => prev.filter((id) => id !== img.id));
                                    }
                                  }}
                                  className="absolute left-2 top-2 z-10"
                                />
                                <img
                                  src={img.signedUrl || img.gcsUrl}
                                  alt=""
                                  className={`h-20 w-full rounded-lg object-cover ${selectedImageIds.includes(img.id) ? 'ring-2 ring-[var(--primary)]' : ''}`}
                                />
                              </label>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {!selectedModelForGenerate && (
                      <div className="text-center text-sm text-[var(--text-muted)]">
                        <p className="mb-2">Or upload a single image:</p>
                        <label className="cursor-pointer rounded-lg border-2 border-dashed border-[var(--border)] p-4 hover:bg-[var(--background)] inline-block">
                          {uploadedImagePath ? (
                            <img src={uploadedImagePath} alt="" className="h-20 w-20 rounded-lg object-cover" />
                          ) : (
                            <span>+ Upload</span>
                          )}
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Generate Settings & Preview */}
                <div className="space-y-6">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
                    <h3 className="mb-4 text-lg font-semibold">Generation Settings</h3>
                    <div className="mb-4">
                      <label className="mb-2 block text-sm font-medium text-[var(--text-muted)]">Batch Name (optional)</label>
                      <input
                        type="text"
                        value={batchName}
                        onChange={(e) => setBatchName(e.target.value)}
                        placeholder="My Batch"
                        className="w-full rounded-lg border border-[var(--border)] px-4 py-3 text-sm"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="mb-2 block text-sm font-medium text-[var(--text-muted)]">
                        Max Duration: <span>{maxSeconds}</span>s
                      </label>
                      <input
                        type="range"
                        min={5}
                        max={30}
                        value={maxSeconds}
                        onChange={(e) => setMaxSeconds(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div className="mb-4 rounded-lg bg-[var(--background)] p-4">
                      <h4 className="mb-2 font-medium">Summary</h4>
                      <ul className="space-y-1 text-sm text-[var(--text-muted)]">
                        <li>Videos: {parsedUrls.length}</li>
                        <li>Model: {selectedModelForGenerate ? models.find((m) => m.id === selectedModelForGenerate)?.name : 'Single image'}</li>
                        <li>Images: {imageSelectionMode === 'all' ? modelImages.length || 1 : selectedImageIds.length || 1}</li>
                        <li>Duration: {maxSeconds}s max</li>
                      </ul>
                    </div>

                    <button
                      onClick={handleBulkGenerate}
                      disabled={parsedUrls.length === 0 || (!selectedModelForGenerate && !uploadedImagePath)}
                      className="w-full rounded-lg bg-[var(--primary)] px-4 py-3 font-medium text-white transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Generate {parsedUrls.length} Videos
                    </button>
                  </div>

                  {/* Recent Batches */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Recent Batches</h3>
                      <button onClick={() => setPage('batches')} className="text-sm text-[var(--primary)]">View all</button>
                    </div>
                    {batches.slice(0, 3).map((batch) => (
                      <div key={batch.id} className="mb-2 rounded-lg bg-[var(--background)] p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{batch.name}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${
                            batch.status === 'completed' ? 'bg-[var(--success-bg)] text-[var(--success)]' :
                            batch.status === 'failed' ? 'bg-[var(--error-bg)] text-[var(--error)]' :
                            'bg-[var(--warning-bg)] text-[var(--warning)]'
                          }`}>
                            {batch.status}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-[var(--text-muted)]">
                          {batch.completedJobs}/{batch.totalJobs} completed
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--border)]">
                          <div
                            className="h-full rounded-full bg-[var(--primary)]"
                            style={{ width: `${batch.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Models Tab */}
        {page === 'models' && (
          <div>
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">Models</h1>
                <p className="text-[var(--text-muted)]">Manage personas with multiple reference images</p>
              </div>
              <button
                onClick={() => setNewModelModal(true)}
                className="rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white hover:bg-[var(--primary-hover)]"
              >
                + New Model
              </button>
            </div>

            {models.length === 0 ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
                <h3 className="mb-2 font-semibold">No models yet</h3>
                <p className="mb-4 text-[var(--text-muted)]">Create a model to upload reference images</p>
                <button
                  onClick={() => setNewModelModal(true)}
                  className="rounded-lg bg-[var(--primary)] px-4 py-2 text-white"
                >
                  + Create Model
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {models.map((model) => (
                  <div
                    key={model.id}
                    onClick={() => {
                      setSelectedModel(model);
                      loadModelImages(model.id);
                      setModelDetailModal(true);
                    }}
                    className="cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-shadow hover:shadow-lg"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      {model.avatarUrl ? (
                        <img src={model.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--background)] text-2xl">👤</div>
                      )}
                      <div>
                        <div className="font-semibold">{model.name}</div>
                        <div className="text-sm text-[var(--text-muted)]">{model.imageCount || 0} images</div>
                      </div>
                    </div>
                    {model.description && (
                      <p className="text-sm text-[var(--text-muted)]">{model.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Batches Tab */}
        {page === 'batches' && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Batches</h1>
              <p className="text-[var(--text-muted)]">Track bulk video generation progress</p>
            </div>

            {batches.length === 0 ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
                <h3 className="mb-2 font-semibold">No batches yet</h3>
                <p className="mb-4 text-[var(--text-muted)]">Start a bulk generation to create a batch</p>
                <button
                  onClick={() => { setBulkMode(true); setPage('generate'); }}
                  className="rounded-lg bg-[var(--primary)] px-4 py-2 text-white"
                >
                  Start Bulk Generate
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {batches.map((batch) => (
                  <div
                    key={batch.id}
                    onClick={() => {
                      loadBatchDetail(batch.id);
                      setBatchDetailModal(true);
                    }}
                    className="cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-shadow hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {batch.model?.avatarUrl && (
                          <img src={batch.model.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                        )}
                        <div>
                          <div className="font-semibold">{batch.name}</div>
                          <div className="text-sm text-[var(--text-muted)]">
                            {batch.model?.name || 'Single image'} · {batch.totalJobs} videos
                          </div>
                        </div>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-sm font-medium ${
                        batch.status === 'completed' ? 'bg-[var(--success-bg)] text-[var(--success)]' :
                        batch.status === 'failed' ? 'bg-[var(--error-bg)] text-[var(--error)]' :
                        batch.status === 'partial' ? 'bg-[var(--warning-bg)] text-[var(--warning)]' :
                        'bg-[var(--background)] text-[var(--text-muted)]'
                      }`}>
                        {batch.status}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-sm text-[var(--text-muted)]">
                        <span>{batch.completedJobs} completed, {batch.failedJobs} failed</span>
                        <span>{batch.progress || 0}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[var(--background)]">
                        <div
                          className="h-full rounded-full bg-[var(--primary)] transition-all"
                          style={{ width: `${batch.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {page === 'posts' && (
          <div>
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">Posts</h1>
                <p className="text-[var(--text-muted)]">Manage scheduled and published content</p>
              </div>
              <button
                onClick={() => openCreatePostModal()}
                className="rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white hover:bg-[var(--primary-hover)]"
              >
                + Create Post
              </button>
            </div>
            <div className="mb-4 flex gap-2">
              {['all', 'published', 'scheduled', 'failed'].map((f) => (
                <button
                  key={f}
                  onClick={() => setPostsFilter(f)}
                  className={`rounded-lg border px-4 py-2 text-sm capitalize ${
                    postsFilter === f
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                      : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--background)]'
                  }`}
                >
                  {f === 'all' ? 'All posts' : f}
                </button>
              ))}
            </div>
            {posts.length === 0 ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[var(--text-muted)]">
                <h3 className="mb-2 font-semibold text-[var(--text)]">No posts yet</h3>
                <p className="mb-4">Create your first post to get started</p>
                <button onClick={() => openCreatePostModal()} className="rounded-lg bg-[var(--primary)] px-4 py-2 text-white hover:bg-[var(--primary-hover)]">
                  + Create Post
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => {
                  const platform = post.platforms?.[0];
                  const status = platform?.status || (post as { status?: string }).status || 'draft';
                  const thumbnail = post.mediaItems?.[0]?.url || post.mediaItems?.[0]?.thumbnailUrl;
                  return (
                    <div key={post._id} className="flex gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                      {thumbnail ? (
                        <img src={thumbnail} alt="" className="h-44 w-36 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="h-44 w-36 shrink-0 rounded-lg bg-[var(--background)]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <div className="font-medium">{post.content || '(No caption)'}</div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                              status === 'published' ? 'bg-[var(--success-bg)] text-[var(--success)]' :
                              status === 'failed' ? 'bg-[var(--error-bg)] text-[var(--error)]' :
                              status === 'scheduled' ? 'bg-[var(--warning-bg)] text-[var(--warning)]' :
                              'bg-[var(--background)] text-[var(--text-muted)]'
                            }`}
                          >
                            {status}
                          </span>
                        </div>
                        <div className="mb-2 text-xs text-[var(--text-muted)]">
                          {post.scheduledFor && <span>scheduled: {new Date(post.scheduledFor).toLocaleString()}</span>}
                          {post.createdAt && <span className="ml-2">created: {new Date(post.createdAt).toLocaleDateString()}</span>}
                        </div>
                        <div className="mb-2 flex flex-wrap gap-1 text-xs">
                          {post.platforms?.map((p) => (
                            <span
                              key={p.platform}
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                                p.status === 'published' ? 'bg-[var(--success-bg)] text-[var(--success)]' :
                                p.status === 'failed' ? 'bg-[var(--error-bg)] text-[var(--error)]' :
                                'bg-[var(--warning-bg)] text-[var(--warning)]'
                              }`}
                            >
                              {p.platform}
                              {p.platformPostUrl && (
                                <a href={p.platformPostUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">↗</a>
                              )}
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          {status === 'failed' && (
                            <button
                              onClick={async () => {
                                await fetch(`/api/late/posts/${post._id}/retry`, { method: 'POST' });
                                showToast('Retrying...', 'success');
                                loadPosts();
                              }}
                              className="rounded border border-[var(--success)] bg-[var(--success-bg)] px-2 py-1 text-xs text-[var(--success)]"
                            >
                              Retry
                            </button>
                          )}
                          {status !== 'published' && (
                            <button
                              onClick={async () => {
                                if (!confirm('Delete this post?')) return;
                                await fetch(`/api/late/posts/${post._id}`, { method: 'DELETE' });
                                showToast('Post deleted', 'success');
                                loadPosts();
                              }}
                              className="rounded border border-[var(--error)] bg-[var(--error-bg)] px-2 py-1 text-xs text-[var(--error)]"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {page === 'connections' && (
          <div>
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">Connections</h1>
                <p className="text-[var(--text-muted)]">Manage profiles and platform integrations</p>
              </div>
              <button
                onClick={() => setNewProfileModal(true)}
                className="rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white hover:bg-[var(--primary-hover)]"
              >
                + New Profile
              </button>
            </div>
            <div className="mb-4 flex items-center gap-2">
              <h3 className="font-semibold">Select Profile</h3>
              <button
                onClick={() => {
                  if (currentProfile) {
                    setEditProfileForm({
                      name: currentProfile.name,
                      description: currentProfile.description || '',
                      color: currentProfile.color || '#fcd34d',
                    });
                    setEditProfileModal(true);
                  }
                }}
                className="rounded border border-[var(--border)] px-2 py-1 text-sm hover:bg-[var(--background)]"
              >
                Edit
              </button>
              <button
                onClick={async () => {
                  if (!currentProfile) return;
                  const profileAccounts = accounts.filter((a) => {
                    const pId = typeof a.profileId === 'object' ? (a.profileId as { _id: string })?._id : a.profileId;
                    return pId === currentProfile._id;
                  });
                  if (profileAccounts.length > 0) {
                    showToast('Disconnect all accounts before deleting profile', 'error');
                    return;
                  }
                  if (!confirm(`Delete "${currentProfile.name}"?`)) return;
                  await fetch(`/api/late/profiles/${currentProfile._id}`, { method: 'DELETE' });
                  showToast('Profile deleted', 'success');
                  setCurrentProfile(null);
                  loadConnections();
                }}
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
                  onClick={() => currentProfile && copyToClipboard(currentProfile._id)}
                  className="rounded border border-[var(--border)] px-2 py-0.5 hover:bg-[var(--background)]"
                >
                  copy
                </button>
              </div>
            </div>
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
                        <div className="mb-2 rounded-lg bg-[var(--background)] p-2">
                          <div className="font-medium">@{account.username || account.displayName}</div>
                          {account.createdAt && (
                            <div className="text-xs text-[var(--text-muted)]">{new Date(account.createdAt).toLocaleDateString()}</div>
                          )}
                          <div className="mt-1 flex items-center gap-1 text-xs text-[var(--text-muted)]">
                            id: {account._id.slice(0, 8)}...
                            <button onClick={() => copyToClipboard(account._id)} className="rounded border px-1 hover:bg-white">copy</button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={async () => {
                              if (!confirm('Disconnect this account?')) return;
                              await fetch(`/api/late/accounts/${account._id}`, { method: 'DELETE' });
                              showToast('Disconnected', 'success');
                              loadConnections();
                            }}
                            className="w-full rounded-lg border border-[var(--border)] py-2 text-sm hover:bg-[var(--background)]"
                          >
                            Disconnect
                          </button>
                          <button
                            onClick={async () => {
                              const res = await fetch(`/api/late/invite/${platform}?profileId=${currentProfile!._id}`);
                              const data = await res.json();
                              if (data.inviteUrl) {
                                copyToClipboard(data.inviteUrl);
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
                            const res = await fetch(`/api/late/connect/${platform}?profileId=${currentProfile!._id}`);
                            const data = await res.json();
                            if (data.connectUrl) {
                              window.open(data.connectUrl, '_blank');
                              showToast('Complete authorization in the new window, then refresh', 'success');
                            }
                          }}
                          className="w-full rounded-lg border border-[var(--accent-border)] bg-[var(--accent)] py-2 text-sm hover:bg-[#fde68a]"
                        >
                          + Connect
                        </button>
                        <button
                          onClick={async () => {
                            const res = await fetch(`/api/late/invite/${platform}?profileId=${currentProfile!._id}`);
                            const data = await res.json();
                            if (data.inviteUrl) {
                              copyToClipboard(data.inviteUrl);
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
          </div>
        )}
      </main>

      {/* Create Post Modal */}
      {createPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setCreatePostModal(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-[var(--surface)] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
              <h3 className="text-lg font-semibold">Create Post</h3>
              <button onClick={() => setCreatePostModal(false)} className="text-2xl text-[var(--text-muted)]">&times;</button>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-muted)]">Select Video</label>
                <select
                  value={postForm.videoUrl}
                  onChange={(e) => setPostForm((p) => ({ ...p, videoUrl: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--border)] px-4 py-2"
                >
                  <option value="">Select a generated video...</option>
                  {videos.map((v) => (
                    <option key={v.url || v.path} value={v.url || v.path}>{v.name}</option>
                  ))}
                </select>
                <p className="mt-2 text-center text-sm text-[var(--text-muted)]">or</p>
                <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] py-4 hover:bg-[var(--background)]">
                  <span className="text-2xl">🎬</span>
                  <span className="text-sm text-[var(--text-muted)]">Upload video from computer</span>
                  <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                </label>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-muted)]">Caption</label>
                <textarea
                  value={postForm.caption}
                  onChange={(e) => setPostForm((p) => ({ ...p, caption: e.target.value }))}
                  placeholder="Write your caption... #fyp #viral"
                  className="min-h-[100px] w-full resize-y rounded-lg border border-[var(--border)] px-4 py-2"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-muted)]">TikTok Account</label>
                <select
                  value={postForm.accountId}
                  onChange={(e) => setPostForm((p) => ({ ...p, accountId: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--border)] px-4 py-2"
                >
                  <option value="">No TikTok accounts connected</option>
                  {tiktokAccounts.map((a) => (
                    <option key={a._id} value={a._id}>@{a.username || a.displayName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-muted)]">When to Post</label>
                <div className="mb-2 flex gap-2">
                  <button
                    onClick={() => setPublishMode('now')}
                    className={`rounded-lg px-4 py-2 ${publishMode === 'now' ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)]'}`}
                  >
                    Publish Now
                  </button>
                  <button
                    onClick={() => setPublishMode('schedule')}
                    className={`rounded-lg px-4 py-2 ${publishMode === 'schedule' ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)]'}`}
                  >
                    Schedule
                  </button>
                </div>
                {publishMode === 'schedule' && (
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
                )}
              </div>
              <button
                onClick={submitPost}
                className="w-full rounded-lg bg-[var(--primary)] py-3 font-medium text-white hover:bg-[var(--primary-hover)]"
              >
                Upload to TikTok
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Profile Modal */}
      {newProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setNewProfileModal(false)}>
          <div className="w-full max-w-md overflow-auto rounded-2xl bg-[var(--surface)] p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Create New Profile</h3>
              <button onClick={() => setNewProfileModal(false)} className="text-2xl text-[var(--text-muted)]">&times;</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-[var(--text-muted)]">Profile Name</label>
                <input
                  type="text"
                  value={newProfileForm.name}
                  onChange={(e) => setNewProfileForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., TikTok Account 3"
                  className="w-full rounded-lg border border-[var(--border)] px-4 py-2"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-muted)]">Description (optional)</label>
                <input
                  type="text"
                  value={newProfileForm.description}
                  onChange={(e) => setNewProfileForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="e.g., Main business account"
                  className="w-full rounded-lg border border-[var(--border)] px-4 py-2"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-muted)]">Color</label>
                <input
                  type="color"
                  value={newProfileForm.color}
                  onChange={(e) => setNewProfileForm((p) => ({ ...p, color: e.target.value }))}
                  className="h-9 w-14 cursor-pointer rounded-lg border border-[var(--border)]"
                />
              </div>
              <button
                onClick={async () => {
                  if (!newProfileForm.name.trim()) {
                    showToast('Profile name is required', 'error');
                    return;
                  }
                  const res = await fetch('/api/late/profiles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newProfileForm),
                  });
                  const data = await res.json();
                  if (res.ok) {
                    setNewProfileModal(false);
                    setNewProfileForm({ name: '', description: '', color: '#fcd34d' });
                    showToast('Profile created!', 'success');
                    loadConnections();
                  } else {
                    showToast(data.error || 'Failed', 'error');
                  }
                }}
                className="w-full rounded-lg bg-[var(--primary)] py-3 font-medium text-white hover:bg-[var(--primary-hover)]"
              >
                Create Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editProfileModal && currentProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditProfileModal(false)}>
          <div className="w-full max-w-md overflow-auto rounded-2xl bg-[var(--surface)] p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit Profile</h3>
              <button onClick={() => setEditProfileModal(false)} className="text-2xl text-[var(--text-muted)]">&times;</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-[var(--text-muted)]">Profile Name</label>
                <input
                  type="text"
                  value={editProfileForm.name}
                  onChange={(e) => setEditProfileForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--border)] px-4 py-2"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-muted)]">Description (optional)</label>
                <input
                  type="text"
                  value={editProfileForm.description}
                  onChange={(e) => setEditProfileForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--border)] px-4 py-2"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-muted)]">Color</label>
                <input
                  type="color"
                  value={editProfileForm.color}
                  onChange={(e) => setEditProfileForm((p) => ({ ...p, color: e.target.value }))}
                  className="h-9 w-14 cursor-pointer rounded-lg border border-[var(--border)]"
                />
              </div>
              <button
                onClick={async () => {
                  if (!editProfileForm.name.trim()) {
                    showToast('Profile name is required', 'error');
                    return;
                  }
                  const res = await fetch(`/api/late/profiles/${currentProfile._id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(editProfileForm),
                  });
                  const data = await res.json();
                  if (res.ok) {
                    setEditProfileModal(false);
                    showToast('Profile updated!', 'success');
                    loadConnections();
                    const updated = (data.profile || data) as Profile;
                    if (updated._id === currentProfile._id) setCurrentProfile(updated);
                  } else {
                    showToast(data.error || 'Failed', 'error');
                  }
                }}
                className="w-full rounded-lg bg-[var(--primary)] py-3 font-medium text-white hover:bg-[var(--primary-hover)]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Model Modal */}
      {newModelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setNewModelModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Create New Model</h3>
              <button onClick={() => setNewModelModal(false)} className="text-2xl text-[var(--text-muted)]">&times;</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-[var(--text-muted)]">Model Name</label>
                <input
                  type="text"
                  value={newModelForm.name}
                  onChange={(e) => setNewModelForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Sarah"
                  className="w-full rounded-lg border border-[var(--border)] px-4 py-2"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-muted)]">Description (optional)</label>
                <input
                  type="text"
                  value={newModelForm.description}
                  onChange={(e) => setNewModelForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="e.g., Main UGC persona"
                  className="w-full rounded-lg border border-[var(--border)] px-4 py-2"
                />
              </div>
              <button
                onClick={async () => {
                  if (!newModelForm.name.trim()) {
                    showToast('Model name is required', 'error');
                    return;
                  }
                  try {
                    const res = await fetch('/api/models', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(newModelForm),
                    });
                    if (res.ok) {
                      setNewModelModal(false);
                      setNewModelForm({ name: '', description: '' });
                      showToast('Model created!', 'success');
                      loadModels();
                    } else {
                      const data = await res.json();
                      showToast(data.error || 'Failed', 'error');
                    }
                  } catch (e) {
                    showToast('Error creating model', 'error');
                  }
                }}
                className="w-full rounded-lg bg-[var(--primary)] py-3 font-medium text-white hover:bg-[var(--primary-hover)]"
              >
                Create Model
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Model Detail Modal */}
      {modelDetailModal && selectedModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setModelDetailModal(false)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-[var(--surface)] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
              <div className="flex items-center gap-3">
                {selectedModel.avatarUrl ? (
                  <img src={selectedModel.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--background)] text-xl">👤</div>
                )}
                <div>
                  <h3 className="text-lg font-semibold">{selectedModel.name}</h3>
                  <p className="text-sm text-[var(--text-muted)]">{selectedModel.description || 'No description'}</p>
                </div>
              </div>
              <button onClick={() => setModelDetailModal(false)} className="text-2xl text-[var(--text-muted)]">&times;</button>
            </div>
            <div className="p-4">
              <h4 className="mb-3 font-semibold">Images ({modelImages.length})</h4>

              {/* Drag and Drop Upload Area */}
              <label
                htmlFor="model-image-upload"
                className={`mb-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-8 transition-all ${
                  modelImagesUploading
                    ? 'cursor-wait border-[var(--primary)] bg-[var(--primary)]/10 pointer-events-none'
                    : 'cursor-pointer border-[var(--border)] bg-[var(--background)] hover:border-[var(--primary)] hover:bg-[var(--surface)]'
                }`}
                onDragOver={(e) => {
                  if (modelImagesUploading) return;
                  e.preventDefault();
                  e.currentTarget.classList.add('border-[var(--primary)]', 'bg-[var(--surface)]');
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-[var(--primary)]', 'bg-[var(--surface)]');
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-[var(--primary)]', 'bg-[var(--surface)]');
                  const files = e.dataTransfer.files;
                  if (!files || files.length === 0) return;
                  setModelImagesUploading(true);
                  const formData = new FormData();
                  for (let i = 0; i < files.length; i++) {
                    formData.append('images', files[i]);
                  }
                  try {
                    const res = await fetch(`/api/models/${selectedModel.id}/images`, {
                      method: 'POST',
                      body: formData,
                    });
                    const data = await res.json();
                    if (res.ok) {
                      showToast(`Uploaded ${data.count} image${data.count > 1 ? 's' : ''}`, 'success');
                      await loadModelImages(selectedModel.id);
                      loadModels();
                    } else {
                      showToast(data.error || 'Upload failed', 'error');
                    }
                  } catch (err) {
                    console.error('Upload error:', err);
                    showToast('Upload failed: ' + (err instanceof Error ? err.message : 'Network error'), 'error');
                  } finally {
                    setModelImagesUploading(false);
                  }
                }}
              >
                {modelImagesUploading ? (
                  <>
                    <div className="mb-2 h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
                    <div className="text-sm font-medium">Uploading...</div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">Please wait</div>
                  </>
                ) : (
                  <>
                    <div className="mb-2 text-4xl">+</div>
                    <div className="text-sm font-medium">Drop images here or click to upload</div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">Supports JPG, PNG, WebP (multiple files)</div>
                  </>
                )}
                <input
                  id="model-image-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={modelImagesUploading}
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;
                    setModelImagesUploading(true);
                    const formData = new FormData();
                    for (const file of files) {
                      formData.append('images', file);
                    }
                    e.target.value = '';
                    try {
                      const res = await fetch(`/api/models/${selectedModel.id}/images`, {
                        method: 'POST',
                        body: formData,
                      });
                      const data = await res.json();
                      if (res.ok) {
                        showToast(`Uploaded ${data.count} image${data.count > 1 ? 's' : ''}`, 'success');
                        await loadModelImages(selectedModel.id);
                        loadModels();
                      } else {
                        showToast(data.error || 'Upload failed', 'error');
                      }
                    } catch (err) {
                      console.error('Upload error:', err);
                      showToast('Upload failed: ' + (err instanceof Error ? err.message : 'Network error'), 'error');
                    } finally {
                      setModelImagesUploading(false);
                    }
                  }}
                />
              </label>

              {/* Images Grid - always show when we have images or are uploading (so preview appears) */}
              {(modelImages.length > 0 || modelImagesUploading) && (
                <div className="grid grid-cols-4 gap-3">
                  {modelImages.map((img) => (
                    <div key={img.id} className="group relative">
                      <img
                        src={img.signedUrl || img.gcsUrl}
                        alt=""
                        className={`h-24 w-full rounded-lg object-cover ${img.isPrimary ? 'ring-2 ring-[var(--primary)]' : ''}`}
                      />
                      {img.isPrimary && (
                        <span className="absolute left-1 top-1 rounded bg-[var(--primary)] px-1 text-xs text-white">Primary</span>
                      )}
                      <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {!img.isPrimary && (
                          <button
                            onClick={async () => {
                              await fetch(`/api/models/${selectedModel.id}/images/${img.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ isPrimary: true }),
                              });
                              loadModelImages(selectedModel.id);
                              loadModels();
                              showToast('Set as primary', 'success');
                            }}
                            className="rounded bg-[var(--primary)] px-1 text-xs text-white"
                          >
                            ★
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            if (!confirm('Delete this image?')) return;
                            await fetch(`/api/models/${selectedModel.id}/images/${img.id}`, { method: 'DELETE' });
                            loadModelImages(selectedModel.id);
                            loadModels();
                            showToast('Image deleted', 'success');
                          }}
                          className="rounded bg-[var(--error)] px-1 text-xs text-white"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                  {/* Uploading placeholder */}
                  {modelImagesUploading && (
                    <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-[var(--primary)] bg-[var(--primary)]/10">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
                    </div>
                  )}
                  {/* Add more images button in grid */}
                  <label
                    className={`flex h-24 items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                      modelImagesUploading
                        ? 'cursor-wait border-[var(--border)] bg-[var(--background)] opacity-60'
                        : 'cursor-pointer border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--background)]'
                    }`}
                  >
                    <span className="text-2xl text-[var(--text-muted)]">+</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={modelImagesUploading}
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length === 0) return;
                        setModelImagesUploading(true);
                        const formData = new FormData();
                        for (const file of files) {
                          formData.append('images', file);
                        }
                        e.target.value = '';
                        try {
                          const res = await fetch(`/api/models/${selectedModel.id}/images`, {
                            method: 'POST',
                            body: formData,
                          });
                          const data = await res.json();
                          if (res.ok) {
                            showToast(`Uploaded ${data.count} image${data.count > 1 ? 's' : ''}`, 'success');
                            await loadModelImages(selectedModel.id);
                            loadModels();
                          } else {
                            showToast(data.error || 'Upload failed', 'error');
                          }
                        } catch (err) {
                          showToast('Upload failed', 'error');
                        } finally {
                          setModelImagesUploading(false);
                        }
                      }}
                    />
                  </label>
                </div>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={async () => {
                    if (!confirm(`Delete model "${selectedModel.name}" and all its images?`)) return;
                    await fetch(`/api/models/${selectedModel.id}`, { method: 'DELETE' });
                    setModelDetailModal(false);
                    loadModels();
                    showToast('Model deleted', 'success');
                  }}
                  className="rounded-lg border border-[var(--error)] bg-[var(--error-bg)] px-4 py-2 text-sm text-[var(--error)]"
                >
                  Delete Model
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Detail Modal */}
      {batchDetailModal && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setBatchDetailModal(false)}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-[var(--surface)] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedBatch.name}</h3>
                <p className="text-sm text-[var(--text-muted)]">
                  {selectedBatch.model?.name || 'Single image'} · {selectedBatch.completedJobs}/{selectedBatch.totalJobs} completed
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${
                  selectedBatch.status === 'completed' ? 'bg-[var(--success-bg)] text-[var(--success)]' :
                  selectedBatch.status === 'failed' ? 'bg-[var(--error-bg)] text-[var(--error)]' :
                  selectedBatch.status === 'partial' ? 'bg-[var(--warning-bg)] text-[var(--warning)]' :
                  'bg-[var(--background)] text-[var(--text-muted)]'
                }`}>
                  {selectedBatch.status}
                </span>
                <button onClick={() => setBatchDetailModal(false)} className="text-2xl text-[var(--text-muted)]">&times;</button>
              </div>
            </div>
            <div className="p-4">
              {/* Progress bar */}
              <div className="mb-4">
                <div className="mb-1 flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{selectedBatch.progress || 0}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--background)]">
                  <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${selectedBatch.progress || 0}%` }} />
                </div>
              </div>

              {/* Jobs list */}
              <h4 className="mb-3 font-semibold">Videos</h4>
              {selectedBatch.jobs?.length === 0 ? (
                <p className="text-[var(--text-muted)]">No videos in this batch</p>
              ) : (
                <div className="space-y-2">
                  {selectedBatch.jobs?.map((job) => (
                    <div key={job.id} className="flex items-center gap-4 rounded-lg bg-[var(--background)] p-3">
                      {job.outputUrl ? (
                        <video src={job.outputUrl} className="h-16 w-28 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-16 w-28 items-center justify-center rounded-lg bg-[var(--surface)] text-2xl">🎬</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{job.tiktokUrl}</div>
                        <div className="text-xs text-[var(--text-muted)]">{job.step}</div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        job.status === 'completed' ? 'bg-[var(--success-bg)] text-[var(--success)]' :
                        job.status === 'failed' ? 'bg-[var(--error-bg)] text-[var(--error)]' :
                        'bg-[var(--warning-bg)] text-[var(--warning)]'
                      }`}>
                        {job.status}
                      </span>
                      {job.status === 'completed' && job.outputUrl && (
                        <div className="flex gap-2">
                          <a
                            href={job.outputUrl}
                            download
                            className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--surface)]"
                          >
                            Download
                          </a>
                          <button
                            onClick={() => {
                              setBatchDetailModal(false);
                              setPreselectedVideoPath(job.outputUrl!);
                              setPage('posts');
                              setTimeout(() => openCreatePostModal(job.outputUrl!), 100);
                            }}
                            className="rounded border border-[var(--accent-border)] bg-[var(--accent)] px-2 py-1 text-xs"
                          >
                            Post
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => {
                    loadBatchDetail(selectedBatch.id);
                  }}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
                >
                  Refresh
                </button>
                <button
                  onClick={async () => {
                    if (!confirm('Delete this batch? Completed videos will be preserved.')) return;
                    await fetch(`/api/batches/${selectedBatch.id}`, { method: 'DELETE' });
                    setBatchDetailModal(false);
                    loadBatches();
                    showToast('Batch deleted', 'success');
                  }}
                  className="rounded-lg border border-[var(--error)] bg-[var(--error-bg)] px-4 py-2 text-sm text-[var(--error)]"
                >
                  Delete Batch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-8 right-8 z-[2000] rounded-lg px-6 py-3 shadow-lg transition-all ${
            toast.type === 'error' ? 'bg-[var(--error)]' : toast.type === 'success' ? 'bg-[var(--success)]' : 'bg-[var(--primary)]'
          } text-white`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
