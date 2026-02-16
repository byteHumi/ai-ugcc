'use client';

import { BookOpen, Crown, PanelRightClose, PanelRightOpen, Play, Save } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';

type Props = {
  enabledStepCount: number;
  selectedModelCount: number;
  isSubmitting: boolean;
  panelOpen: boolean;
  onOpenPresets: () => void;
  onOpenSavePreset: () => void;
  onTogglePanel: () => void;
  onRun: () => void;
};

export default function MasterPipelineHeader({
  enabledStepCount,
  selectedModelCount,
  isSubmitting,
  panelOpen,
  onOpenPresets,
  onOpenSavePreset,
  onTogglePanel,
  onRun,
}: Props) {
  return (
    <div className="flex items-center justify-between px-4 py-3 md:px-6">
      <div className="shrink-0">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-master dark:text-master-foreground" />
          <h1 className="text-2xl font-bold tracking-tight text-master dark:text-master-foreground">Master Pipeline</h1>
        </div>
        <p className="text-xs text-[var(--text-muted)]">Run one pipeline across all your models</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] backdrop-blur-xl">
          <button
            onClick={onOpenPresets}
            className="flex items-center gap-1.5 rounded-l-lg px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--text)]"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Presets</span>
          </button>
          <div className="h-5 w-px bg-[var(--border)]" />
          <button
            onClick={onOpenSavePreset}
            disabled={enabledStepCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--text)] disabled:pointer-events-none disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Save</span>
          </button>
          <div className="h-5 w-px bg-[var(--border)]" />
          <button
            onClick={onTogglePanel}
            className="flex items-center gap-1.5 rounded-r-lg px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--text)]"
          >
            {panelOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Panel</span>
          </button>
        </div>

        <button
          onClick={onRun}
          disabled={isSubmitting || enabledStepCount === 0}
          className="flex items-center gap-1.5 rounded-lg bg-master px-4 py-1.5 text-xs font-semibold text-white transition-all hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
        >
          {isSubmitting ? <Spinner className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
          Run ({selectedModelCount})
        </button>
      </div>
    </div>
  );
}
