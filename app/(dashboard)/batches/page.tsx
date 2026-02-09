'use client';

import { useBatches } from '@/hooks/useBatches';
import BatchList from '@/components/batches/BatchList';
import RefreshButton from '@/components/ui/RefreshButton';

export default function BatchesPage() {
  const { batches, isLoadingPage, refresh } = useBatches();

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Batches</h1>
          <p className="text-[var(--text-muted)]">Track bulk video generation progress</p>
        </div>
        <RefreshButton onClick={refresh} />
      </div>

      <BatchList batches={batches} isLoading={isLoadingPage} />
    </div>
  );
}
