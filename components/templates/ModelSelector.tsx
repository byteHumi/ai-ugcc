'use client';

import { useState, useMemo } from 'react';
import { Search, CheckSquare, Square, Check } from 'lucide-react';
import type { Model } from '@/types';

export default function ModelSelector({
  models,
  selectedIds,
  onChange,
  accountCounts,
}: {
  models: Model[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  accountCounts?: Record<string, number>;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return models;
    const q = search.toLowerCase();
    return models.filter((m) => m.name.toLowerCase().includes(q));
  }, [models, search]);

  const allSelected = filtered.length > 0 && filtered.every((m) => selectedIds.includes(m.id));

  const toggleAll = () => {
    if (allSelected) {
      onChange(selectedIds.filter((id) => !filtered.some((m) => m.id === id)));
    } else {
      const newIds = new Set(selectedIds);
      filtered.forEach((m) => newIds.add(m.id));
      onChange(Array.from(newIds));
    }
  };

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id]
    );
  };

  return (
    <div>
      {/* Search + Select All */}
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-1.5 pl-7 pr-3 text-xs"
          />
        </div>
        <button
          onClick={toggleAll}
          className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1.5 text-[10px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--accent)]"
        >
          {allSelected ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3" />}
          {allSelected ? 'Clear' : 'All'}
        </button>
      </div>

      {/* Count */}
      <div className="mb-2 text-[10px] text-[var(--text-muted)]">
        {selectedIds.length} of {models.length} selected
      </div>

      {/* Model Grid */}
      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
        {filtered.map((model) => {
          const isSelected = selectedIds.includes(model.id);
          const acctCount = accountCounts?.[model.id] || 0;
          return (
            <button
              key={model.id}
              onClick={() => toggle(model.id)}
              className={`flex items-center gap-2 rounded-lg border p-2 text-left transition-all ${
                isSelected
                  ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                  : 'border-[var(--border)] hover:border-[var(--primary)]/50'
              }`}
            >
              {model.avatarUrl ? (
                <img src={model.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--background)] text-xs font-bold text-[var(--text-muted)]">
                  {model.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{model.name}</div>
                {acctCount > 0 && (
                  <div className="text-[10px] text-[var(--text-muted)]">{acctCount} account{acctCount !== 1 ? 's' : ''}</div>
                )}
              </div>
              {isSelected && (
                <Check className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-6 text-center text-xs text-[var(--text-muted)]">
          {search ? 'No models match search' : 'No models available'}
        </div>
      )}
    </div>
  );
}
