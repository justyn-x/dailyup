import { create } from "zustand";

interface StreamState {
  content: string;
  isStreaming: boolean;
  error: string | null;
  progressMessage: string;
}

interface StreamActions {
  appendChunk: (chunk: string) => void;
  reset: () => void;
  setError: (msg: string | null) => void;
  setStreaming: (streaming: boolean) => void;
  setProgressMessage: (msg: string) => void;
}

const initialState: StreamState = {
  content: "",
  isStreaming: false,
  error: null,
  progressMessage: "",
};

export const useStreamStore = create<StreamState & StreamActions>((set) => ({
  ...initialState,

  appendChunk: (chunk: string) =>
    set((state) => ({ content: state.content + chunk })),

  reset: () => set(initialState),

  setError: (msg: string | null) =>
    set({ error: msg, isStreaming: false }),

  setStreaming: (streaming: boolean) =>
    set({ isStreaming: streaming }),

  setProgressMessage: (msg: string) =>
    set({ progressMessage: msg }),
}));
