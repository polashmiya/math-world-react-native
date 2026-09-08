import type { StateCreator } from 'zustand';
import type { UserSettings } from '../../domain/models';

export interface ToastMessage {
  id: string;
  kind: 'success' | 'info' | 'warning' | 'error' | 'achievement';
  title: string;
  detail?: string;
}

export interface UiSlice {
  settings: UserSettings | null;
  toasts: ToastMessage[];
  /** Bumped whenever data changes so screens can refetch. */
  dataVersion: number;
  setSettings: (settings: UserSettings | null) => void;
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
  invalidateData: () => void;
}

let toastCounter = 0;

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (set) => ({
  settings: null,
  toasts: [],
  dataVersion: 0,

  setSettings: (settings) => set(() => ({ settings })),

  pushToast: (toast) =>
    set((state) => {
      toastCounter += 1;
      const next: ToastMessage = { ...toast, id: 'toast-' + toastCounter };
      // Three at a time keeps the screen readable.
      return { toasts: [...state.toasts, next].slice(-3) };
    }),

  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  invalidateData: () => set((state) => ({ dataVersion: state.dataVersion + 1 })),
});
