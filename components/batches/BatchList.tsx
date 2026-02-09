'use client';

import Link from 'next/link';
import type { Batch } from '@/types';
import { usePagination } from '@/hooks/usePagination';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ', ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function BatchList({
  batches,
  isLoading,
}: {
  batches: Batch[];
  isLoading: boolean;
}) {
  const { page, setPage, totalPages, paginatedItems, pageNumbers, hasPrev, hasNext, prevPage, nextPage } = usePagination(batches, 10);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[var(--background)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-[var(--background)]" />
                <div className="h-3 w-1/2 rounded bg-[var(--background)]" />
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-[var(--background)]" />
          </div>
        ))}
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
        <h3 className="mb-2 font-semibold">No batches yet</h3>
        <p className="mb-4 text-[var(--text-muted)]">Start a bulk generation to create a batch</p>
        <Link
          href="/generate?bulkMode=true"
          className="inline-block rounded-lg bg-[var(--primary)] px-4 py-2 text-white"
        >
          Start Bulk Generate
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {paginatedItems.map((batch) => {
          const isActive = batch.status === 'pending' || batch.status === 'processing';
          return (
            <Link
              key={batch.id}
              href={`/batches/${batch.id}`}
              className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-all hover:border-[var(--primary)] hover:shadow-lg"
            >
              {/* Header */}
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-lg">
                    {batch.model?.avatarUrl ? (
                      <img src={batch.model.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      '🎬'
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold group-hover:text-[var(--primary)]">{batch.name}</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {batch.model?.name || 'Single image'}
                    </div>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  batch.status === 'completed' ? 'bg-[var(--success-bg)] text-[var(--success)]' :
                  batch.status === 'failed' ? 'bg-[var(--error-bg)] text-[var(--error)]' :
                  batch.status === 'partial' ? 'bg-[var(--warning-bg)] text-[var(--warning)]' :
                  isActive ? 'bg-blue-50 text-blue-600' :
                  'bg-[var(--background)] text-[var(--text-muted)]'
                }`}>
                  {isActive && <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />}
                  {batch.status}
                </span>
              </div>

              {/* Stats */}
              <div className="mb-3 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--text-muted)]">Videos</span>
                  <span className="font-medium">{batch.totalJobs}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                  <span className="font-medium">{batch.completedJobs}</span>
                </div>
                {batch.failedJobs > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--error)]" />
                    <span className="font-medium">{batch.failedJobs}</span>
                  </div>
                )}
              </div>

              {/* Date */}
              {batch.createdAt && (
                <div className="text-xs text-[var(--text-muted)]">
                  {formatDate(batch.createdAt)}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {totalPages > 1 && (
        <Pagination className="mt-6">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious onClick={prevPage} className={!hasPrev ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
            </PaginationItem>
            {pageNumbers.map((p, i) =>
              p === 'ellipsis' ? (
                <PaginationItem key={`e-${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink isActive={page === p} onClick={() => setPage(p)} className="cursor-pointer">
                    {p}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext onClick={nextPage} className={!hasNext ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </>
  );
}
