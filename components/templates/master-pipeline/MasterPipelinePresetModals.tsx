'use client';

import type { MiniAppStep } from '@/types';
import { Loader2, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';

type Preset = {
  id: string;
  name: string;
  description?: string;
  pipeline: MiniAppStep[];
};

type Props = {
  showPresets: boolean;
  showSavePreset: boolean;
  presets: Preset[];
  presetsLoading: boolean;
  presetSaving: boolean;
  presetName: string;
  stepsCount: number;
  onClosePresets: () => void;
  onCloseSavePreset: () => void;
  onLoadPreset: (pipeline: MiniAppStep[]) => void;
  onDeletePreset: (presetId: string) => void;
  onPresetNameChange: (value: string) => void;
  onSavePreset: () => void;
};

export default function MasterPipelinePresetModals({
  showPresets,
  showSavePreset,
  presets,
  presetsLoading,
  presetSaving,
  presetName,
  stepsCount,
  onClosePresets,
  onCloseSavePreset,
  onLoadPreset,
  onDeletePreset,
  onPresetNameChange,
  onSavePreset,
}: Props) {
  return (
    <>
      <Modal open={showPresets} onClose={onClosePresets} title="Pipeline Presets">
        <div className="p-4">
          {presetsLoading && presets.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
              <span className="text-sm text-[var(--text-muted)]">Loading presets...</span>
            </div>
          ) : presets.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--text-muted)]">
              No saved presets yet. Build a pipeline and click &ldquo;Save&rdquo; to create one.
            </div>
          ) : (
            <div className="space-y-2">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3 transition-colors hover:bg-[var(--background)]"
                >
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onLoadPreset(preset.pipeline)}>
                    <div className="text-sm font-medium">{preset.name}</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {preset.pipeline.length} step{preset.pipeline.length !== 1 ? 's' : ''}
                      {preset.description && ` — ${preset.description}`}
                    </div>
                    <div className="mt-1 flex gap-1">
                      {preset.pipeline.map((step, i) => (
                        <span key={i} className="rounded bg-[var(--background)] px-1.5 py-0.5 text-[9px] capitalize text-[var(--text-muted)]">
                          {step.type.replace('-', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => onDeletePreset(preset.id)}
                    className="shrink-0 text-[var(--text-muted)] hover:text-[var(--error)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal open={showSavePreset} onClose={onCloseSavePreset} title="Save as Preset">
        <div className="space-y-4 p-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Preset Name</label>
            <input
              value={presetName}
              onChange={(event) => onPresetNameChange(event.target.value)}
              placeholder="My Master Pipeline"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              onKeyDown={(event) => event.key === 'Enter' && onSavePreset()}
            />
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            This will save the current {stepsCount} step{stepsCount !== 1 ? 's' : ''} as a reusable preset.
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onCloseSavePreset}
              disabled={presetSaving}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onSavePreset}
              disabled={presetSaving}
              className="flex items-center gap-2 rounded-lg bg-master px-4 py-2 text-sm text-white disabled:opacity-70"
            >
              {presetSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {presetSaving ? 'Saving...' : 'Save Preset'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
