'use client';

import { RefreshCw } from 'lucide-react';
import { useTemplates } from '@/hooks/useTemplates';
import TemplateJobList from '@/components/templates/TemplateJobList';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export default function JobsPage() {
  const { jobs, refresh } = useTemplates();

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
            <Button variant="ghost" size="icon-sm" onClick={refresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh</TooltipContent>
        </Tooltip>
      </div>

      <TemplateJobList jobs={jobs} />
    </div>
  );
}
