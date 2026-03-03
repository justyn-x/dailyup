import { create } from "zustand";
import type { Plan } from "@/types";
import { request } from "@/services/api";
import { streamFetch } from "@/services/sse";

interface PlanStore {
  plan: Plan | null;
  isGenerating: boolean;
  progressMessage: string;
  error: string | null;

  fetchPlan: (projectId: number) => Promise<void>;
  generatePlan: (projectId: number) => Promise<void>;
  reset: () => void;
}

export const usePlanStore = create<PlanStore>((set) => ({
  plan: null,
  isGenerating: false,
  progressMessage: "",
  error: null,

  fetchPlan: async (projectId: number) => {
    set({ error: null });
    try {
      const plan = await request<Plan>(`/projects/${projectId}/plan`);
      set({ plan });
    } catch (err: unknown) {
      // 404 means no plan yet — not an error
      if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 404) {
        set({ plan: null });
        return;
      }
      const message = err instanceof Error ? err.message : "获取学习计划失败";
      set({ error: message });
    }
  },

  generatePlan: async (projectId: number) => {
    set({ isGenerating: true, progressMessage: "正在准备生成学习计划...", error: null });

    await streamFetch(`/projects/${projectId}/plan`, {
      method: "POST",
      onProgress: (_phase: string, message: string) => {
        set({ progressMessage: message });
      },
      onDone: (result: unknown) => {
        set({
          plan: result as Plan,
          isGenerating: false,
          progressMessage: "",
        });
      },
      onError: (error: { code: string; message: string; retryable: boolean }) => {
        set({
          isGenerating: false,
          progressMessage: "",
          error: error.message,
        });
      },
    });
  },

  reset: () => {
    set({
      plan: null,
      isGenerating: false,
      progressMessage: "",
      error: null,
    });
  },
}));
