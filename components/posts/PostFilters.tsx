'use client';

export default function PostFilters({
  postsFilter,
  setPostsFilter,
}: {
  postsFilter: string;
  setPostsFilter: (f: string) => void;
}) {
  return (
    <div className="mb-4 flex gap-2">
      {['all', 'published', 'scheduled', 'draft', 'failed'].map((f) => (
        <button
          key={f}
          onClick={() => setPostsFilter(f)}
          className={`rounded-lg border px-4 py-2 text-sm capitalize ${
            postsFilter === f
              ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
              : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--background)]'
          }`}
        >
          {f === 'all' ? 'All posts' : f}
        </button>
      ))}
    </div>
  );
}
