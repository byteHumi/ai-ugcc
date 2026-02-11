export default function ProgressBar({
  progress,
  className = '',
  size = 'default',
}: {
  progress: number;
  className?: string;
  size?: 'sm' | 'default';
}) {
  const h = size === 'sm' ? 'h-1' : 'h-1.5';
  return (
    <div className={`${h} w-full overflow-hidden rounded-full bg-[var(--border)] ${className}`}>
      <div
        className={`${h} rounded-full transition-all duration-500 ease-out ${
          progress >= 100
            ? 'bg-emerald-500'
            : 'bg-[var(--primary)]'
        }`}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
}
