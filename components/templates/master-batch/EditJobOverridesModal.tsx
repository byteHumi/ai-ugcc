'use client';

import { useState } from 'react';
import { X, Send, CalendarClock, ListOrdered, FileText, Loader2, Globe, Sparkles } from 'lucide-react';
import type { TemplateJob, MasterConfig } from '@/types';

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
];

type Props = {
  job: TemplateJob;
  masterConfig: MasterConfig;
  modelName?: string;
  onClose: () => void;
  onSave: (jobId: string, overrides: {
    captionOverride: string | null;
    publishModeOverride: MasterConfig['publishMode'] | null;
    scheduledForOverride: string | null;
    timezoneOverride: string | null;
  }) => Promise<void>;
};

export default function EditJobOverridesModal({ job, masterConfig, modelName, onClose, onSave }: Props) {
  const hasExistingOverride = !!(job.captionOverride || job.publishModeOverride);

  const [useCustomCaption, setUseCustomCaption] = useState(!!job.captionOverride);
  const [caption, setCaption] = useState(job.captionOverride || masterConfig.caption || '');

  const [useCustomTiming, setUseCustomTiming] = useState(!!job.publishModeOverride);
  const [publishMode, setPublishMode] = useState<MasterConfig['publishMode']>(
    job.publishModeOverride || masterConfig.publishMode || 'now'
  );
  const [scheduledFor, setScheduledFor] = useState(job.scheduledForOverride || masterConfig.scheduledFor || '');
  const [timezone, setTimezone] = useState(job.timezoneOverride || masterConfig.timezone || 'America/New_York');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(job.id, {
        captionOverride: useCustomCaption ? caption : null,
        publishModeOverride: useCustomTiming ? publishMode : null,
        scheduledForOverride: useCustomTiming && publishMode === 'schedule' ? scheduledFor : null,
        timezoneOverride: useCustomTiming && publishMode === 'schedule' ? timezone : null,
      });
      onClose();
    } catch {
      // parent handles toast
    } finally {
      setSaving(false);
    }
  };

  const modes = [
    { value: 'now' as const, label: 'Now', icon: Send, desc: 'Post immediately' },
    { value: 'schedule' as const, label: 'Schedule', icon: CalendarClock, desc: 'Pick date & time' },
    { value: 'queue' as const, label: 'Queue', icon: ListOrdered, desc: 'Add to queue' },
    { value: 'draft' as const, label: 'Draft', icon: FileText, desc: 'Save as draft' },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-3.5 dark:border-neutral-700 dark:bg-neutral-900">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Edit Video Settings</h3>
            <p className="text-[11px] text-neutral-500">{modelName || job.name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 p-5">
          {/* Caption Section */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Caption</label>
              <div className="flex overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
                <button
                  onClick={() => { setUseCustomCaption(false); setCaption(masterConfig.caption || ''); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                    !useCustomCaption
                      ? 'bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900'
                      : 'bg-white text-neutral-500 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-750'
                  }`}
                >
                  <Globe className="h-3 w-3" />
                  Global
                </button>
                <button
                  onClick={() => setUseCustomCaption(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                    useCustomCaption
                      ? 'bg-master text-white dark:text-master-foreground'
                      : 'bg-white text-neutral-500 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-750'
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  Custom
                </button>
              </div>
            </div>
            {!useCustomCaption ? (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800">
                {masterConfig.caption || '(no global caption)'}
              </div>
            ) : (
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                className="w-full rounded-lg border-2 border-master/40 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:border-master focus:outline-none focus:ring-2 focus:ring-master/20 dark:border-master/60 dark:bg-neutral-800 dark:text-neutral-100"
                placeholder="Custom caption for this video..."
              />
            )}
          </div>

          {/* Timing Section */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Publish Timing</label>
              <div className="flex overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
                <button
                  onClick={() => {
                    setUseCustomTiming(false);
                    setPublishMode(masterConfig.publishMode || 'now');
                    setScheduledFor(masterConfig.scheduledFor || '');
                    setTimezone(masterConfig.timezone || 'America/New_York');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                    !useCustomTiming
                      ? 'bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900'
                      : 'bg-white text-neutral-500 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-750'
                  }`}
                >
                  <Globe className="h-3 w-3" />
                  Global
                </button>
                <button
                  onClick={() => setUseCustomTiming(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                    useCustomTiming
                      ? 'bg-master text-white dark:text-master-foreground'
                      : 'bg-white text-neutral-500 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-750'
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  Custom
                </button>
              </div>
            </div>

            {!useCustomTiming ? (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800">
                {masterConfig.publishMode === 'schedule'
                  ? `Scheduled: ${masterConfig.scheduledFor || '(not set)'}`
                  : masterConfig.publishMode === 'queue'
                  ? 'Queued'
                  : masterConfig.publishMode === 'draft'
                  ? 'Draft'
                  : 'Post Now'}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {modes.map(({ value, label, icon: Icon, desc }) => (
                    <button
                      key={value}
                      onClick={() => setPublishMode(value)}
                      className={`flex items-center gap-2.5 rounded-lg border-2 p-2.5 text-left transition-all ${
                        publishMode === value
                          ? 'border-master bg-master/5 dark:border-master dark:bg-master/10'
                          : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600'
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${publishMode === value ? 'text-master-foreground' : 'text-neutral-400'}`} />
                      <div>
                        <div className={`text-xs font-semibold ${publishMode === value ? 'text-master-foreground' : 'text-neutral-700 dark:text-neutral-300'}`}>{label}</div>
                        <div className="text-[10px] text-neutral-500">{desc}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {publishMode === 'schedule' && (
                  <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-neutral-500">Date & Time</label>
                      <input
                        type="datetime-local"
                        value={scheduledFor}
                        onChange={(e) => setScheduledFor(e.target.value)}
                        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-neutral-500">Timezone</label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
                      >
                        {TIMEZONES.map((tz) => (
                          <option key={tz.value} value={tz.value}>{tz.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-neutral-200 bg-white px-5 py-3.5 dark:border-neutral-700 dark:bg-neutral-900">
          {hasExistingOverride && (
            <button
              onClick={async () => {
                setSaving(true);
                try {
                  await onSave(job.id, {
                    captionOverride: null,
                    publishModeOverride: null,
                    scheduledForOverride: null,
                    timezoneOverride: null,
                  });
                  onClose();
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              className="mr-auto rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:hover:bg-red-950/30"
            >
              Reset to Global
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-750"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-master px-4 py-2 text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 dark:text-master-foreground"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
