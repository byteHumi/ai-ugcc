'use client';

import { useRef, useState } from 'react';
import { Upload, Music } from 'lucide-react';
import { useMusicTracks } from '@/hooks/useMusicTracks';
import type { BgMusicConfig as BMC } from '@/types';

export default function BgMusicConfig({
  config, onChange,
}: {
  config: BMC;
  onChange: (c: BMC) => void;
}) {
  const { tracks, uploadTrack } = useMusicTracks();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file: File) => {
    try {
      await uploadTrack(file, file.name.replace(/\.\w+$/, ''));
    } catch (err) {
      console.error('Upload track error:', err);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-5">
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
        <input ref={fileRef} type="file" accept="audio/*" onChange={handleUpload} className="hidden" />
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault(); setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file?.type.startsWith('audio/')) handleFile(file);
          }}
          className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-xs font-medium transition-colors ${
            isDragging
              ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--text)]'
              : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-border)] hover:text-[var(--text)]'
          }`}
        >
          <Upload className="h-3.5 w-3.5" />
          {isDragging ? 'Drop audio here' : 'Click or drag audio file'}
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
