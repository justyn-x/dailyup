import { useProjectStore } from "@/stores/projectStore";
import type { Project } from "@/types";

const mockProject: Project = {
  id: 1,
  goal: "Learn TypeScript",
  background: "Some JS experience",
  skills: "JavaScript",
  progress: 0,
  created_at: "2025-01-01T00:00:00Z",
};

const mockProject2: Project = {
  id: 2,
  goal: "Learn Rust",
  background: "",
  skills: "",
  progress: 50,
  created_at: "2025-01-02T00:00:00Z",
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

describe("projectStore", () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [],
      currentProject: null,
      loading: false,
      error: null,
    });
    vi.restoreAllMocks();
  });

  describe("fetchProjects", () => {
    it("fetches projects and updates state", async () => {
      vi.stubGlobal("fetch", mockFetchSuccess([mockProject, mockProject2]));

      await useProjectStore.getState().fetchProjects();

      const state = useProjectStore.getState();
      expect(state.projects).toHaveLength(2);
      expect(state.projects[0].goal).toBe("Learn TypeScript");
      expect(state.projects[1].goal).toBe("Learn Rust");
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("sets error on failure", async () => {
      vi.stubGlobal("fetch", mockFetchError(500));

      await useProjectStore.getState().fetchProjects();

      const state = useProjectStore.getState();
      expect(state.error).toBeTruthy();
      expect(state.loading).toBe(false);
    });

    it("handles empty project list", async () => {
      vi.stubGlobal("fetch", mockFetchSuccess([]));

      await useProjectStore.getState().fetchProjects();

      expect(useProjectStore.getState().projects).toEqual([]);
    });
  });

  describe("createProject", () => {
    it("creates project and adds to list", async () => {
      vi.stubGlobal("fetch", mockFetchSuccess(mockProject));

      const result = await useProjectStore.getState().createProject({
        goal: "Learn TypeScript",
        background: "Some JS experience",
        skills: "JavaScript",
      });

      expect(result).toEqual(mockProject);
      const state = useProjectStore.getState();
      expect(state.projects).toHaveLength(1);
      expect(state.projects[0]).toEqual(mockProject);
      expect(state.loading).toBe(false);
    });

    it("preserves existing projects when creating new one", async () => {
      useProjectStore.setState({ projects: [mockProject] });
      vi.stubGlobal("fetch", mockFetchSuccess(mockProject2));

      await useProjectStore.getState().createProject({
        goal: "Learn Rust",
        background: "",
        skills: "",
      });

      expect(useProjectStore.getState().projects).toHaveLength(2);
    });

    it("sets error and throws on failure", async () => {
      vi.stubGlobal("fetch", mockFetchError(422, { detail: "Invalid" }));

      await expect(
        useProjectStore.getState().createProject({
          goal: "",
          background: "",
          skills: "",
        }),
      ).rejects.toThrow();

      expect(useProjectStore.getState().error).toBeTruthy();
      expect(useProjectStore.getState().loading).toBe(false);
    });
  });

  describe("deleteProject", () => {
    it("removes project from list", async () => {
      useProjectStore.setState({ projects: [mockProject, mockProject2] });
      vi.stubGlobal("fetch", mockFetchSuccess(undefined));

      await useProjectStore.getState().deleteProject(1);

      const state = useProjectStore.getState();
      expect(state.projects).toHaveLength(1);
      expect(state.projects[0].id).toBe(2);
      expect(state.loading).toBe(false);
    });

    it("clears currentProject if it matches deleted id", async () => {
      useProjectStore.setState({
        projects: [mockProject],
        currentProject: {
          ...mockProject,
          plan: null,
        },
      });
      vi.stubGlobal("fetch", mockFetchSuccess(undefined));

      await useProjectStore.getState().deleteProject(1);

      expect(useProjectStore.getState().currentProject).toBeNull();
    });

    it("keeps currentProject if it does not match deleted id", async () => {
      const currentDetail = { ...mockProject2, plan: null };
      useProjectStore.setState({
        projects: [mockProject, mockProject2],
        currentProject: currentDetail,
      });
      vi.stubGlobal("fetch", mockFetchSuccess(undefined));

      await useProjectStore.getState().deleteProject(1);

      expect(useProjectStore.getState().currentProject).toEqual(currentDetail);
    });

    it("sets error and throws on failure", async () => {
      useProjectStore.setState({ projects: [mockProject] });
      vi.stubGlobal("fetch", mockFetchError(404));

      await expect(
        useProjectStore.getState().deleteProject(999),
      ).rejects.toThrow();

      expect(useProjectStore.getState().error).toBeTruthy();
    });
  });
});
