// src/lib/stores/toasts.ts
import { writable } from 'svelte/store';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  timeout?: number;
}

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);
  let count = 0;

  function addToast(
    toast: Omit<Toast, 'id'> & { timeout?: number }
  ) {
    const id = count++;
    const defaults = {
      id,
      timeout: 3000 // Durée par défaut de 3 secondes
    };

    update(toasts => [
      ...toasts,
      { ...defaults, ...toast }
    ]);

    if (toast.timeout !== 0) {
      setTimeout(
        () => removeToast(id),
        toast.timeout || defaults.timeout
      );
    }
  }

  function removeToast(id: number) {
    update(toasts => toasts.filter(t => t.id !== id));
  }

  return {
    subscribe,
    add: addToast,
    remove: removeToast,
    clear: () => update(() => [])
  };
}

export const toasts = createToastStore();

// Helper function for easier imports
export const addToast = (toast: Omit<Toast, 'id'>) => toasts.add(toast);