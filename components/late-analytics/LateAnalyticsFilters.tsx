'use client';
import { useState, useRef, useEffect } from 'react';
import { Download, RefreshCw, Clock, X } from 'lucide-react';

type Filters = { platform: string; dateRange: string; sortBy: string; profile?: string; customFrom?: string; customTo?: string; groups?: string[]; batchId?: string };
type Account = { id: string; platform: string; username: string; displayName?: string };
type GroupAccountMap = { name: string; accountIds: string[] };
type BatchInfo = { id: string; name: string; createdAt: string; status: string };

function toLocalDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getTodayKey() { return toLocalDateKey(new Date().toISOString()); }
function getYesterdayKey() { return toLocalDateKey(new Date(Date.now() - 86_400_000).toISOString()); }

export default function LateAnalyticsFilters({
  filters, setFilters, lastSync, onRefresh, onDownload, accounts = [], groupAccounts = [], batches = []
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  lastSync: string | null;
  onRefresh: () => void;
  onDownload?: () => void;
  accounts?: Account[];
  groupAccounts?: GroupAccountMap[];
  batches?: BatchInfo[];
}) {
  const selectClass = "appearance-none rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2 pr-8 text-sm font-medium text-[var(--text-primary)] outline-none cursor-pointer hover:border-[var(--primary)] transition-colors bg-[length:16px] bg-[right_8px_center] bg-no-repeat";
  const chevronStyle = { backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` };
  const inputClass = "rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] outline-none cursor-pointer hover:border-[var(--primary)] transition-colors";

  const uniqueProfiles = Array.from(
    new Map(accounts.map(a => [a.username, a])).values()
  );

  const selectedGroups = filters.groups || [];

  // Batch-wise: show selector only on day-level views
  const isDayView = filters.dateRange === 'today' || filters.dateRange === 'yesterday';
  const selectedDayKey = filters.dateRange === 'today' ? getTodayKey() : filters.dateRange === 'yesterday' ? getYesterdayKey() : null;
  const dayBatches = selectedDayKey
    ? batches.filter((b) => toLocalDateKey(b.createdAt) === selectedDayKey)
    : batches;
  const [batchDropdownOpen, setBatchDropdownOpen] = useState(false);
  const batchDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (batchDropdownRef.current && !batchDropdownRef.current.contains(e.target as Node)) {
        setBatchDropdownOpen(false);
      }
    }
    if (batchDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [batchDropdownOpen]);

  const selectedBatch = batches.find((b) => b.id === filters.batchId);
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const groupDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(e.target as Node)) {
        setGroupDropdownOpen(false);
      }
    }
    if (groupDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [groupDropdownOpen]);

  const toggleGroup = (name: string) => {
    const next = selectedGroups.includes(name)
      ? selectedGroups.filter((g) => g !== name)
      : [...selectedGroups, name];
    setFilters({ ...filters, groups: next.length > 0 ? next : undefined });
  };

  const clearGroups = () => {
    setFilters({ ...filters, groups: undefined });
    setGroupDropdownOpen(false);
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className={selectClass} style={chevronStyle} value={filters.platform} onChange={e => setFilters({ ...filters, platform: e.target.value })}>
          <option value="">All platforms</option>
          <option value="tiktok">TikTok</option>
          <option value="instagram">Instagram</option>
          <option value="youtube">YouTube</option>
        </select>

        <select
          className={selectClass}
          style={chevronStyle}
          value={filters.profile || ''}
          onChange={e => setFilters({ ...filters, profile: e.target.value })}
          disabled={uniqueProfiles.length === 0}
        >
          <option value="">All profiles</option>
          {uniqueProfiles.map(a => (
            <option key={a.id} value={a.username}>{a.displayName || a.username} ({a.platform})</option>
          ))}
        </select>

        {/* Multi-select group dropdown */}
        {groupAccounts.length > 0 && (
          <div className="relative" ref={groupDropdownRef}>
            <button
              type="button"
              onClick={() => setGroupDropdownOpen((o) => !o)}
              className={`flex items-center gap-2 rounded-lg border bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium transition-colors hover:border-[var(--primary)] ${
                selectedGroups.length > 0 ? 'border-[var(--primary)] text-[var(--text-primary)]' : 'border-[var(--border)] text-[var(--text-primary)]'
              }`}
            >
              {selectedGroups.length === 0 ? (
                <span>All groups</span>
              ) : (
                <span>{selectedGroups.length} group{selectedGroups.length > 1 ? 's' : ''}</span>
              )}
              {selectedGroups.length > 0 ? (
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); clearGroups(); }}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--bg-tertiary)]"
                >
                  <X className="h-3 w-3" />
                </span>
              ) : (
                <svg className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${groupDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {groupDropdownOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-lg">
                <div className="max-h-64 overflow-y-auto py-1">
                  {groupAccounts.map((g) => {
                    const isSelected = selectedGroups.includes(g.name);
                    return (
                      <label
                        key={g.name}
                        className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)]"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleGroup(g.name)}
                          className="h-3.5 w-3.5 rounded accent-[var(--primary)]"
                        />
                        <span className="flex-1 text-[var(--text-primary)]">{g.name}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">{g.accountIds.length}</span>
                      </label>
                    );
                  })}
                </div>
                {selectedGroups.length > 0 && (
                  <div className="border-t border-[var(--border)] px-3 py-1.5">
                    <button
                      type="button"
                      onClick={clearGroups}
                      className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <select className={selectClass} style={chevronStyle} value={filters.dateRange} onChange={e => setFilters({ ...filters, dateRange: e.target.value, batchId: undefined })}>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="180d">Last 6 months</option>
          <option value="365d">Last year</option>
          <option value="all">All time</option>
          <option value="custom">Custom range</option>
        </select>

        {/* Batch selector — only on day-level views */}
        {isDayView && (
          <div className="relative" ref={batchDropdownRef}>
            <button
              type="button"
              onClick={() => setBatchDropdownOpen((o) => !o)}
              className={`flex items-center gap-2 rounded-lg border bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium transition-colors hover:border-[var(--primary)] ${
                filters.batchId ? 'border-[var(--primary)] text-[var(--text-primary)]' : 'border-[var(--border)] text-[var(--text-primary)]'
              }`}
            >
              {filters.batchId && selectedBatch ? (
                <span className="max-w-[140px] truncate">{selectedBatch.name || `Batch ${selectedBatch.id.slice(0, 6)}`}</span>
              ) : (
                <span>All batches</span>
              )}
              {filters.batchId ? (
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); setFilters({ ...filters, batchId: undefined }); }}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--bg-tertiary)]"
                >
                  <X className="h-3 w-3" />
                </span>
              ) : (
                <svg className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${batchDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {batchDropdownOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-lg">
                <div className="max-h-64 overflow-y-auto py-1">
                  <button
                    type="button"
                    onClick={() => { setFilters({ ...filters, batchId: undefined }); setBatchDropdownOpen(false); }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] ${!filters.batchId ? 'font-semibold text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}
                  >
                    All batches
                  </button>
                  {dayBatches.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-[var(--text-muted)]">No batches for this day</div>
                  ) : (
                    dayBatches.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => { setFilters({ ...filters, batchId: b.id }); setBatchDropdownOpen(false); }}
                        className={`w-full px-3 py-2 text-left hover:bg-[var(--bg-tertiary)] ${filters.batchId === b.id ? 'bg-[var(--primary)]/5' : ''}`}
                      >
                        <div className={`text-sm font-medium ${filters.batchId === b.id ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>
                          {b.name || `Batch ${b.id.slice(0, 8)}`}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {b.status}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {filters.dateRange === 'custom' && (
          <>
            <input
              type="date"
              className={inputClass}
              value={filters.customFrom || ''}
              onChange={e => setFilters({ ...filters, customFrom: e.target.value })}
            />
            <span className="text-xs text-[var(--text-muted)]">to</span>
            <input
              type="date"
              className={inputClass}
              value={filters.customTo || ''}
              onChange={e => setFilters({ ...filters, customTo: e.target.value })}
            />
          </>
        )}

        <select className={selectClass} style={chevronStyle} value={filters.sortBy} onChange={e => setFilters({ ...filters, sortBy: e.target.value })}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="engagement">Most engagement</option>
        </select>

        <div className="ml-auto flex items-center gap-2">
          {lastSync && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] bg-[var(--bg-tertiary)] rounded-full px-3 py-1.5">
              <Clock className="h-3 w-3" />
              <span>Last updated {formatSyncTime(lastSync)}</span>
            </div>
          )}
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            title="Refresh data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {onDownload && (
            <button
              onClick={onDownload}
              className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              title="Download CSV"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatSyncTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
