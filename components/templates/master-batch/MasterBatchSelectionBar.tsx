'use client';

import { Loader2, ThumbsUp, XCircle } from 'lucide-react';

type Props = {
  selectedCount: number;
  posting: boolean;
  onRejectSelected: () => void;
  onApproveSelected: () => void;
};

export default function MasterBatchSelectionBar({
  selectedCount,
  posting,
  onRejectSelected,
  onApproveSelected,
}: Props) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center gap-2 sm:gap-3 px-3 sm:px-6 py-3">
        <div className="text-xs sm:text-sm font-medium">{selectedCount} selected</div>
        <div className="flex-1" />
        <button
          onClick={onRejectSelected}
          className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 sm:px-4 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
        >
          <XCircle className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Reject Selected</span>
          <span className="sm:hidden">Reject</span>
        </button>
        <button
          onClick={onApproveSelected}
          disabled={posting}
          className="flex items-center gap-1.5 rounded-lg bg-master px-3 sm:px-5 py-2 text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 dark:text-master-foreground"
        >
          {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">Approve Selected ({selectedCount})</span>
          <span className="sm:hidden">Approve ({selectedCount})</span>
        </button>
      </div>
    </div>
  );
}
