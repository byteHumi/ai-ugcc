const statusStyles: Record<string, string> = {
  completed: 'bg-[var(--success-bg)] text-[var(--success)]',
  published: 'bg-[var(--success-bg)] text-[var(--success)]',
  failed: 'bg-[var(--error-bg)] text-[var(--error)]',
  partial: 'bg-[var(--warning-bg)] text-[var(--warning)]',
  processing: 'bg-[var(--warning-bg)] text-[var(--warning)]',
  queued: 'bg-[var(--warning-bg)] text-[var(--warning)]',
  pending: 'bg-[var(--background)] text-[var(--text-muted)]',
  scheduled: 'bg-blue-100 text-blue-600 border border-blue-200',
};

export default function StatusBadge({
  status,
  className = '',
}: {
  status: string;
  className?: string;
}) {
  const style = statusStyles[status] || 'bg-[var(--background)] text-[var(--text-muted)]';
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style} ${className}`}>
      {status}
    </span>
  );
}
