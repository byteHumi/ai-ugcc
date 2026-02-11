'use client';

import { useRef, useState } from 'react';
import { Upload, Music, Video, Film, Loader2 } from 'lucide-react';
import { useMusicTracks } from '@/hooks/useMusicTracks';
import type { BgMusicConfig as BMC, MiniAppStep } from '@/types';

const stepMeta: Record<string, { icon: typeof Video; label: string }> = {
  'video-generation': { icon: Video, label: 'Video Generation' },
  'attach-video':     { icon: Film,  label: 'Attach Video' },
};

export default function BgMusicConfig({
  config, onChange, steps = [], currentStepId = '',
}: {
  config: BMC;
  onChange: (c: BMC) => void;
  steps?: MiniAppStep[];
  currentStepId?: string;
}) {
  const { tracks, uploadTrack } = useMusicTracks();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Only show video-generation and attach-video steps (exclude self)
  const targetSteps = steps.filter(
    (s) => s.id !== currentStepId && (s.type === 'video-generation' || s.type === 'attach-video'),
  );

  const selectedIds = config.applyToSteps ?? [];
  // "All" means empty array
  const isAllMode = selectedIds.length === 0;

  const selectStep = (id: string) => {
    // If currently "all", switch to just this step
    if (isAllMode) {
      onChange({ ...config, applyToSteps: [id] });
      return;
    }
    // If already selected, do nothing (at least one must stay selected)
    if (selectedIds.includes(id) && selectedIds.length === 1) return;
    // If already selected, deselect it
    if (selectedIds.includes(id)) {
      onChange({ ...config, applyToSteps: selectedIds.filter((s) => s !== id) });
      return;
    }
    // Add to selection
    const next = [...selectedIds, id];
    // If all steps now selected, reset to "all"
    if (next.length === targetSteps.length) {
      onChange({ ...config, applyToSteps: [] });
    } else {
      onChange({ ...config, applyToSteps: next });
    }
  };

  const selectAll = () => {
    onChange({ ...config, applyToSteps: [] });
  };

  const handleFile = async (file: File) => {
    setIsUploading(true);
    try {
      await uploadTrack(file, file.name.replace(/\.\w+$/, ''));
    } catch (err) {
      console.error('Upload track error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-5">
      {/* Apply to steps */}
      {targetSteps.length > 0 && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Apply music to</label>
          <div className="space-y-1.5">
            {/* All steps option */}
            <button
              onClick={selectAll}
              className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all duration-150 ${
                isAllMode
                  ? 'border-[var(--primary)] bg-[var(--accent)]'
                  : 'border-[var(--border)] hover:border-[var(--accent-border)] hover:bg-[var(--accent)]'
              }`}
            >
              <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                isAllMode ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-[var(--border)]'
              }`}>
                {isAllMode && <div className="h-2 w-2 rounded-sm bg-white" />}
              </div>
              <span className={`text-xs font-medium ${isAllMode ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
                All steps
              </span>
            </button>

            {/* Individual steps */}
            {targetSteps.map((s) => {
              const meta = stepMeta[s.type];
              if (!meta) return null;
              const Icon = meta.icon;
              const isChecked = isAllMode || selectedIds.includes(s.id);
              const stepIndex = steps.findIndex((st) => st.id === s.id);

              return (
                <button
                  key={s.id}
                  onClick={() => selectStep(s.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all duration-150 ${
                    isChecked
                      ? 'border-[var(--primary)] bg-[var(--accent)]'
                      : 'border-[var(--border)] hover:border-[var(--accent-border)] hover:bg-[var(--accent)]'
                  }`}
                >
                  <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    isChecked ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-[var(--border)]'
                  }`}>
                    {isChecked && <div className="h-2 w-2 rounded-sm bg-white" />}
                  </div>
                  <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: isChecked ? 'var(--primary)' : 'var(--text-muted)' }} />
                  <span className={`text-xs font-medium ${isChecked ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
                    {meta.label} <span className="text-[var(--text-muted)]">#{stepIndex + 1}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="rounded-lg bg-[var(--accent)] px-3 py-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
        Music will be trimmed to match the video duration. If the track is longer than the video, only the first part will play.
      </p>

      {/* Track */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Track</label>
        {tracks.length > 0 ? (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {tracks.map((t) => (
              <button
                key={t.id}
                onClick={() => onChange({ ...config, trackId: t.id, customTrackUrl: t.gcsUrl })}
                className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all duration-150 ${
                  config.trackId === t.id
                    ? 'border-[var(--primary)] bg-[var(--accent)]'
                    : 'border-[var(--border)] hover:border-[var(--accent-border)] hover:bg-[var(--accent)]'
                }`}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]">
                  <Music className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-[var(--text)]">
                    {t.name} {t.isDefault && <span className="text-[var(--text-muted)]">Default</span>}
                  </div>
                  {t.duration && (
                    <div className="text-[10px] tabular-nums text-[var(--text-muted)]">{Math.round(t.duration)}s</div>
                  )}
                </div>
                {config.trackId === t.id && (
                  <div className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                )}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">No tracks available. Upload one below.</p>
        )}
      </div>

      {/* Upload */}
      <div>
        <input ref={fileRef} type="file" accept="audio/*" onChange={handleUpload} className="hidden" disabled={isUploading} />
        <div
          onClick={() => !isUploading && fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); if (!isUploading) setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault(); setIsDragging(false);
            if (isUploading) return;
            const file = e.dataTransfer.files[0];
            if (file?.type.startsWith('audio/')) handleFile(file);
          }}
          className={`flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-xs font-medium transition-colors ${
            isUploading
              ? 'border-[var(--primary)] bg-[var(--accent)] text-[var(--text)] cursor-wait'
              : isDragging
                ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--text)] cursor-pointer'
                : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-border)] hover:text-[var(--text)] cursor-pointer'
          }`}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" />
              {isDragging ? 'Drop audio here' : 'Click or drag audio file'}
            </>
          )}
        </div>
      </div>

      {/* Volume */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-medium text-[var(--text-muted)]">Volume</label>
          <span className="rounded bg-[var(--accent)] px-1.5 py-0.5 text-[11px] tabular-nums font-medium text-[var(--text)]">
            {config.volume}%
          </span>
        </div>
        <input
          type="range" min={0} max={100}
          value={config.volume}
          onChange={(e) => onChange({ ...config, volume: parseInt(e.target.value) })}
          className="w-full" style={{ accentColor: 'var(--primary)' }}
        />
      </div>

      {/* Fade */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Fade</label>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-[11px] text-[var(--text-muted)]">In (s)</label>
            <input
              type="number" min={0} step={0.5}
              value={config.fadeIn ?? ''}
              onChange={(e) => onChange({ ...config, fadeIn: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="0"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm tabular-nums text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-border)] focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[11px] text-[var(--text-muted)]">Out (s)</label>
            <input
              type="number" min={0} step={0.5}
              value={config.fadeOut ?? ''}
              onChange={(e) => onChange({ ...config, fadeOut: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="0"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm tabular-nums text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-border)] focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
