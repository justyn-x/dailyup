import { useSettingsStore } from "@/stores/settingsStore";
import type { Settings } from "@/types";

const mockSettings: Settings = {
  api_base_url: "https://api.openai.com/v1",
  api_key_masked: "sk-****abcd",
  model_name: "gpt-4o-mini",
  is_configured: true,
};

function mockFetchSuccess(data: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function mockFetchError(status: number, body: Record<string, unknown> = {}) {
  return vi.fn().mockResolvedValue({
    ok: false,
    json: () => Promise.resolve(body),
  });
}

describe("settingsStore", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      isConfigured: false,
      settings: null,
      loading: false,
      error: null,
    });
    vi.restoreAllMocks();
  });

  describe("fetchSettings", () => {
    it("fetches settings and updates state on success", async () => {
      vi.stubGlobal("fetch", mockFetchSuccess(mockSettings));

      await useSettingsStore.getState().fetchSettings();

      const state = useSettingsStore.getState();
      expect(state.settings).toEqual(mockSettings);
      expect(state.isConfigured).toBe(true);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("sets loading to true while fetching", async () => {
      let resolveFetch: (value: unknown) => void;
      const pendingFetch = new Promise((resolve) => {
        resolveFetch = resolve;
      });
      vi.stubGlobal(
        "fetch",
        vi.fn().mockReturnValue(pendingFetch),
      );

      const promise = useSettingsStore.getState().fetchSettings();
      expect(useSettingsStore.getState().loading).toBe(true);

      resolveFetch!({
        ok: true,
        json: () => Promise.resolve(mockSettings),
      });
      await promise;

      expect(useSettingsStore.getState().loading).toBe(false);
    });

    it("sets error on fetch failure", async () => {
      vi.stubGlobal("fetch", mockFetchError(500));

      await useSettingsStore.getState().fetchSettings();

      const state = useSettingsStore.getState();
      expect(state.error).toBeTruthy();
      expect(state.loading).toBe(false);
      expect(state.settings).toBeNull();
    });

    it("handles is_configured false", async () => {
      const unconfigured: Settings = {
        ...mockSettings,
        is_configured: false,
      };
      vi.stubGlobal("fetch", mockFetchSuccess(unconfigured));

      await useSettingsStore.getState().fetchSettings();

      expect(useSettingsStore.getState().isConfigured).toBe(false);
    });
  });

  describe("updateSettings", () => {
    it("updates settings and state on success", async () => {
      vi.stubGlobal("fetch", mockFetchSuccess(mockSettings));

      await useSettingsStore.getState().updateSettings({
        api_base_url: "https://api.openai.com/v1",
        api_key: "sk-newkey",
        model_name: "gpt-4o-mini",
      });

      const state = useSettingsStore.getState();
      expect(state.settings).toEqual(mockSettings);
      expect(state.isConfigured).toBe(true);
      expect(state.loading).toBe(false);
    });

    it("sets error and throws on failure", async () => {
      vi.stubGlobal("fetch", mockFetchError(400, { detail: "Invalid key" }));

      await expect(
        useSettingsStore.getState().updateSettings({
          api_base_url: "",
          api_key: "",
          model_name: "",
        }),
      ).rejects.toThrow();

      const state = useSettingsStore.getState();
      expect(state.error).toBeTruthy();
      expect(state.loading).toBe(false);
    });
  });

  describe("verifySettings", () => {
    it("returns true when verification succeeds", async () => {
      vi.stubGlobal(
        "fetch",
        mockFetchSuccess({ valid: true, message: "OK" }),
      );

      const result = await useSettingsStore.getState().verifySettings();
      expect(result).toBe(true);
    });

    it("returns false when verification fails", async () => {
      vi.stubGlobal(
        "fetch",
        mockFetchSuccess({ valid: false, message: "Invalid" }),
      );

      const result = await useSettingsStore.getState().verifySettings();
      expect(result).toBe(false);
    });

    it("returns false on network error", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("Network error")),
      );

      const result = await useSettingsStore.getState().verifySettings();
      expect(result).toBe(false);
    });
  });
});
