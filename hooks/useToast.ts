'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import React from 'react';

type Toast = { message: string; type: string } | null;

type ToastContextType = {
  toast: Toast;
  showToast: (message: string, type?: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast>(null);

  const showToast = useCallback((message: string, type = '') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  return React.createElement(
    ToastContext.Provider,
    { value: { toast, showToast } },
    children
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
