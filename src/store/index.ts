import { create } from 'zustand';
import { createSessionSlice, type SessionSlice } from './slices/sessionSlice';
import { createUiSlice, type UiSlice } from './slices/uiSlice';

export type AppStore = SessionSlice & UiSlice;

/**
 * Lightweight global state (spec §2). Persistent data lives in SQLite behind
 * the repositories; this store holds only the in-flight session and UI state.
 */
export const useAppStore = create<AppStore>()((...args) => ({
  ...createSessionSlice(...args),
  ...createUiSlice(...args),
}));

export type { SessionSlice, UiSlice };
export type { AnsweredRecord, PracticeSessionState } from './slices/sessionSlice';
export type { ToastMessage } from './slices/uiSlice';
