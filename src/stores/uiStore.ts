import { create } from 'zustand';

interface UIState {
  streamingText: string;
  isGenerating: boolean;
  generatingStatus: string;
  setStreamingText: (text: string) => void;
  appendStreamingText: (chunk: string) => void;
  setIsGenerating: (val: boolean) => void;
  setGeneratingStatus: (status: string) => void;
  resetStreaming: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  streamingText: '',
  isGenerating: false,
  generatingStatus: '',
  setStreamingText: (text) => set({ streamingText: text }),
  appendStreamingText: (chunk) =>
    set((state) => ({ streamingText: state.streamingText + chunk })),
  setIsGenerating: (val) => set({ isGenerating: val }),
  setGeneratingStatus: (status) => set({ generatingStatus: status }),
  resetStreaming: () =>
    set({ streamingText: '', isGenerating: false, generatingStatus: '' }),
}));
