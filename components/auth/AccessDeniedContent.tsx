'use client';

import { signOut } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AccessDeniedInner() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-8 text-center shadow-lg">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>

        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Access Denied</h1>
          {email && (
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">{email}</span> is not authorized to access this app.
            </p>
          )}
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-tertiary)]"
        >
          Sign out &amp; try another account
        </button>
      </div>
    </div>
  );
}

export default function AccessDeniedContent() {
  return (
    <Suspense>
      <AccessDeniedInner />
    </Suspense>
  );
}
