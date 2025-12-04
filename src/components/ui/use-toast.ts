import { useState, useCallback } from 'react';

export type Toast = {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
};

let toastId = 0;
const listeners = new Set<(toasts: Toast[]) => void>();
let toasts: Toast[] = [];

export function useToast() {
  const [, setState] = useState(0);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${++toastId}`;
    const newToast = { ...toast, id };
    toasts = [...toasts, newToast];
    listeners.forEach((listener) => listener([...toasts]));
    setState((s) => s + 1);
    
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      listeners.forEach((listener) => listener([...toasts]));
      setState((s) => s + 1);
    }, 5000);
  }, []);

  return { addToast };
}

