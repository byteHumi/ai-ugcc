'use client';

import type { Model } from '@/types';

export default function ModelGrid({
  models,
  isLoading,
  onModelClick,
  onNewModel,
}: {
  models: Model[];
  isLoading: boolean;
  onModelClick: (model: Model) => void;
  onNewModel: () => void;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[var(--background)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-[var(--background)]" />
                <div className="h-3 w-16 rounded bg-[var(--background)]" />
              </div>
            </div>
            <div className="h-3 w-full rounded bg-[var(--background)]" />
          </div>
        ))}
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
        <h3 className="mb-2 font-semibold">No models yet</h3>
        <p className="mb-4 text-[var(--text-muted)]">Create a model to upload reference images</p>
        <button
          onClick={onNewModel}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-white"
        >
          + Create Model
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {models.map((model) => (
        <div
          key={model.id}
          onClick={() => onModelClick(model)}
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
  );
}
