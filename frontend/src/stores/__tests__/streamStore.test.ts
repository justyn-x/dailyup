import { useStreamStore } from "@/stores/streamStore";

describe("streamStore", () => {
  beforeEach(() => {
    useStreamStore.getState().reset();
  });

  describe("appendChunk", () => {
    it("accumulates content from multiple chunks", () => {
      const { appendChunk } = useStreamStore.getState();

      appendChunk("Hello ");
      appendChunk("World");
      appendChunk("!");

      expect(useStreamStore.getState().content).toBe("Hello World!");
    });

    it("starts with empty content", () => {
      expect(useStreamStore.getState().content).toBe("");
    });

    it("handles empty string chunks", () => {
      const { appendChunk } = useStreamStore.getState();

      appendChunk("");
      appendChunk("test");
      appendChunk("");

      expect(useStreamStore.getState().content).toBe("test");
    });
  });

  describe("reset", () => {
    it("clears all state back to initial values", () => {
      const store = useStreamStore.getState();
      store.appendChunk("some content");
      store.setStreaming(true);
      store.setError("some error");
      store.setProgressMessage("processing");

      store.reset();

      const state = useStreamStore.getState();
      expect(state.content).toBe("");
      expect(state.isStreaming).toBe(false);
      expect(state.error).toBeNull();
      expect(state.progressMessage).toBe("");
    });
  });

  describe("setError", () => {
    it("sets error message and stops streaming", () => {
      const store = useStreamStore.getState();
      store.setStreaming(true);

      store.setError("Something went wrong");

      const state = useStreamStore.getState();
      expect(state.error).toBe("Something went wrong");
      expect(state.isStreaming).toBe(false);
    });

    it("clears error when set to null", () => {
      const store = useStreamStore.getState();
      store.setError("error");
      store.setError(null);

      expect(useStreamStore.getState().error).toBeNull();
    });
  });

  describe("setStreaming", () => {
    it("updates isStreaming flag", () => {
      useStreamStore.getState().setStreaming(true);
      expect(useStreamStore.getState().isStreaming).toBe(true);

      useStreamStore.getState().setStreaming(false);
      expect(useStreamStore.getState().isStreaming).toBe(false);
    });
  });

  describe("setProgressMessage", () => {
    it("updates progress message", () => {
      useStreamStore.getState().setProgressMessage("Loading...");
      expect(useStreamStore.getState().progressMessage).toBe("Loading...");
    });
  });
});
