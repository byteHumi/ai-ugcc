'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { X, Upload, Star, Trash2, Loader2, ImageIcon, Link2 } from 'lucide-react';
import type { Model, ModelImage, ModelAccountMapping, Account } from '@/types';
import { useToast } from '@/hooks/useToast';
import { Skeleton } from '@/components/ui/skeleton';
import ModelAccountMapper from '@/components/models/ModelAccountMapper';

function SkeletonImage({
  src,
  alt,
  className,
  wrapperClassName,
  fallback,
  loading = 'lazy',
}: {
  src?: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  fallback?: ReactNode;
  loading?: 'eager' | 'lazy';
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!src || failed) return <>{fallback ?? null}</>;

  return (
    <div className={`relative overflow-hidden bg-[var(--background)] ${wrapperClassName || ''}`}>
      {!loaded && (
        <Skeleton className="absolute inset-0 rounded-none" />
      )}
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setFailed(true);
          setLoaded(true);
        }}
        className={`transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'} ${className || ''}`}
      />
    </div>
  );
}

function ImageSkeletonGrid() {
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function ModelDetailModal({
  open,
  onClose,
  model,
  modelImages,
  imagesLoading,
  loadModelImages,
  loadModels,
}: {
  open: boolean;
  onClose: () => void;
  model: Model | null;
  modelImages: ModelImage[];
  imagesLoading?: boolean;
  loadModelImages: (modelId: string) => Promise<void>;
  loadModels: () => Promise<void>;
}) {
  // Social account mappings
  const [accountMappings, setAccountMappings] = useState<ModelAccountMapping[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);

  useEffect(() => {
    if (!open || !model) return;
    setAccountsLoading(true);
    Promise.all([
      fetch(`/api/models/${model.id}/accounts`).then(r => r.ok ? r.json() : []),
      fetch('/api/late/accounts').then(r => r.ok ? r.json() : { accounts: [] }),
    ]).then(([mappings, accountsData]) => {
      setAccountMappings(Array.isArray(mappings) ? mappings : []);
      setAllAccounts(accountsData.accounts || []);
    }).catch(() => {}).finally(() => setAccountsLoading(false));
  }, [open, model]);

  const { showToast } = useToast();
  const [modelImagesUploading, setModelImagesUploading] = useState(false);
  const [isDeletingModel, setIsDeletingModel] = useState(false);
  const [isSettingPrimary, setIsSettingPrimary] = useState<string | null>(null);
  const [isDeletingImage, setIsDeletingImage] = useState<string | null>(null);

  if (!open || !model) return null;

  const uploadImages = async (files: FileList | File[]) => {
    setModelImagesUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files instanceof FileList ? files[i] : files[i]);
    }
    try {
      const res = await fetch(`/api/models/${model.id}/images`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Uploaded ${data.count} image${data.count > 1 ? 's' : ''}`, 'success');
        await loadModelImages(model.id);
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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl border border-[var(--border)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <SkeletonImage
              key={model.avatarUrl || 'model-avatar'}
              src={model.avatarUrl}
              alt={model.name}
              loading="eager"
              wrapperClassName="h-10 w-10 rounded-full ring-2 ring-[var(--border)]"
              className="h-full w-full rounded-full object-cover"
              fallback={(
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--background)] ring-2 ring-[var(--border)]">
                  <ImageIcon className="h-4 w-4 text-[var(--text-muted)]" />
                </div>
              )}
            />
            <div>
              <h3 className="text-sm font-bold tracking-tight">{model.name}</h3>
              {model.description && (
                <p className="text-[11px] text-[var(--text-muted)]">{model.description}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--accent)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Images Section */}
          <div className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                <ImageIcon className="h-3.5 w-3.5" />
                Reference Images ({modelImages.length})
              </h4>
            </div>

            {/* Upload Area */}
            <label
              htmlFor="model-image-upload"
              className={`mb-4 flex items-center justify-center gap-3 rounded-xl border-2 border-dashed py-5 transition-all ${
                modelImagesUploading
                  ? 'cursor-wait border-[var(--primary)] bg-[var(--primary)]/5 pointer-events-none'
                  : 'cursor-pointer border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--accent)]'
              }`}
              onDragOver={(e) => {
                if (modelImagesUploading) return;
                e.preventDefault();
                e.currentTarget.classList.add('border-[var(--primary)]', 'bg-[var(--accent)]');
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-[var(--primary)]', 'bg-[var(--accent)]');
              }}
              onDrop={async (e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-[var(--primary)]', 'bg-[var(--accent)]');
                const files = e.dataTransfer.files;
                if (!files || files.length === 0) return;
                await uploadImages(files);
              }}
            >
              {modelImagesUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
                  <span className="text-xs font-medium">Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 text-[var(--text-muted)]" />
                  <div>
                    <span className="text-xs font-medium">Drop images or click to upload</span>
                    <span className="ml-2 text-[10px] text-[var(--text-muted)]">JPG, PNG, WebP</span>
                  </div>
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
                  e.target.value = '';
                  await uploadImages(files);
                }}
              />
            </label>

            {/* Images Grid */}
            {imagesLoading ? (
              <ImageSkeletonGrid />
            ) : modelImages.length > 0 ? (
              <div className="grid grid-cols-4 gap-2.5">
                {modelImages.map((img) => (
                  <div
                    key={`${img.id}-${img.signedUrl || img.gcsUrl}`}
                    className="group relative overflow-hidden rounded-lg border border-[var(--border)]"
                  >
                    <SkeletonImage
                      src={img.signedUrl || img.gcsUrl}
                      alt={`${model.name} reference`}
                      wrapperClassName="aspect-[3/4] w-full"
                      className={`h-full w-full object-cover ${img.isPrimary ? 'ring-2 ring-[var(--primary)] ring-offset-1' : ''}`}
                      fallback={(
                        <div className="flex aspect-[3/4] w-full items-center justify-center bg-[var(--background)] text-[var(--text-muted)]/30">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}
                    />
                    {img.isPrimary && (
                      <span className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-[var(--primary)] px-1.5 py-0.5 text-[9px] font-bold text-white">
                        <Star className="h-2 w-2" />
                        Primary
                      </span>
                    )}
                    {/* Hover actions */}
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                      {!img.isPrimary && (
                        <button
                          onClick={async () => {
                            setIsSettingPrimary(img.id);
                            try {
                              await fetch(`/api/models/${model.id}/images/${img.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ isPrimary: true }),
                              });
                              loadModelImages(model.id);
                              loadModels();
                              showToast('Set as primary', 'success');
                            } finally {
                              setIsSettingPrimary(null);
                            }
                          }}
                          disabled={isSettingPrimary === img.id}
                          className="flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-[10px] font-medium text-gray-800 transition-colors hover:bg-white disabled:opacity-50"
                          title="Set as primary"
                        >
                          {isSettingPrimary === img.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Star className="h-2.5 w-2.5" />}
                          Primary
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          if (!confirm('Delete this image?')) return;
                          setIsDeletingImage(img.id);
                          try {
                            await fetch(`/api/models/${model.id}/images/${img.id}`, { method: 'DELETE' });
                            loadModelImages(model.id);
                            loadModels();
                            showToast('Image deleted', 'success');
                          } finally {
                            setIsDeletingImage(null);
                          }
                        }}
                        disabled={isDeletingImage === img.id}
                        className="flex items-center gap-1 rounded-md bg-red-500/90 px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                        title="Delete image"
                      >
                        {isDeletingImage === img.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Trash2 className="h-2.5 w-2.5" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Social Accounts Section */}
          <div className="border-t border-[var(--border)] p-5">
            <div className="mb-3">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                <Link2 className="h-3.5 w-3.5" />
                Social Accounts ({accountMappings.length})
              </h4>
              <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                Link social accounts for auto-posting from Master Pipeline
              </p>
            </div>
            <ModelAccountMapper
              modelId={model.id}
              mappings={accountMappings}
              allAccounts={allAccounts}
              loading={accountsLoading}
              onSave={async (accounts) => {
                const res = await fetch(`/api/models/${model.id}/accounts`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ accounts }),
                });
                if (res.ok) {
                  const data = await res.json();
                  setAccountMappings(Array.isArray(data) ? data : []);
                  showToast('Accounts updated', 'success');
                  loadModels();
                }
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-[var(--border)] px-5 py-3">
          <button
            onClick={async () => {
              if (!confirm(`Delete model "${model.name}" and all its images?`)) return;
              setIsDeletingModel(true);
              try {
                await fetch(`/api/models/${model.id}`, { method: 'DELETE' });
                onClose();
                loadModels();
                showToast('Model deleted', 'success');
              } finally {
                setIsDeletingModel(false);
              }
            }}
            disabled={isDeletingModel}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-950/30"
          >
            {isDeletingModel ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            Delete Model
          </button>
        </div>
      </div>
    </div>
  );
}
