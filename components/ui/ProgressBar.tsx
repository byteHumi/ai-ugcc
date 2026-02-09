export default function ProgressBar({
  progress,
  className = '',
}: {
  progress: number;
  className?: string;
}) {
  return (
    <div className={`h-2 w-full rounded-full bg-[var(--background)] ${className}`}>
      <div
        className="h-full rounded-full bg-[var(--success)] transition-all"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
