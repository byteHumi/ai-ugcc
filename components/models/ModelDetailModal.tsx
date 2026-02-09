'use client';

import { useState } from 'react';
import type { Model, ModelImage } from '@/types';
import { useToast } from '@/hooks/useToast';
import Spinner from '@/components/ui/Spinner';

export default function ModelDetailModal({
  open,
  onClose,
  model,
  modelImages,
  loadModelImages,
  loadModels,
}: {
  open: boolean;
  onClose: () => void;
  model: Model | null;
  modelImages: ModelImage[];
  loadModelImages: (modelId: string) => Promise<void>;
  loadModels: () => Promise<void>;
}) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-[var(--surface)] shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <div className="flex items-center gap-3">
            {model.avatarUrl ? (
              <img src={model.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--background)] text-xl">👤</div>
            )}
            <div>
              <h3 className="text-lg font-semibold">{model.name}</h3>
              <p className="text-sm text-[var(--text-muted)]">{model.description || 'No description'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-2xl text-[var(--text-muted)]">&times;</button>
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
              await uploadImages(files);
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
                e.target.value = '';
                await uploadImages(files);
              }}
            />
          </label>

          {/* Images Grid */}
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
                        className="rounded bg-[var(--primary)] px-1 text-xs text-white disabled:opacity-50"
                      >
                        {isSettingPrimary === img.id ? '...' : '★'}
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
                      className="rounded bg-[var(--error)] px-1 text-xs text-white disabled:opacity-50"
                    >
                      {isDeletingImage === img.id ? '...' : '×'}
                    </button>
                  </div>
                </div>
              ))}
              {modelImagesUploading && (
                <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-[var(--primary)] bg-[var(--primary)]/10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
                </div>
              )}
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
                    e.target.value = '';
                    await uploadImages(files);
                  }}
                />
              </label>
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
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
              className="flex items-center gap-2 rounded-lg border border-[var(--error)] bg-[var(--error-bg)] px-4 py-2 text-sm text-[var(--error)] disabled:opacity-50"
            >
              {isDeletingModel ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Deleting...
                </>
              ) : (
                'Delete Model'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
