'use client';

import { useToast } from '@/hooks/useToast';

export default function Toast() {
  const { toast } = useToast();
  if (!toast) return null;
  return (
    <div
      className={`fixed bottom-8 right-8 z-[2000] rounded-lg px-6 py-3 shadow-lg transition-all ${
        toast.type === 'error' ? 'bg-[var(--error)]' : toast.type === 'success' ? 'bg-[var(--success)]' : 'bg-[var(--primary)]'
      } text-white`}
    >
      {toast.message}
    </div>
  );
}
