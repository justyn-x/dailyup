import { create } from "zustand";
import { request } from "@/services/api";
import type { Settings, UpdateSettingsRequest } from "@/types";

interface SettingsStore {
  isConfigured: boolean;
  settings: Settings | null;
  loading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateSettings: (data: UpdateSettingsRequest) => Promise<void>;
  verifySettings: () => Promise<boolean>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  isConfigured: false,
  settings: null,
  loading: false,
  error: null,

  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await request<Settings>("/settings");
      set({ settings, isConfigured: settings.is_configured, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "获取设置失败",
        loading: false,
      });
    }
  },

  updateSettings: async (data: UpdateSettingsRequest) => {
    set({ loading: true, error: null });
    try {
      const settings = await request<Settings>("/settings", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      set({ settings, isConfigured: settings.is_configured, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "更新设置失败",
        loading: false,
      });
      throw err;
    }
  },

  verifySettings: async () => {
    try {
      const result = await request<{ valid: boolean; message: string }>(
        "/settings/verify",
        { method: "POST" },
      );
      return result.valid;
    } catch {
      return false;
    }
  },
}));
