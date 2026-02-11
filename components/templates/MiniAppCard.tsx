'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, ChevronUp, Trash2, Video, Type, Music, Film, Layers } from 'lucide-react';
import type { MiniAppStep, MiniAppType, VideoGenConfig as VGC, TextOverlayConfig as TOC, BgMusicConfig as BMC, AttachVideoConfig as AVC } from '@/types';
import VideoGenConfig from './VideoGenConfig';
import TextOverlayConfig from './TextOverlayConfig';
import BgMusicConfig from './BgMusicConfig';
import AttachVideoConfig from './AttachVideoConfig';

const miniAppMeta: Record<MiniAppType, { label: string; icon: typeof Video; color: string }> = {
  'video-generation': { label: 'Video Generation', icon: Video, color: 'text-purple-600' },
  'batch-video-generation': { label: 'Batch Video Gen', icon: Layers, color: 'text-amber-600' },
  'text-overlay': { label: 'Text Overlay', icon: Type, color: 'text-blue-600' },
  'bg-music': { label: 'Background Music', icon: Music, color: 'text-green-600' },
  'attach-video': { label: 'Attach Video', icon: Film, color: 'text-orange-600' },
};

export default function MiniAppCard({
  step,
  index,
  onUpdate,
  onRemove,
}: {
  step: MiniAppStep;
  index: number;
  onUpdate: (step: MiniAppStep) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const meta = miniAppMeta[step.type];
  const Icon = meta.icon;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-[var(--surface)] ${
        step.enabled ? 'border-[var(--border)]' : 'border-[var(--border)] opacity-60'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <Icon className={`h-4 w-4 ${meta.color}`} />
        <span className="flex-1 text-sm font-medium">{meta.label}</span>
        <span className="text-xs text-[var(--text-muted)]">Step {index + 1}</span>

        {/* Enable/disable toggle */}
        <button
          onClick={() => onUpdate({ ...step, enabled: !step.enabled })}
          className={`relative h-5 w-9 rounded-full transition-colors ${
            step.enabled ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              step.enabled ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>

        <button onClick={onRemove} className="text-[var(--text-muted)] hover:text-[var(--error)]">
          <Trash2 className="h-4 w-4" />
        </button>

        <button onClick={() => setExpanded(!expanded)} className="text-[var(--text-muted)]">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Config form */}
      {expanded && step.enabled && (
        <div className="border-t border-[var(--border)] p-3">
          {step.type === 'video-generation' && (
            <VideoGenConfig
              config={step.config as VGC}
              onChange={(c) => onUpdate({ ...step, config: c })}
            />
          )}
          {step.type === 'text-overlay' && (
            <TextOverlayConfig
              config={step.config as TOC}
              onChange={(c) => onUpdate({ ...step, config: c })}
            />
          )}
          {step.type === 'bg-music' && (
            <BgMusicConfig
              config={step.config as BMC}
              onChange={(c) => onUpdate({ ...step, config: c })}
            />
          )}
          {step.type === 'attach-video' && (
            <AttachVideoConfig
              config={step.config as AVC}
              onChange={(c) => onUpdate({ ...step, config: c })}
            />
          )}
        </div>
      )}
    </div>
  );
}
