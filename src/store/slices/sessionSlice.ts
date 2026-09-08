import type { StateCreator } from 'zustand';
import type { PracticeMode, Question } from '../../domain/models';

export interface AnsweredRecord {
  questionId: string;
  isCorrect: boolean;
  timeSpentMs: number;
  xp: number;
}

export interface PracticeSessionState {
  sessionId: string | null;
  mode: PracticeMode;
  questions: Question[];
  origins: string[];
  index: number;
  answered: AnsweredRecord[];
  hintsUsed: number;
  startedAtMs: number | null;
  questionStartedAtMs: number | null;
  /** Think First inputs for the current question. */
  estimate: string;
  strategy: string | null;
  revealed: boolean;
}

export interface SessionSlice {
  session: PracticeSessionState;
  beginSession: (payload: {
    sessionId: string;
    mode: PracticeMode;
    questions: Question[];
    origins: string[];
  }) => void;
  nextQuestion: () => void;
  recordAnswer: (record: AnsweredRecord) => void;
  useHint: () => void;
  setEstimate: (value: string) => void;
  setStrategy: (value: string | null) => void;
  reveal: () => void;
  resetSession: () => void;
}

const emptySession = (): PracticeSessionState => ({
  sessionId: null,
  mode: 'practice',
  questions: [],
  origins: [],
  index: 0,
  answered: [],
  hintsUsed: 0,
  startedAtMs: null,
  questionStartedAtMs: null,
  estimate: '',
  strategy: null,
  revealed: false,
});

/**
 * Only the live session lives in global state; questions and progress stay in
 * SQLite. Keeping this slice small is what stops the app holding a large
 * dataset in React state (spec §43).
 */
export const createSessionSlice: StateCreator<SessionSlice, [], [], SessionSlice> = (set) => ({
  session: emptySession(),

  beginSession: ({ sessionId, mode, questions, origins }) =>
    set(() => ({
      session: {
        ...emptySession(),
        sessionId,
        mode,
        questions,
        origins,
        startedAtMs: Date.now(),
        questionStartedAtMs: Date.now(),
      },
    })),

  nextQuestion: () =>
    set((state) => ({
      session: {
        ...state.session,
        index: state.session.index + 1,
        hintsUsed: 0,
        estimate: '',
        strategy: null,
        revealed: false,
        questionStartedAtMs: Date.now(),
      },
    })),

  recordAnswer: (record) =>
    set((state) => ({
      session: { ...state.session, answered: [...state.session.answered, record] },
    })),

  useHint: () =>
    set((state) => ({ session: { ...state.session, hintsUsed: state.session.hintsUsed + 1 } })),

  setEstimate: (value) => set((state) => ({ session: { ...state.session, estimate: value } })),

  setStrategy: (value) => set((state) => ({ session: { ...state.session, strategy: value } })),

  reveal: () => set((state) => ({ session: { ...state.session, revealed: true } })),

  resetSession: () => set(() => ({ session: emptySession() })),
});
