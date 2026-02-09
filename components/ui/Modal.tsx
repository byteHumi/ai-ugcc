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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className={`max-h-[90vh] w-full ${maxWidth} overflow-auto rounded-2xl bg-[var(--surface)] shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="text-2xl text-[var(--text-muted)]">&times;</button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
