import { cn } from '@/lib/utils';

export type LoadingShimmerTone = 'neutral' | 'master' | 'primary';

function toneClasses(tone: LoadingShimmerTone) {
  if (tone === 'master') {
    return {
      breathe: 'bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]',
      sweep: 'bg-gradient-to-r from-transparent via-master/20 to-transparent',
      soft: 'bg-gradient-to-r from-transparent via-master/12 to-transparent',
    };
  }

  if (tone === 'primary') {
    return {
      breathe: 'bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.12),transparent_70%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.06),transparent_70%)]',
      sweep: 'bg-gradient-to-r from-transparent via-[var(--primary)]/22 to-transparent',
      soft: 'bg-gradient-to-r from-transparent via-[var(--primary)]/12 to-transparent',
    };
  }

  return {
    breathe: 'bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.14),transparent_70%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.07),transparent_70%)]',
    sweep: 'bg-gradient-to-r from-transparent via-white/58 to-transparent dark:via-white/18',
    soft: 'bg-gradient-to-r from-transparent via-white/26 to-transparent dark:via-white/10',
  };
}

export default function LoadingShimmer({
  tone = 'neutral',
  className,
  backgroundClassName = 'bg-[var(--accent)]',
}: {
  tone?: LoadingShimmerTone;
  className?: string;
  backgroundClassName?: string;
}) {
  const toneClass = toneClasses(tone);

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', backgroundClassName, className)}>
      <div className={cn('skeleton-breathe absolute inset-0', toneClass.breathe)} />
      <div className={cn('skeleton-sweep absolute inset-y-0 -left-2/3 w-2/3', toneClass.sweep)} />
      <div className={cn('skeleton-sweep-soft absolute inset-y-0 -left-1/2 w-1/2', toneClass.soft)} />
    </div>
  );
}
