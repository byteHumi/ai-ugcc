'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useTemplates } from '@/hooks/useTemplates';
import TemplateJobList from '@/components/templates/TemplateJobList';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export default function JobsPage() {
  const { jobs, refresh, refreshing } = useTemplates();
  const [newJobName, setNewJobName] = useState<string | null>(null);

  // Show a banner if we just came from creating a job
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('ai-ugc-new-job');
      if (raw) {
        const job = JSON.parse(raw);
        setNewJobName(job.name || 'Pipeline');
      }
    } catch {}
  }, []);

  // Hide banner once the job appears in real polled data
  useEffect(() => {
    if (!newJobName) return;
    try {
      const raw = sessionStorage.getItem('ai-ugc-new-job');
      if (!raw) { setNewJobName(null); return; }
      const nj = JSON.parse(raw);
      const found = jobs.find((j) => j.id === nj.id);
      if (found && found.status !== 'queued') {
        setNewJobName(null);
      }
    } catch {}
  }, [jobs, newJobName]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--primary)]">Jobs</h1>
          <p className="text-xs text-[var(--text-muted)]">
            {jobs.length} job{jobs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={refresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh</TooltipContent>
        </Tooltip>
      </div>

      {newJobName && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/50 dark:bg-blue-950/30">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <div>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Pipeline started</p>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70">{newJobName} is being processed. This may take a moment.</p>
          </div>
        </div>
      )}

      <TemplateJobList jobs={jobs} />
    </div>
  );
}
