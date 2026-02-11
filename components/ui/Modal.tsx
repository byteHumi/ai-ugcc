import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`max-h-[96vh] w-full ${maxWidth} mx-1 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5">
            <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
            <button
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--text)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
