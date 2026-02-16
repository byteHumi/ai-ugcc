'use client';

import RefreshButton from '@/components/ui/RefreshButton';
import type { DateFilterValue } from '@/types/media-filters';
import { DATE_FILTER_OPTIONS } from '@/types/media-filters';
import type { ModelFilterOption } from '@/hooks/useModelFilterOptions';

export default function ModelDateToolbar({
  modelId,
  onModelChange,
  dateFilter,
  onDateFilterChange,
  modelOptions,
  onRefresh,
  className = '',
}: {
  modelId: string;
  onModelChange: (value: string) => void;
  dateFilter: DateFilterValue;
  onDateFilterChange: (value: DateFilterValue) => void;
  modelOptions: ModelFilterOption[];
  onRefresh: () => Promise<void> | void;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center justify-end gap-2 ${className}`}>
      <label className="sr-only" htmlFor="media-model-filter">Filter by model</label>
      <select
        id="media-model-filter"
        value={modelId}
        onChange={(e) => onModelChange(e.target.value)}
        className="h-10 min-w-[9.5rem] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
      >
        <option value="all">All models</option>
        {modelOptions.map((model) => (
          <option key={model.id} value={model.id}>{model.name}</option>
        ))}
      </select>

      <label className="sr-only" htmlFor="media-date-filter">Filter by date</label>
      <select
        id="media-date-filter"
        value={dateFilter}
        onChange={(e) => onDateFilterChange(e.target.value as DateFilterValue)}
        className="h-10 min-w-[10.5rem] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
      >
        {DATE_FILTER_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>

      <RefreshButton onClick={onRefresh} />
    </div>
  );
}
