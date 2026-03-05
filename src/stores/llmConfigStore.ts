import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LLMConfig } from '../types';

interface LLMConfigState extends LLMConfig {
  setConfig: (config: Partial<LLMConfig>) => void;
  isConfigured: () => boolean;
}

export const useLLMConfigStore = create<LLMConfigState>()(
  persist(
    (set, get) => ({
      baseUrl: '',
      apiKey: '',
      model: '',
      setConfig: (config) => set(config),
      isConfigured: () => {
        const { baseUrl, apiKey, model } = get();
        return !!(baseUrl && apiKey && model);
      },
    }),
    { name: 'dailyup-llm-config' },
  ),
);
